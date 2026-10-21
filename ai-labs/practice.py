"""Supplemental CPU practice: masked SFT, signal/state analysis, memory, local probe.

All fixtures are constructed. Only probe uses the already-installed loopback model.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import time
import urllib.request
import wave

import ai_lab as lab

DATA = Path(__file__).resolve().parent / "data"


def masked_objective(model, sequence):
    ids = model.encode(sequence)
    logits, _ = model.forward(ids[:-1])
    # ^a? is the request; a; is the assistant response and end marker.
    positions = [2, 3]
    return sum(-lab.vsoftmax(logits[i])[ids[i + 1]].log() for i in positions) / 2


def sft(seed, output):
    model = lab.TinyTransformer(seed)
    optimizer = lab.Adam(model.params, 0.02)
    sequences = ["^" + c + "?" + c + ";" for c in "abcd"]
    before = lab.digest(model.state())
    initial = lab.mean(masked_objective(model, s).data for s in sequences)
    history = [{"step": 0, "assistant_cross_entropy": initial}]
    for step in range(320):
        loss = masked_objective(model, sequences[step % 4])
        loss.backward()
        optimizer.step()
        if (step + 1) % 80 == 0:
            history.append({"step": step + 1, "assistant_cross_entropy":
                            lab.mean(masked_objective(model, s).data for s in sequences)})
    probes = []
    for c in "abcd":
        logits, _ = model.forward(model.encode("^" + c + "?"))
        probs = lab.softmax([v.data for v in logits[-1]])
        probes.append({"request": "^" + c + "?", "target": c,
                       "greedy": model.vocab[max(range(len(probs)), key=probs.__getitem__)],
                       "probabilities": dict(zip(model.vocab, probs))})
    return {"kind": "actual masked supervised training from random initialization, not pretrained-model SFT",
            "loss_mask": {"input": "^a?a", "targets": "a?a;", "included_target_positions": [2, 3],
                          "note": "request positions supply context but have no direct target loss"},
            "history": history, "probes": probes, "checkpoint": model.state(),
            "checks": [lab.check("parameters_updated", before != lab.digest(model.state()),
                                  {"before": before, "after": lab.digest(model.state())}),
                       lab.check("masked_loss_falls", history[-1]["assistant_cross_entropy"] < initial * 0.3,
                                 history),
                       lab.check("trained_copy_probes", all(p["greedy"] == p["target"] for p in probes),
                                 "training-pattern probes, not unseen language generalization")],
            "limits": ["The mask changes which targets are supervised, not causal visibility.",
                       "Shared embeddings can still receive gradients through request context.",
                       "This tiny alphabet task does not establish instruction-following in natural language."]}


def media(seed, output):
    audio = {}
    for name in ["audio-clean.wav", "audio-noisy.wav"]:
        path = DATA / name
        with wave.open(str(path), "rb") as sound:
            count, rate = sound.getnframes(), sound.getframerate()
            if sound.getnchannels() != 1 or sound.getsampwidth() != 2:
                raise ValueError("fixture must be mono int16 PCM")
            raw = sound.readframes(count)
        values = [v / 32767 for v in struct.unpack("<" + "h" * count, raw)]
        audio[name] = {"rate": rate, "frames": count, "seconds": count / rate,
                       "pcm_payload_bytes": len(raw), "rms": math.sqrt(lab.mean(v * v for v in values)),
                       "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "samples": values}
    clean, noisy = audio["audio-clean.wav"]["samples"], audio["audio-noisy.wav"]["samples"]
    signal_power = lab.mean(v * v for v in clean)
    noise_power = lab.mean((a - b) ** 2 for a, b in zip(clean, noisy))
    snr = 10 * math.log10(signal_power / noise_power)
    for row in audio.values():
        del row["samples"]

    # Same discrete position/velocity environment as lesson 24, fit delta-v = w*a.
    actions = [0.25, 0.5, 1.0]  # positive training actions only
    w, history = 0.0, []
    for step in range(121):
        loss = lab.mean(0.5 * (w * a - a) ** 2 for a in actions)
        if step % 30 == 0:
            history.append({"step": step, "w": w, "training_loss": loss})
        if step < 120:
            gradient = lab.mean((w * a - a) * a for a in actions)
            w -= 0.3 * gradient
    p, v, predicted_p, predicted_v = 0.0, 0.0, 0.0, 0.0
    trace = []
    for action in [-1.0, 0.4, -0.5, 0.0]:
        v += action
        p += v
        predicted_v += w * action
        predicted_p += predicted_v
        trace.append({"action": action, "truth": [p, v], "prediction": [predicted_p, predicted_v],
                      "position_error": predicted_p - p})
    return {"kind": "actual WAV measurements and trained scalar dynamics on constructed fixtures",
            "audio": audio, "snr_db_using_clean_reference": snr,
            "dynamics": {"rule": "v_next=v+a; p_next=p+v_next", "train_actions": actions,
                         "history": history, "rollout_on_untrained_actions": trace},
            "checks": [lab.check("pcm_payload", audio["audio-clean.wav"]["pcm_payload_bytes"] == 32000, audio),
                       lab.check("nonzero_noise", noise_power > 0 and math.isfinite(snr), {"noise_power": noise_power}),
                       lab.check("dynamics_learned", abs(w - 1) < 0.001, {"initial_w": 0, "trained_w": w}),
                       lab.check("heldout_action_rollout", max(abs(r["position_error"]) for r in trace) < 0.01, trace)],
            "limits": ["Audio is a synthetic tone; no ASR, speech synthesis or natural-language audio model ran.",
                       "SNR uses a known clean reference; arbitrary recordings do not supply this ground truth.",
                       "The dynamic coefficient is shared by design; this is not a trained video or robot model."]}


def merge_memory(path, expected_version, changes, source):
    current = json.loads(path.read_text(encoding="utf-8"))
    if current["version"] != expected_version:
        raise ValueError("stale memory version: reread and merge")
    updated = {"version": current["version"] + 1, "entries": dict(current["entries"])}
    for key, value in changes.items():
        previous = current["entries"].get(key)
        updated["entries"][key] = {"value": value, "source": source, "scope": "teaching-project-a",
                                    "status": "confirmed teaching notice", "supersedes": previous}
    temporary = path.with_suffix(".tmp")
    if temporary.exists() or temporary.is_symlink():
        raise ValueError("temporary memory file exists")
    temporary.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    return json.loads(path.read_text(encoding="utf-8"))


def memory(seed, output):
    path = output / "memory-store.json"
    if path.exists() or path.is_symlink():
        raise ValueError("memory-store already exists: choose a fresh --output directory")
    initial = {"version": 1, "entries": {
        "deadline": {"value": "2026-10-30", "source": "T1", "scope": "teaching-project-a"},
        "room": {"value": "A101", "source": "T1", "scope": "teaching-project-a"}}}
    path.write_text(json.dumps(initial, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    first = merge_memory(path, 1, {"room": "B202"}, "T2")
    rejected = False
    try:
        merge_memory(path, 1, {"deadline": "2026-11-02"}, "T3")
    except ValueError:
        rejected = True
    latest = json.loads(path.read_text(encoding="utf-8"))
    final = merge_memory(path, latest["version"], {"deadline": "2026-11-02"}, "T3")
    # A separate read is the next-task input; no value is taken from a model's weights.
    next_task = json.loads(path.read_text(encoding="utf-8"))
    record = next_task["entries"]["deadline"]
    question_result = {"question": "A项目何时截止", "answer": record["value"], "source": record["source"],
                       "retrieval": "exact-key read of persisted external JSON", "parameters_changed": False}
    return {"kind": "actual serialized single-writer external memory, not model training",
            "initial": initial, "after_room_change": first, "final_readback": final,
            "next_task": question_result, "stale_write_rejected": rejected,
            "checks": [lab.check("stale_write_rejected", rejected, "optimistic version check"),
                       lab.check("both_changes_retained", final["entries"]["room"]["value"] == "B202"
                                 and record["value"] == "2026-11-02", final),
                       lab.check("readback_version", next_task["version"] == 3, next_task["version"])],
            "limits": ["Version check and replace are not a multi-process transaction; use one writer.",
                       "Sources T1/T2/T3 are teaching notices, not real course deadlines.",
                       "The next answer is explicit key retrieval, not autonomous LLM memory selection."]}


def probe(seed, output, model):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def get(endpoint):
        with opener.open("http://127.0.0.1:11434/api/" + endpoint, timeout=10) as response:
            return json.loads(response.read(1024 * 1024))
    versions = get("version")
    tags = get("tags")
    installed = [r for r in tags.get("models", []) if r.get("name") == model]
    if not installed:
        raise ValueError("requested model is not already installed; no download is attempted")
    call = lab.call_local_model(model, '只输出JSON对象，不作解释：{"sum":19}')
    loaded = get("ps")
    active = [r for r in loaded.get("models", []) if r.get("name") == model or r.get("model") == model]
    return {"kind": "actual optional pretrained local-model probe", "runtime": versions,
            "installed_weight": installed[0], "model_call": call, "loaded_model_state": active,
            "checks": [lab.check("response_returned", bool(call["response"]["response"]),
                                  "Nonempty is not a correctness or JSON-format guarantee"),
                       lab.check("cpu_only_observed", bool(active) and all(r.get("size_vram") == 0 for r in active),
                                 active)],
            "limits": ["This is one installed machine, not a student hardware compatibility claim.",
                       "Only this quantized weight was run; no unquantized pretrained-model comparison.",
                       "Returned text and schema/task correctness must be inspected separately."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["sft", "media", "memory", "probe"])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model", default="deepseek-r1:7b")
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    target = output / (args.mode + ".json")
    if target.is_symlink():
        parser.error("refusing output symlink")
    started = time.perf_counter()
    try:
        if args.mode == "probe":
            result = probe(args.seed, output, args.model)
        else:
            result = {"sft": sft, "media": media, "memory": memory}[args.mode](args.seed, output)
        result["all_checks_passed"] = all(c["passed"] for c in result["checks"])
    except (ValueError, OSError) as exc:
        result = {"all_checks_passed": False, "error": str(exc), "fallback_used": False,
                  "failed_model_call": getattr(exc, "model_call", None)}
    result.update({"environment": lab.environment(), "mode": args.mode,
                   "configuration": {"seed": args.seed, "model": args.model if args.mode == "probe" else None},
                   "seconds": time.perf_counter() - started,
                   "source_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                     for p in [Path(__file__), Path(lab.__file__)]}})
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"mode": args.mode, "all_checks_passed": result["all_checks_passed"],
                      "output": str(target), "seconds": result["seconds"], "error": result.get("error")}, ensure_ascii=False))
    return 0 if result["all_checks_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

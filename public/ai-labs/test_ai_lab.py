"""Semantic checks for the standard-library course experiments; no network calls."""
import json
import math
from pathlib import Path
import random
import unittest
from unittest.mock import MagicMock, patch

import ai_lab as lab

DATA = Path(__file__).resolve().parent / "data"

class CoreSemantics(unittest.TestCase):
    def test_shared_parameter_chain_rule(self):
        x = lab.Value(0.3)
        output = (x * x + x).tanh()
        output.backward()
        expected = (1 - math.tanh(0.3 * 0.3 + 0.3) ** 2) * 1.6
        self.assertAlmostEqual(x.grad, expected, places=10)

    def test_causal_model_cannot_read_future(self):
        model = lab.TinyTransformer(9)
        left, attention = model.forward(model.encode("^a?a"))
        right, _ = model.forward(model.encode("^a?b"))
        for position in range(3):
            self.assertEqual([v.data for v in left[position]],
                             [v.data for v in right[position]])
        self.assertNotEqual([v.data for v in left[-1]], [v.data for v in right[-1]])
        self.assertTrue(all(abs(sum(row) - 1) < 1e-10 for row in attention))

    def test_transformer_trains_context_dependent_copy(self):
        result = lab.l2(42)
        self.assertLess(result["history"][-1]["cross_entropy"],
                        result["history"][0]["cross_entropy"] * 0.65)
        self.assertEqual({r["greedy_next"] for r in result["copy_probes"]}, set("abcd"))
        self.assertTrue(all(c["passed"] for c in result["checks"]))

    def test_flow_samples_follow_condition(self):
        model, before, history = lab.train_flow(42)
        left = lab.sample_flow(model, 71, -1, 64, count=32)
        right = lab.sample_flow(model, 71, 1, 64, count=32)
        self.assertLess(lab.mean(p[0] for p in left), -1.3)
        self.assertGreater(lab.mean(p[0] for p in right), 1.3)
        self.assertNotEqual(before, lab.digest(model.state()))
        self.assertLess(history[-1]["validation_mse"], history[0]["validation_mse"])

    def test_retrieval_query_strings_are_separate(self):
        training = {q for q, _target in lab.TRAIN_QUERIES}
        self.assertTrue(all(q not in training for q, _expected in lab.PROBE_QUERIES))
        model = lab.LearnedRetriever(42)
        before = lab.digest(model.embeddings)
        model.train(42)
        self.assertNotEqual(before, lab.digest(model.embeddings))
        self.assertEqual(model.rank("校园 网络 发生 故障 如何 联系")[0][0], 1)

    def test_missing_and_conflicting_evidence(self):
        absent = lab.answer_extractive("停车场 收费", lab.lexical_rank("停车场 收费"))
        self.assertEqual(absent["status"], "no_evidence")
        self.assertEqual(absent["citations"], [])
        conflict = lab.answer_extractive("图书馆 开放", lab.lexical_rank("图书馆 开放"))
        self.assertEqual(conflict["status"], "conflicting_evidence")
        self.assertEqual(set(conflict["citations"]),
                         {"teaching://campus/library-a", "teaching://campus/library-b"})

    def test_local_model_numeric_and_invented_sources_fail(self):
        valid = json.dumps({"status": "answered", "answer": "x", "sources": ["network"]})
        numeric = json.dumps({"status": "answered", "answer": "x", "sources": [1]})
        invented = json.dumps({"status": "answered", "answer": "x", "sources": ["made-up"]})
        self.assertTrue(lab.validate_local_answer(valid, {"network"})["passed"])
        self.assertFalse(lab.validate_local_answer(numeric, {"network"})["passed"])
        self.assertFalse(lab.validate_local_answer(invented, {"network"})["passed"])
        self.assertFalse(lab.validate_local_answer("not JSON", {"network"})["passed"])
        self.assertFalse(lab.validate_local_answer("null", {"network"})["passed"])
        self.assertFalse(lab.validate_local_answer('{"status":[],"answer":"x","sources":[]}', {"network"})["passed"])

    def test_answerer_cannot_restore_unretrieved_sources(self):
        network = next(i for i, d in enumerate(lab.DOCUMENTS) if d["id"] == "network")
        result = lab.answer_extractive("校园 网络 报修 电话", [])
        self.assertEqual(result["status"], "no_evidence")
        self.assertEqual(result["citations"], [])
        result = lab.answer_extractive("校园 网络 报修 电话", [(network, 1.0)])
        self.assertEqual(result["citations"], [lab.DOCUMENTS[network]["source"]])
        library = next(i for i, d in enumerate(lab.DOCUMENTS) if d["topic"] == "library")
        partial = lab.answer_extractive("图书馆 开放", [(library, 1.0)])
        self.assertEqual(partial["citations"], [lab.DOCUMENTS[library]["source"]])
        self.assertEqual(partial["status"], "answered")
        # Missing conflict evidence remains a retrieval failure, not a hidden fix.
        self.assertNotEqual(partial["status"], "conflicting_evidence")

    def test_failed_local_action_retains_raw_call(self):
        response = {"response": {"response": "not JSON"}, "request": {"prompt": "fixture"}}
        with patch.object(lab, "call_local_model", return_value=response):
            result = lab.l6(42, sandbox=DATA, local_model="test-model")
        self.assertFalse(result["local_policy"]["success"])
        entry = result["local_policy"]["trace"][0]
        self.assertEqual(entry["model_call"], response)
        self.assertIn("error", entry)

    def test_invalid_http_model_payload_is_logged(self):
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value.read.return_value = b"[]"
        with patch.object(lab.urllib.request, "build_opener", return_value=opener):
            result = lab.l5(42, local_model="test-model")
        failure = result["local_generation"]
        self.assertEqual(failure["failed_model_call"]["raw_response"], "[]")
        self.assertFalse(failure["validation"]["passed"])

    def test_real_read_calculate_finish_and_bounds(self):
        result = lab.l6(42, sandbox=DATA)
        self.assertEqual([r["action"]["tool"] for r in result["trace"]],
                         ["read", "calculate", "finish"])
        self.assertEqual(result["trace"][-1]["observation"]["answer"], 19)
        self.assertTrue(all(r["passed"] for r in result["checks"]))
        with self.assertRaises(ValueError):
            lab.ToolExecutor(DATA).execute({"tool": "read", "arguments": {"path": "../README.md"}})
        with self.assertRaises(ValueError):
            lab.ToolExecutor(DATA).execute({"tool": "calculate",
                "arguments": {"operation": "add", "left": True, "right": 2}})

    def test_int8_is_really_bytes_and_lora_changes_frozen_task(self):
        values = [-2.0, -0.1, 0.0, 0.7, 1.0]
        blob, scale = lab.quantize_int8(values)
        self.assertIsInstance(blob, bytes)
        self.assertEqual(len(blob), len(values))
        self.assertGreater(scale, 0)
        result = lab.l7(42)
        self.assertLess(result["lora"]["lora_heldout_mse"],
                        result["lora"]["frozen_baseline_mse"] * 0.01)
        self.assertTrue(all(r["passed"] for r in result["checks"]))

    def test_frozen_cases_and_ablation_expose_failure(self):
        result = lab.l8(42, benchmark_path=DATA / "frozen_cases.json")
        self.assertEqual(result["summary"]["learned_full"]["accuracy"], 1)
        self.assertLess(result["summary"]["no_conflict_check"]["accuracy"], 1)
        self.assertLess(result["summary"]["no_retrieval"]["accuracy"], 1)
        self.assertTrue(all(r["passed"] for r in result["checks"]))

if __name__ == "__main__":
    unittest.main()

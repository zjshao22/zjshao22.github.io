#!/usr/bin/env python3
"""Real UDP/TCP loopback socket observations, saved as reproducible evidence.

WHAT THIS IS
    A teaching probe that *observes the Python socket API* on 127.0.0.1. It
    runs real socket calls (bind/connect/accept/sendto/recvfrom/sendall/recv/
    shutdown) and records their real return values: endpoints, ports, byte
    lengths, receive-chunk lengths and wall-clock timestamps.

WHAT THIS IS NOT
    - It is NOT packet capture: no BPF, libpcap, raw sockets, .pcap files, or
      reading of real on-wire frames.
    - It is NOT a full TCP implementation: no congestion control, no
      retransmission, no window management, no checksum verification, and no
      kernel TCP-state introspection. The OS protocol stack does the real work.
    - It is NOT the network-lab discrete-event simulator (index.html), which
      opens no socket at all and is clearly labelled 模拟 / MODEL.
    - Localhost success is NOT evidence about public/campus networks: loss,
      delay, reordering or congestion on real paths are NOT tested here.

Only Python 3.9+ standard library is used. No third-party packages, no admin
rights, no external network. Every socket binds to 127.0.0.1 with an ephemeral
port (bind(("127.0.0.1", 0))); nothing is sent anywhere else.

Subcommands:
    python3 real-transport-lab.py udp   [--chunk N] [--output-dir DIR]
    python3 real-transport-lab.py tcp   [--chunk N] [--output-dir DIR]
    python3 real-transport-lab.py all   [--chunk N] --output-dir DIR

`udp`/`tcp` print ordered JSONL events to stdout. `all` runs BOTH modes in one
process and writes the canonical evidence files into --output-dir:
    environment.json, udp-real.jsonl, tcp-real.jsonl, real-transport.json
Any timeout, firewall block or failed assertion records an ERROR and exits
non-zero; a successful result is never fabricated.
"""

import argparse
import datetime
import json
import os
import platform
import socket
import struct
import sys
import time

SCRIPT_VERSION = "1.0.0"
HOST = "127.0.0.1"
FAMILY = "AF_INET"
TIMEOUT = 5.0
MAX_MESSAGE = 4096

# Constructed teaching payloads, not captures of real traffic.
UDP_MESSAGES = [b"abc", b"123456", b"", b"datagram"]
TCP_MESSAGES = ["第一份课件".encode("utf-8"), b"second-stream-message"]

SCOPE_NOTES = [
    "本程序观察的是 Python socket API 的返回值（getsockname / getpeername / "
    "sendto / recvfrom / sendall / recv / shutdown），不是抓包。",
    "没有使用 BPF、libpcap、raw socket、.pcap 或内核 TCP 状态查询；不读取链路上的真实分组。",
    "这不是完整的 TCP/UDP 实现：未实现拥塞控制、重传、窗口、校验和验证或内核内省，连接由操作系统协议栈完成。",
    "仅绑定并发送到 127.0.0.1 回环地址与系统分配的临时端口；不访问外网，不修改本机路由或防火墙。",
    "本机回环成功不能证明公网/校园网的丢包、延迟、乱序或拥塞行为，只说明本机协议栈对这组 API 调用的实际返回。",
    "mode=real 表示真实执行了 socket 调用；网络实验台的 18 个预设是离散事件模型（模拟），二者不是同一类证据。",
    "连接/接收块/EOF 的时间顺序是本机 socket API 的观察顺序，不是线上 SYN/SYN-ACK/ACK 报文的时序。",
]


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="microseconds")


def preview(data):
    return data.decode("utf-8", errors="replace")


def build_environment(cli):
    return {
        "record": "environment",
        "mode": "real",
        "host": HOST,
        "script": "real-transport-lab.py",
        "script_version": SCRIPT_VERSION,
        "python_version": platform.python_version(),
        "python_implementation": platform.python_implementation(),
        "platform": platform.platform(),
        "system": platform.system(),
        "machine": platform.machine(),
        "utc_started": utc_now(),
        "socket_family": FAMILY,
        "socket_types": ["SOCK_DGRAM", "SOCK_STREAM"],
        "timeout_seconds": TIMEOUT,
        "cli": cli,
        "cli_string": "python3 " + " ".join(cli),
        "stdlib_only": True,
        "third_party_dependencies": [],
        "network": "127.0.0.1 loopback only; no external network, no admin rights",
        "data": "Constructed educational payloads, not actual network captures of people or policies",
        "observation": "Observing the socket API, not sniffing packets; not a full TCP implementation",
    }


class Recorder:
    """Collect ordered, real-valued events for one transport mode."""

    def __init__(self, transport, cli):
        self.transport = transport
        self.cli = cli
        self.events = []
        self.start_mono = time.monotonic()
        self.start_utc = utc_now()
        self.seq = 0

    def record(self, event, **fields):
        self.seq += 1
        row = {
            "mode": "real",
            "host": HOST,
            "transport": self.transport,
            "seq": self.seq,
            "ts_utc": utc_now(),
            "t_rel_ms": round((time.monotonic() - self.start_mono) * 1000, 3),
            "event": event,
            **fields,
        }
        self.events.append(row)
        return row

    def intro(self, environment):
        self.record("environment", **{k: v for k, v in environment.items() if k != "record"})
        self.record("scope", notes=SCOPE_NOTES)
        self.record("run_start", utc_started=self.start_utc, timeout_seconds=TIMEOUT)


def emit_stdout(recorder, summary):
    for row in recorder.events:
        print(json.dumps(row, ensure_ascii=False, sort_keys=True))
    print(json.dumps({"event": "summary", "mode": "real", "transport": recorder.transport,
                      "result": "PASS", **summary}, ensure_ascii=False, sort_keys=True))


def check(recorder, name, condition, detail):
    ok = bool(condition)
    recorder.record("assertion", check=name, result="PASS" if ok else "FAIL", detail=detail)
    if not ok:
        raise AssertionError("self-check failed: %s (%s)" % (name, detail))


def run_udp(recorder, environment, messages):
    """Two real UDP sockets; record boundaries, endpoints, replies, zero-length."""
    recorder.intro(environment)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
        server.bind((HOST, 0))
        server.settimeout(TIMEOUT)
        server_addr = server.getsockname()
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
            client.bind((HOST, 0))
            client.settimeout(TIMEOUT)
            client_addr = client.getsockname()
            recorder.record("udp_bind", role="server", endpoint=list(server_addr),
                            note="AF_INET/SOCK_DGRAM bind 127.0.0.1:0，端口由系统分配")
            recorder.record("udp_bind", role="client", endpoint=list(client_addr),
                            note="AF_INET/SOCK_DGRAM bind 127.0.0.1:0，端口由系统分配")
            observed_lengths = []
            observed_sources = []
            replies = []
            reply_sources = []
            for index, message in enumerate(messages):
                sent = client.sendto(message, server_addr)
                recorder.record("udp_send", index=index, bytes=sent, length=len(message),
                                payload=preview(message), src=list(client_addr), dst=list(server_addr),
                                note="一次 sendto 对应一个 UDP 数据报；0 字节也是有效数据报" if not message else "")
                data, source = server.recvfrom(1024)
                recorder.record("udp_recv", index=index, length=len(data), payload=preview(data),
                                source=list(source), server=list(server_addr),
                                note="recvfrom 返回空负载仍是一次有效数据报，不是 TCP 的流结束" if not data else "")
                reply = str(len(data)).encode("ascii")
                server.sendto(reply, source)
                recorder.record("udp_reply", index=index, reply=reply.decode("ascii"),
                                length=len(reply), src=list(server_addr), dst=list(source))
                rdata, rsource = client.recvfrom(1024)
                recorder.record("udp_reply_recv", index=index, reply=rdata.decode("ascii"),
                                length=len(rdata), source=list(rsource))
                observed_lengths.append(len(data))
                observed_sources.append(list(source))
                replies.append(rdata.decode("ascii"))
                reply_sources.append(list(rsource))
    expected_lengths = [len(m) for m in messages]
    check(recorder, "datagram_boundaries_preserved", observed_lengths == expected_lengths,
          "sent=%r observed=%r（含 0 字节数据报）" % (expected_lengths, observed_lengths))
    check(recorder, "real_source_endpoints", all(s == list(client_addr) for s in observed_sources),
          "每个 recvfrom 来源均为真实客户端端点 %r" % (list(client_addr),))
    check(recorder, "real_replies", replies == [str(n) for n in expected_lengths],
          "replies=%r" % replies)
    check(recorder, "reply_from_listener", all(s == list(server_addr) for s in reply_sources),
          "回送来源均为真实监听端点 %r" % (list(server_addr),))
    recorder.record("observation",
                    statement="UDP 保留数据报边界：接收长度与发送长度逐一对应，0 字节数据报单独到达，未被合并。",
                    sent_lengths=expected_lengths, observed_lengths=observed_lengths)
    recorder.record("run_end", result="PASS")
    return {
        "server_endpoint": list(server_addr),
        "client_endpoint": list(client_addr),
        "sent_lengths": expected_lengths,
        "observed_lengths": observed_lengths,
        "observed_sources": observed_sources,
        "replies": replies,
    }


def frame(message):
    return struct.pack("!I", len(message)) + message


def decode_pending(pending):
    result = []
    while len(pending) >= 4:
        size = struct.unpack("!I", pending[:4])[0]
        if size > MAX_MESSAGE:
            raise ValueError("declared message length exceeds protocol limit")
        if len(pending) < 4 + size:
            break
        result.append(bytes(pending[4:4 + size]))
        del pending[:4 + size]
    return result


def run_tcp(recorder, environment, messages, chunk):
    """Real TCP listener/client; connect/accept, split sendall, real recv chunks, EOF."""
    recorder.intro(environment)
    wire = b"".join(frame(message) for message in messages)
    # Deliberate splits: the first cut passes through the 4-byte length header.
    cut1, cut2 = 3, 11
    splits = [wire[:cut1], wire[cut1:cut2], wire[cut2:]]
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind((HOST, 0))
        listener.listen(1)
        listener.settimeout(TIMEOUT)
        server_addr = listener.getsockname()
        recorder.record("tcp_state_transition", **{"from": "created", "to": "listening"},
                        endpoint=list(server_addr),
                        note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
            client.settimeout(TIMEOUT)
            recorder.record("tcp_state_transition", **{"from": "created", "to": "connecting"},
                            note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
            client.connect(server_addr)
            client_local = client.getsockname()
            client_peer = client.getpeername()
            recorder.record("tcp_connect", client_local=list(client_local), client_peer=list(client_peer),
                            ordering="connect() 返回（内核已在本机完成握手）；早于 accept() 调用")
            recorder.record("tcp_state_transition", **{"from": "connecting", "to": "connected"},
                            note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
            conn, accepted_addr = listener.accept()
            with conn:
                conn.settimeout(TIMEOUT)
                server_local = conn.getsockname()
                server_peer = conn.getpeername()
                recorder.record("tcp_accept", server_local=list(server_local),
                                client_peer=list(server_peer), accept_returned=list(accepted_addr),
                                ordering="accept() 在 connect() 返回后调用，立即返回排队中的连接")
                recorder.record("tcp_state_transition", **{"from": "listening", "to": "accepted"},
                                note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
                check(recorder, "connect_target_is_listener", list(client_peer) == list(server_addr),
                      "client peer=%r listener=%r" % (list(client_peer), list(server_addr)))
                check(recorder, "accept_peer_is_client", list(server_peer) == list(client_local),
                      "accept peer=%r client local=%r" % (list(server_peer), list(client_local)))
                check(recorder, "accepted_local_is_listener", list(server_local) == list(server_addr),
                      "accepted local=%r listener=%r" % (list(server_local), list(server_addr)))
                offset = 0
                split_lengths = []
                for index, part in enumerate(splits):
                    client.sendall(part)
                    split_lengths.append(len(part))
                    offset += len(part)
                    recorder.record("tcp_send", index=index, length=len(part), cumulative=offset,
                                    payload_hex=part[:16].hex(),
                                    note="sendall 调用边界是应用写入边界，不是 TCP 报文或消息边界")
                client.shutdown(socket.SHUT_WR)
                recorder.record("tcp_shutdown_wr", endpoint=list(client_local),
                                note="关闭本端写入方向；对端最终 recv() 返回空字节")
                recorder.record("tcp_state_transition", **{"from": "connected", "to": "write_shutdown"},
                                note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
                pending = bytearray()
                recv_chunks = []
                decoded = []
                while True:
                    data = conn.recv(chunk)
                    if not data:
                        recorder.record("tcp_eof",
                                        note="recv() 返回空字节，表示流结束（对端关闭写入方向）")
                        break
                    recv_chunks.append(len(data))
                    recorder.record("tcp_recv", length=len(data), cumulative=sum(recv_chunks),
                                    chunk_limit=chunk,
                                    note="recv() 实际返回的块长，由本机协议栈缓冲决定")
                    pending.extend(data)
                    for message in decode_pending(pending):
                        decoded.append(message)
                        recorder.record("tcp_decoded_message", length=len(message),
                                        payload=preview(message),
                                        note="按长度前缀从字节流重建，与 recv 块无关")
                recorder.record("tcp_state_transition", **{"from": "accepted", "to": "eof_closed"},
                                note="socket API 观察到的应用状态，非内核 TCP 状态机快照")
    check(recorder, "stream_bytes_complete", sum(recv_chunks) == len(wire),
          "recv total=%d wire=%d" % (sum(recv_chunks), len(wire)))
    check(recorder, "both_messages_reconstructed", decoded == messages,
          "decoded=%r" % [preview(m) for m in decoded])
    boundaries_differ = recv_chunks != split_lengths
    recorder.record("observation",
                    statement="TCP 是字节流：recv() 返回的块边界与 sendall 调用边界%s一致，"
                              "应用消息靠长度前缀与缓冲重建，而不是靠发送次数。" %
                              ("不" if boundaries_differ else "恰好"),
                    sendall_split_lengths=split_lengths,
                    actual_recv_chunk_lengths=recv_chunks,
                    recv_boundaries_differ_from_send_boundaries=boundaries_differ,
                    reconstructed_messages=[preview(m) for m in decoded])
    recorder.record("run_end", result="PASS")
    return {
        "listener_endpoint": list(server_addr),
        "client_endpoint": list(client_local),
        "accepted_server_endpoint": list(server_local),
        "accepted_client_endpoint": list(server_peer),
        "sendall_split_lengths": split_lengths,
        "actual_recv_chunk_lengths": recv_chunks,
        "recv_boundaries_differ_from_send_boundaries": boundaries_differ,
        "reconstructed_messages": [preview(m) for m in decoded],
        "expected_messages": [preview(m) for m in messages],
        "chunk_limit": chunk,
    }


def write_evidence(output_dir, result, environment):
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "environment.json"), "w", encoding="utf-8") as handle:
        json.dump(environment, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write("\n")
    for mode in ("udp", "tcp"):
        events = list(result.get(mode, {}).get("events", []))
        if result.get("result") == "FAIL":
            events.append({"event": "run_error", "mode": "real", "error": result.get("error")})
        with open(os.path.join(output_dir, "%s-real.jsonl" % mode), "w", encoding="utf-8") as handle:
            for row in events:
                handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    with open(os.path.join(output_dir, "real-transport.json"), "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, sort_keys=True, indent=2)
        handle.write("\n")


def run_all(args, cli):
    environment = build_environment(cli)
    rec_udp = Recorder("udp", cli)
    rec_tcp = Recorder("tcp", cli)
    result = {
        "schema": "real-transport-evidence/v1",
        "mode": "real",
        "host": HOST,
        "generated_utc": environment["utc_started"],
        "environment": environment,
        "scope": SCOPE_NOTES,
        "result": "PENDING",
    }
    failure = None
    udp_summary = None
    tcp_summary = None
    try:
        udp_summary = run_udp(rec_udp, environment, UDP_MESSAGES)
        tcp_summary = run_tcp(rec_tcp, environment, TCP_MESSAGES, args.chunk)
        result["result"] = "PASS"
    except (OSError, RuntimeError, AssertionError, ValueError) as exc:
        failure = "%s: %s" % (type(exc).__name__, exc)
        result["result"] = "FAIL"
        result["error"] = failure
    result["udp"] = {"events": rec_udp.events, "summary": udp_summary}
    result["tcp"] = {"events": rec_tcp.events, "summary": tcp_summary}
    result["utc_finished"] = utc_now()
    environment["utc_finished"] = result["utc_finished"]
    environment["result"] = result["result"]
    if args.output_dir:
        write_evidence(args.output_dir, result, environment)
        print("evidence written to %s (result=%s)" % (args.output_dir, result["result"]))
    else:
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    if failure:
        raise RuntimeError(failure)
    print("PASS: real UDP + TCP 127.0.0.1 loopback socket observations recorded; result=PASS")
    return 0


def positive_chunk(value):
    try:
        number = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("use an integer") from exc
    if not 1 <= number <= 65536:
        raise argparse.ArgumentTypeError("chunk must be in 1..65536")
    return number


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--chunk", type=positive_chunk, default=7,
                        help="max bytes per TCP recv() call (default 7)")
    modes = parser.add_subparsers(dest="mode", required=True)
    modes.add_parser("udp", parents=[common],
                     help="real UDP datagram boundaries incl. a zero-length datagram")
    modes.add_parser("tcp", parents=[common],
                     help="real TCP connect/accept, split sendall, real recv chunks, EOF")
    all_mode = modes.add_parser("all", parents=[common],
                               help="run both modes in one process and write canonical evidence files")
    all_mode.add_argument("--output-dir", default=None,
                          help="directory for environment.json, udp-real.jsonl, "
                               "tcp-real.jsonl, real-transport.json")
    args = parser.parse_args()
    cli = sys.argv[:]
    environment = build_environment(cli)
    try:
        if args.mode == "udp":
            recorder = Recorder("udp", cli)
            summary = run_udp(recorder, environment, UDP_MESSAGES)
            emit_stdout(recorder, summary)
        elif args.mode == "tcp":
            recorder = Recorder("tcp", cli)
            summary = run_tcp(recorder, environment, TCP_MESSAGES, args.chunk)
            emit_stdout(recorder, summary)
        elif args.mode == "all":
            run_all(args, cli)
    except (OSError, RuntimeError, AssertionError, ValueError) as exc:
        print(json.dumps({"event": "error", "mode": "real", "host": HOST,
                          "error": "%s: %s" % (type(exc).__name__, exc)},
                         ensure_ascii=False, sort_keys=True))
        parser.exit(1, "experiment failed: %s: %s\n" % (type(exc).__name__, exc))


if __name__ == "__main__":
    main()

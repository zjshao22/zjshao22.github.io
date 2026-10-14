#!/usr/bin/env python3
"""Local UDP boundaries and a deterministic stop-and-wait teaching model.

Only Python's standard library is used. The simulator never opens a socket;
the UDP experiment binds and sends only to 127.0.0.1 using ephemeral ports.
"""

import argparse
import heapq
import json
import socket
import threading


def indices(value):
    try:
        result = {int(part) for part in value.split(",") if part.strip()}
    except ValueError as exc:
        raise argparse.ArgumentTypeError("use comma-separated integers") from exc
    if any(number < 0 for number in result):
        raise argparse.ArgumentTypeError("message indices must be nonnegative")
    return result


def positive(value):
    try:
        number = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("use an integer") from exc
    if not 1 <= number <= 10000:
        raise argparse.ArgumentTypeError("use an integer from 1 to 10000")
    return number


def simulate(args):
    """Virtual milliseconds, unlimited sequence IDs, first-attempt drops.

    ACKs acknowledge a message ID, not a TCP byte offset. Timeouts are tagged
    by an attempt generation so obsolete timers cannot resend later messages.
    The receiver accepts only its expected sequence ID unless --naive is used.
    """
    if args.count > 50:
        raise ValueError("--count must be at most 50")
    if any(number >= args.count for number in args.drop_data | args.drop_ack):
        raise ValueError("drop indices must be smaller than --count")
    events = []
    order = 0
    now = 0
    current = 0
    generation = 0
    expected = 0
    attempts = {}
    ack_attempts = {}
    delivered = []
    transmissions = 0
    duplicate_arrivals = 0
    trace = []

    def log(event, **fields):
        row = {"t_ms": now, "event": event, **fields}
        trace.append(row)
        print(json.dumps(row, ensure_ascii=False, sort_keys=True))

    def schedule(after, kind, sequence, token=0):
        nonlocal order
        order += 1
        heapq.heappush(events, (now + after, order, kind, sequence, token))

    def send(sequence):
        nonlocal generation, transmissions
        generation += 1
        attempts[sequence] = attempts.get(sequence, 0) + 1
        transmissions += 1
        attempt = attempts[sequence]
        log("SEND_DATA", seq=sequence, attempt=attempt)
        if sequence in args.drop_data and attempt == 1:
            log("INJECT_DROP_DATA", seq=sequence)
        else:
            schedule(args.delay, "data", sequence)
        schedule(args.timeout, "timeout", sequence, generation)

    print(json.dumps({"model": "stop-and-wait", "clock": "virtual milliseconds",
                      "loss": "configured first-attempt application-model drops",
                      "receiver": "naive" if args.naive else "deduplicating"},
                     ensure_ascii=False, sort_keys=True))
    send(0)
    processed = 0
    while events and current < args.count:
        now, _, kind, sequence, token = heapq.heappop(events)
        processed += 1
        if processed > 100000:
            raise RuntimeError("event limit exceeded; choose a longer timeout")
        if kind == "data":
            if sequence == expected:
                expected += 1
                delivered.append(sequence)
                log("DELIVER", seq=sequence, next_expected=expected)
            elif sequence < expected:
                duplicate_arrivals += 1
                if args.naive:
                    delivered.append(sequence)
                    log("DELIVER_DUPLICATE", seq=sequence, next_expected=expected)
                else:
                    log("DISCARD_DUPLICATE", seq=sequence, next_expected=expected)
            else:
                raise RuntimeError("stop-and-wait model received a future sequence")
            ack_attempts[sequence] = ack_attempts.get(sequence, 0) + 1
            log("SEND_ACK", ack=sequence)
            if sequence in args.drop_ack and ack_attempts[sequence] == 1:
                log("INJECT_DROP_ACK", ack=sequence)
            else:
                schedule(args.ack_delay, "ack", sequence)
        elif kind == "ack":
            if sequence != current:
                log("IGNORE_OLD_ACK", ack=sequence, waiting_for=current)
                continue
            log("ACCEPT_ACK", ack=sequence)
            current += 1
            generation += 1
            if current < args.count:
                send(current)
        elif kind == "timeout" and sequence == current and token == generation:
            log("TIMEOUT", seq=sequence)
            send(sequence)

    success = current == args.count
    exactly_once = delivered == list(range(args.count))
    print(json.dumps({"summary": {"sender_complete": success,
                                   "application_deliveries": delivered,
                                   "exactly_once_in_this_run": exactly_once,
                                   "data_transmissions": transmissions,
                                   "duplicate_arrivals": duplicate_arrivals,
                                   "completion_ms": now}},
                     ensure_ascii=False, sort_keys=True))
    if not success or (not args.naive and not exactly_once):
        raise RuntimeError("model invariant failed")
    return trace, delivered


def udp_demo(_args):
    """Observe real localhost UDP sockets without externally routed traffic."""
    messages = [b"abc", b"123456", b""]
    observations = []
    errors = []
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as server:
        server.bind(("127.0.0.1", 0))
        server.settimeout(3)
        server_address = server.getsockname()

        def receive():
            try:
                for _ in messages:
                    data, source = server.recvfrom(1024)
                    observations.append({"source": source, "length": len(data),
                                         "payload": data.decode("ascii")})
                    server.sendto(str(len(data)).encode("ascii"), source)
            except (OSError, UnicodeError) as exc:
                errors.append(str(exc))

        worker = threading.Thread(target=receive, daemon=True)
        worker.start()
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
            client.bind(("127.0.0.1", 0))
            client.settimeout(3)
            client_address = client.getsockname()
            replies = []
            for message in messages:
                client.sendto(message, server_address)
                reply, source = client.recvfrom(1024)
                if source != server_address:
                    raise RuntimeError("unexpected UDP reply source")
                replies.append(reply.decode("ascii"))
        worker.join(timeout=4)
        if worker.is_alive() or errors:
            raise RuntimeError("local UDP receiver failed: " + "; ".join(errors))
    print(json.dumps({"experiment": "real localhost UDP",
                      "server": server_address, "client": client_address,
                      "sent_lengths": [len(message) for message in messages],
                      "received": observations, "replies": replies},
                     ensure_ascii=False, indent=2))
    if [row["length"] for row in observations] != [3, 6, 0]:
        raise RuntimeError("unexpected datagram boundary observation")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest="mode", required=True)
    model = modes.add_parser("simulate", help="deterministic virtual-time model")
    model.add_argument("--count", type=positive, default=4)
    model.add_argument("--delay", type=positive, default=20,
                       help="data one-way delay in virtual ms")
    model.add_argument("--ack-delay", type=positive, default=20,
                       help="ACK one-way delay in virtual ms")
    model.add_argument("--timeout", type=positive, default=100)
    model.add_argument("--drop-data", type=indices, default=set(),
                       help="drop first data attempt for these message IDs")
    model.add_argument("--drop-ack", type=indices, default=set(),
                       help="drop first ACK for these message IDs")
    model.add_argument("--naive", action="store_true",
                       help="also deliver duplicates to the application")
    model.set_defaults(run=simulate)
    local = modes.add_parser("udp", help="real UDP message boundaries on localhost")
    local.set_defaults(run=udp_demo)
    args = parser.parse_args()
    try:
        args.run(args)
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f"experiment failed: {exc}\n")


if __name__ == "__main__":
    main()

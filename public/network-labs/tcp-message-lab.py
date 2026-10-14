"""Observe TCP receive chunks and decode length-prefixed messages on localhost.

Run: python3 tcp-message-lab.py --chunk 1
No external network, packages, administrative privileges, or fixed port required.
"""

import argparse
import socket
import struct
import threading

MAX_MESSAGE = 4096
MESSAGES = ["第一份课件".encode("utf-8"), b"second message"]


def decode_pending(pending):
    result = []
    while len(pending) >= 4:
        size = struct.unpack("!I", pending[:4])[0]
        if size > MAX_MESSAGE:
            raise ValueError("message length exceeds protocol limit")
        if len(pending) < 4 + size:
            break
        result.append(bytes(pending[4:4 + size]))
        del pending[:4 + size]
    return result


def demo(chunk, truncate):
    wire = b"".join(struct.pack("!I", len(message)) + message for message in MESSAGES)
    if truncate:
        wire = wire[:-1]
    results = []
    received_chunks = []
    errors = []
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        listener.settimeout(5)

        def receive():
            try:
                with listener.accept()[0] as connection:
                    connection.settimeout(5)
                    pending = bytearray()
                    while True:
                        data = connection.recv(chunk)
                        if not data:
                            break
                        received_chunks.append(len(data))
                        pending.extend(data)
                        results.extend(decode_pending(pending))
                    if pending:
                        errors.append("EOF with an incomplete application message (%d buffered bytes)" % len(pending))
            except Exception as error:
                errors.append(str(error))

        worker = threading.Thread(target=receive)
        worker.start()
        with socket.create_connection(listener.getsockname(), timeout=5) as client:
            # Two sends deliberately cut through a header. TCP need not preserve them.
            client.sendall(wire[:3])
            client.sendall(wire[3:])
            client.shutdown(socket.SHUT_WR)
        worker.join(timeout=6)
        if worker.is_alive():
            raise RuntimeError("receiver did not finish")
    print("Actual TCP receive chunk lengths:", received_chunks)
    print("Decoded application messages:", [message.decode("utf-8") for message in results])
    for error in errors:
        print("Detected:", error)
    if truncate:
        if results != MESSAGES[:1] or not errors:
            raise AssertionError("truncated input was not detected correctly")
        print("Expected failure detected; a closed connection cannot repair an incomplete message.")
    else:
        if errors or results != MESSAGES:
            raise AssertionError("application decoding failed: %r" % errors)
        print("PASS: both messages reconstructed independently of receive chunk boundaries.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chunk", type=int, default=7)
    parser.add_argument("--truncate", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.chunk <= 65536:
        parser.error("chunk must be in 1..65536")
    demo(args.chunk, args.truncate)


if __name__ == "__main__":
    main()

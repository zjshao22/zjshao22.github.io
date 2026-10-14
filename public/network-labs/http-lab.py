"""Local HTTP observation lab. Python 3.8+, standard library only.

Run: python3 http-lab.py --port 8765 --revision 1
The service binds only to 127.0.0.1 and never serves arbitrary local files.
"""

import argparse
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


def handler_for(revision):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_HEAD(self):
            self.respond(head_only=True)

        def do_GET(self):
            self.respond(head_only=False)

        def respond(self, head_only):
            path = urlsplit(self.path).path
            etag = None
            cache = "no-store"
            status = 200
            if path == "/":
                body = (
                    '<!doctype html><meta charset="utf-8">'
                    '<link rel="stylesheet" href="/style.css">'
                    '<title>Network HTTP lab</title><h1>本机网络实验</h1>'
                    '<p><a href="/lesson.txt">课件</a> · '
                    '<a href="/missing.txt">不存在的资源</a> · '
                    '<a href="/slow">延迟响应</a></p>'
                )
                content_type = "text/html; charset=utf-8"
            elif path == "/style.css":
                body = "body{max-width:48rem;margin:3rem auto;font:18px/1.8 sans-serif;padding:1rem}"
                content_type = "text/css; charset=utf-8"
                cache = "max-age=60"
            elif path == "/lesson.txt":
                body = "计算机网络本机实验。revision=" + str(revision) + "\n"
                content_type = "text/plain; charset=utf-8"
                cache = "no-cache"
                etag = '"lesson-v' + str(revision) + '"'
                # This lab accepts exactly one strong ETag value, not a full parser.
                if self.headers.get("If-None-Match") == etag:
                    self.send_response(304)
                    self.send_header("ETag", etag)
                    self.send_header("Cache-Control", cache)
                    self.end_headers()
                    return
            elif path == "/slow":
                time.sleep(0.4)
                body = "服务处理故意等待约 0.4 秒；这不是链路丢包。\n"
                content_type = "text/plain; charset=utf-8"
            else:
                status = 404
                body = "该资源不存在。HTTP 服务仍在响应。\n"
                content_type = "text/plain; charset=utf-8"
            payload = body.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", cache)
            if etag:
                self.send_header("ETag", etag)
            self.end_headers()
            if not head_only:
                self.wfile.write(payload)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--revision", type=int, choices=(1, 2), default=1)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be in 1024..65535")
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(args.revision)) as server:
        print("Open http://127.0.0.1:%d/ (revision %d). Ctrl+C to stop." % (args.port, args.revision), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

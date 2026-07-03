#!/usr/bin/env python3
"""
Local dev server for mock WebApp testing.

Serves static frontend files AND proxies /api/* to uvicorn backend.
Same-origin /api avoids ad-blocker ERR_BLOCKED_BY_CLIENT on paths like /feed/, /tasks/.

Usage (two terminals):
  1) Backend:  cd devtest-backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  2) Frontend: cd devtest-frontend && python dev_server.py

Open: http://127.0.0.1:5500/
"""
from __future__ import annotations

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BACKEND_API_ROOT = os.getenv('DEV_BACKEND_API', 'http://127.0.0.1:8000/api').rstrip('/')
FRONTEND_PORT = int(os.getenv('DEV_FRONTEND_PORT', '5500'))


class DevProxyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write('[dev_server] %s - %s\n' % (self.address_string(), format % args))

    def do_OPTIONS(self) -> None:
        if self.path.startswith('/api'):
            self._send_proxy_response(204, b'', extra_headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            })
            return
        super().do_OPTIONS()

    def _proxy_api(self) -> None:
        target_url = BACKEND_API_ROOT + self.path[len('/api'):]
        if self.path == '/api' or self.path == '/api/':
            target_url = BACKEND_API_ROOT + '/'

        body = None
        if self.command in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            length = int(self.headers.get('Content-Length', '0') or 0)
            body = self.rfile.read(length) if length > 0 else None

        headers = {}
        for key in ('Content-Type', 'Accept', 'Authorization', 'ngrok-skip-browser-warning'):
            value = self.headers.get(key)
            if value:
                headers[key] = value

        request = Request(target_url, data=body, method=self.command, headers=headers)
        try:
            with urlopen(request, timeout=120) as response:
                payload = response.read()
                extra = {
                    'Access-Control-Allow-Origin': '*',
                }
                for hop_key in ('Content-Type',):
                    hop_val = response.headers.get(hop_key)
                    if hop_val:
                        extra[hop_key] = hop_val
                self._send_proxy_response(response.status, payload, extra_headers=extra)
        except HTTPError as exc:
            payload = exc.read()
            extra = {'Access-Control-Allow-Origin': '*'}
            content_type = exc.headers.get('Content-Type')
            if content_type:
                extra['Content-Type'] = content_type
            self._send_proxy_response(exc.code, payload, extra_headers=extra)
        except URLError as exc:
            message = ('Backend unreachable at %s — start uvicorn first (%s)'
                       % (BACKEND_API_ROOT, exc.reason))
            self._send_proxy_response(502, message.encode('utf-8'), extra_headers={
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            })

    def _send_proxy_response(self, status: int, body: bytes, extra_headers: dict | None = None) -> None:
        self.send_response(status)
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path.startswith('/api'):
            self._proxy_api()
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path.startswith('/api'):
            self._proxy_api()
            return
        super().do_POST()

    def do_PUT(self) -> None:
        if self.path.startswith('/api'):
            self._proxy_api()
            return
        self.send_error(405)

    def do_PATCH(self) -> None:
        if self.path.startswith('/api'):
            self._proxy_api()
            return
        self.send_error(405)

    def do_DELETE(self) -> None:
        if self.path.startswith('/api'):
            self._proxy_api()
            return
        self.send_error(405)


def main() -> None:
    server = ThreadingHTTPServer(('127.0.0.1', FRONTEND_PORT), DevProxyHandler)
    print('DevTest frontend: http://127.0.0.1:%s/' % FRONTEND_PORT)
    print('API proxy:        /api -> %s' % BACKEND_API_ROOT)
    print('Press Ctrl+C to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
        server.server_close()


if __name__ == '__main__':
    main()

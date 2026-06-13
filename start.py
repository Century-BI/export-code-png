#!/usr/bin/env python3
import http.server
import webbrowser
import os
import threading

PORT = 8787

os.chdir(os.path.dirname(os.path.abspath(__file__)))

handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(("", PORT), handler)

threading.Timer(0.5, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
print(f"Code Beauty running at http://localhost:{PORT}")
print("Press Ctrl+C to stop")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nStopped.")
    httpd.server_close()

#!/usr/bin/env python3
"""
Development server for YouTube captions API
Runs the Python API locally without Vercel
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
import os

# Add the build directory to Python path to import the API handler
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'build'))

class DevServerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)

        # Route to captions API
        if parsed_path.path == '/api/captions':
            try:
                # Import the handler from the built API
                from api.captions import get_youtube_captions

                # Parse query parameters
                query_params = parse_qs(parsed_path.query)
                video_id = query_params.get('video_id', [None])[0]
                language = query_params.get('lang', ['en'])[0]

                if not video_id:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b'{"error": "Missing video_id"}')
                    return

                # Get captions
                result = get_youtube_captions(video_id, language)

                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                import json
                response = {"captions": result}
                self.wfile.write(json.dumps(response).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                import json
                response = {"error": str(e)}
                self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Custom log format
        print(f"[API] {self.address_string()} - {format % args}")

def run_server(port=3001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DevServerHandler)
    print(f'🚀 YouTube Captions API running on http://localhost:{port}')
    print(f'📝 Endpoint: http://localhost:{port}/api/captions?video_id=VIDEO_ID&lang=en')
    print(f'Press Ctrl+C to stop\n')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n👋 Shutting down server...')
        httpd.shutdown()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    run_server(port)

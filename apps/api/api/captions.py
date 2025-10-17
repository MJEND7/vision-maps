from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from youtube_transcript_api import YouTubeTranscriptApi


def get_youtube_captions(video_id, language="en"):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id, languages=[language]
        )
        captions = " ".join([entry["text"] for entry in transcript])
        return captions
    except Exception as e:
        return f"Error: {e}"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query params
        query_params = parse_qs(urlparse(self.path).query)
        video_id = query_params.get("video_id", [None])[0]
        language = query_params.get("lang", ["en"])[0]

        if not video_id:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error": "Missing video_id"}')
            return

        result = get_youtube_captions(video_id, language)

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        response = {"captions": result}
        self.wfile.write(json.dumps(response).encode())

import re
from typing import List, Dict

from youtube_transcript_api import YouTubeTranscriptApi


class YouTubeService:

    def __init__(self):
        self.api = YouTubeTranscriptApi()

    def extract_video_id(self, url: str) -> str:
        """
        Extract YouTube video ID from common YouTube URL formats.
        """

        if not url:
            raise ValueError("YouTube URL cannot be empty.")

        patterns = [
            r"(?:youtube\.com/watch\?v=)([^&]+)",
            r"(?:youtu\.be/)([^?&]+)",
            r"(?:youtube\.com/embed/)([^?&]+)",
            r"(?:youtube\.com/shorts/)([^?&]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, url)

            if match:
                return match.group(1)

        raise ValueError(
            "Invalid YouTube URL. "
            "Please provide a valid YouTube video URL."
        )

    def get_transcript(
        self,
        youtube_url: str,
        language: str = "en"
    ) -> Dict:

        video_id = self.extract_video_id(
            youtube_url
        )

        try:

            transcript = self.api.fetch(
                video_id,
                languages=[language, "en"]
            )

        except Exception as e:

            raise RuntimeError(
                f"Could not fetch YouTube subtitles: {str(e)}"
            ) from e

        segments: List[Dict] = []

        for snippet in transcript:

            start = float(snippet.start)

            duration = float(snippet.duration)

            end = start + duration

            text = snippet.text.strip()

            if not text:
                continue

            segments.append({
                "start": start,
                "end": end,
                "duration": duration,
                "text": text
            })

        if not segments:

            raise RuntimeError(
                "No subtitles were found for this video."
            )

        return {
            "video_id": video_id,
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated,
            "segments": segments
        }


youtube_service = YouTubeService()
import os
import tempfile
from typing import Optional, Dict, Any

from app.services.whisper_service import transcribe_audio


class SpeechService:

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language: Optional[str] = None,
        prompt: Optional[str] = None,
        temperature: float = 0.0
    ) -> Dict[str, Any]:

        if not audio_bytes:
            raise ValueError("Audio data cannot be empty.")

        # Get the original file extension
        suffix = os.path.splitext(filename)[1] or ".wav"

        # Save uploaded audio temporarily
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        try:
            # Use LOCAL Whisper
            text = transcribe_audio(
                temp_path,
                language=language,
                prompt=prompt
            )

            return {
                "text": text,
                "language": language or "auto",
                "filename": filename,
                "is_mock": False,
                "message": "Transcribed using local Whisper model."
            }

        except Exception as e:
            raise RuntimeError(
                f"Whisper transcription failed: {e}"
            ) from e

        finally:
            # Always delete the temporary audio file
            if os.path.exists(temp_path):
                os.remove(temp_path)


speech_service = SpeechService()
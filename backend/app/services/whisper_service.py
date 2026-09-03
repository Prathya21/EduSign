from typing import Optional

import whisper


# Lazy-loaded Whisper model
_local_model = None


def get_local_whisper_model():
    """
    Load the local Whisper model only when it is first needed.
    The model is then kept in memory for future requests.
    """
    global _local_model

    if _local_model is None:
        print("Loading local Whisper model...")

        try:
            _local_model = whisper.load_model("base")
            print("Local Whisper model loaded successfully!")

        except Exception as e:
            print(f"Could not load local Whisper model: {e}")
            raise RuntimeError(
                f"Could not load local Whisper model: {e}"
            ) from e

    return _local_model


def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    prompt: Optional[str] = None
) -> str:
    """
    Transcribe an audio file using the locally installed Whisper model.
    """

    model = get_local_whisper_model()

    options = {}

    # Explicit language
    if language and language.lower() != "auto":
        options["language"] = language.lower()

    # Optional prompt
    if prompt:
        options["initial_prompt"] = prompt

    try:
        result = model.transcribe(
            audio_path,
            **options
        )

        return result.get("text", "").strip()

    except Exception as e:
        raise RuntimeError(
            f"Local Whisper transcription failed: {e}"
        ) from e
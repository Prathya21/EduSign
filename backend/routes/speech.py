import os
import tempfile

from fastapi import APIRouter, UploadFile, File, Form

from app.services.whisper_service import transcribe_audio


router = APIRouter()


@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("en")
):
    # Create temporary file
    suffix = os.path.splitext(file.filename)[1]

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    ) as temp_file:

        contents = await file.read()
        temp_file.write(contents)
        temp_path = temp_file.name

    try:
        # Send audio to Whisper
        text = transcribe_audio(
            temp_path,
            language
        )

        return {
            "success": True,
            "text": text
        }

    finally:
        # Delete temporary audio file
        if os.path.exists(temp_path):
            os.remove(temp_path)
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from pydantic import BaseModel
from app.services.speech_service import speech_service
from app.services.isl_translation import translation_service

router = APIRouter(prefix="/api/speech", tags=["speech"])


class ISLTranslationResult(BaseModel):
    original_text: str
    gloss_sequence: List[str]
    videos: List[Dict[str, Any]]


class SpeechTranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None
    filename: str
    is_mock: bool = False
    message: Optional[str] = None
    isl_translation: Optional[ISLTranslationResult] = None


@router.post("/transcribe", response_model=SpeechTranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe (e.g. .wav, .mp3, .webm, .m4a, .ogg)"),
    language: Optional[str] = Form(None, description="Optional ISO language code (e.g. 'en', 'hi', 'gu')"),
    auto_translate: Optional[bool] = Form(False, description="Whether to immediately translate transcribed text to ISL"),
    prompt: Optional[str] = Form(None, description="Optional prompt to guide Whisper model transcription"),
):
    # Validate file presence and filename
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file provided"
        )

    # Read audio bytes
    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read audio file: {str(e)}"
        )

    if not audio_bytes or len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded audio file is empty"
        )

    # Transcribe with Whisper
    try:
        result = speech_service.transcribe(
            audio_bytes=audio_bytes,
            filename=file.filename,
            language=language,
            prompt=prompt
        )
    except ValueError as e:
        # Configuration or validation issues (e.g., missing API key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except RuntimeError as e:
        # API execution or upstream Whisper errors
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during transcription: {str(e)}"
        )

    # Optional auto-translate to ISL
    isl_result = None
    if auto_translate and result.get("text"):
        isl_data = translation_service.translate(result["text"])
        isl_result = ISLTranslationResult(
            original_text=isl_data["original_text"],
            gloss_sequence=isl_data["gloss_sequence"],
            videos=isl_data["videos"]
        )

    return SpeechTranscriptionResponse(
        text=result.get("text", ""),
        language=result.get("language"),
        filename=result.get("filename", file.filename),
        is_mock=result.get("is_mock", False),
        message=result.get("message"),
        isl_translation=isl_result
    )

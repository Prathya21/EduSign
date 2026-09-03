from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.youtube_service import youtube_service


router = APIRouter(
    prefix="/api/youtube",
    tags=["YouTube"]
)


class YouTubeRequest(BaseModel):
    url: str
    language: str = "en"


class SubtitleSegment(BaseModel):
    start: float
    end: float
    duration: float
    text: str


class YouTubeTranscriptResponse(BaseModel):
    video_id: str
    language: str
    language_code: str
    is_generated: bool
    segments: List[SubtitleSegment]


@router.post(
    "/subtitles",
    response_model=YouTubeTranscriptResponse
)
async def get_youtube_subtitles(
    request: YouTubeRequest
):

    try:

        result = youtube_service.get_transcript(
            youtube_url=request.url,
            language=request.language
        )

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except RuntimeError as e:

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
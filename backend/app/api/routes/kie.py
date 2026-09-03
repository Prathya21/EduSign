from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.kie_service import kie_service


router = APIRouter(
    prefix="/api/kie",
    tags=["Kie.ai"]
)


class KieVideoRequest(BaseModel):
    text: str
    duration: int = 5
    resolution: str = "720p"
    ratio: str = "16:9"


class KieCreateResponse(BaseModel):
    task_id: str
    model: str
    prompt: str
    status: str


class KieStatusResponse(BaseModel):
    task_id: str
    state: Optional[str] = None
    progress: Optional[int] = None
    video_url: Optional[str] = None
    fail_code: Optional[str] = None
    fail_message: Optional[str] = None


@router.post(
    "/generate-isl",
    response_model=KieCreateResponse
)
async def generate_isl_video(request: KieVideoRequest):

    try:

        result = kie_service.create_isl_video(
            text=request.text,
            duration=request.duration,
            resolution=request.resolution,
            ratio=request.ratio,
        )

        return KieCreateResponse(
            task_id=result["task_id"],
            model=result["model"],
            prompt=result["prompt"],
            status=result["status"],
        )

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


@router.get(
    "/status/{task_id}",
    response_model=KieStatusResponse
)
async def get_kie_video_status(task_id: str):

    try:

        result = kie_service.get_task_status(
            task_id
        )

        return KieStatusResponse(
            task_id=result["task_id"],
            state=result["state"],
            progress=result["progress"],
            video_url=result["video_url"],
            fail_code=result["fail_code"],
            fail_message=result["fail_message"],
        )

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
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import videos, translation, speech

load_dotenv()

app = FastAPI(
    title="EduSign Backend",
    description="Indian Sign Language Translation API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(videos.router)
app.include_router(translation.router)
app.include_router(speech.router)

# Ensure data/videos directory exists and mount static files
root_dir = Path(__file__).resolve().parent.parent.parent
videos_dir = root_dir / "data" / "videos"
videos_dir.mkdir(parents=True, exist_ok=True)
app.mount("/data/videos", StaticFiles(directory=str(videos_dir)), name="videos")


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "service": "EduSign Backend",
        "version": "0.1.0"
    }


@app.get("/")
async def root():
    return {
        "message": "EduSign API",
        "version": "0.1.0",
        "docs": "/docs"
    }
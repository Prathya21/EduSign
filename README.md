# EduSign

AI-driven Indian Sign Language (ISL) multimodal translation dashboard with OpenAI Whisper Speech-to-Text for deaf and mute students in classrooms.

## Project Structure

```
signlingo/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── VoiceRecorder.jsx  # Whisper Speech-to-Text Audio Recorder
│   │   ├── services/
│   │   │   └── api.js             # API Client (Text & Audio)
│   │   ├── App.jsx                # Main Multimodal Dashboard
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── videos.py
│   │   │   │   ├── translation.py
│   │   │   │   ├── speech.py      # Whisper Speech Transcription Route
│   │   │   │   └── __init__.py
│   │   ├── services/
│   │   │   ├── video_lookup.py
│   │   │   ├── isl_translation.py
│   │   │   └── speech_service.py  # OpenAI Whisper Speech Service
│   │   ├── models/
│   │   └── data/
│   │       └── isl_dictionary.json
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
│
├── data/
│   └── videos/        # ISL video files (not in repo)
│
├── .gitignore
└── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure OPENAI_API_KEY for Whisper
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/videos/{word}` | Look up video for ISL gloss word |
| POST | `/api/translate/text-to-isl` | Convert text to ISL gloss + videos |
| POST | `/api/speech/transcribe` | Transcribe audio via OpenAI Whisper API (+ optional ISL auto-translate) |

## Example Usage

### Speech to Text & ISL Translation

```bash
curl -X POST http://localhost:8000/api/speech/transcribe \
  -F "file=@speech.wav" \
  -F "language=en" \
  -F "auto_translate=true"
```

## Current Features

- ✅ **FastAPI Backend** with CORS & route modularization
- ✅ **OpenAI Whisper Speech-to-Text** (`/api/speech/transcribe`)
- ✅ **Browser Voice Recording Studio** (`MediaRecorder` API with live timer & visualizer)
- ✅ **Audio File Upload** (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`)
- ✅ **Multi-Language Support** (English, Hindi, Gujarati, Marathi, Tamil, etc.)
- ✅ **ISL Dictionary & Video Lookup Service**
- ✅ **Rule-based Text-to-ISL Translation**
- ✅ **Direct Voice-to-ISL Pipeline** (Transcribe + Translate in one step)
- ✅ **Modern Responsive UI** with tab navigation, waveforms, and badges
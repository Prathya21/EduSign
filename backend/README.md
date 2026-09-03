# EduSign Backend

FastAPI backend for Indian Sign Language translation with OpenAI Whisper Speech-to-Text integration.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Add your OpenAI API key to enable Whisper API transcription:

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

*(Note: If `OPENAI_API_KEY` is not set, you can set `WHISPER_MOCK_FALLBACK=true` in `.env` for offline mock testing).*

## Run

```bash
cd backend
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/videos/{word}` - Look up video for ISL gloss word
- `POST /api/translate/text-to-isl` - Convert text to ISL gloss sequence with video paths
- `POST /api/speech/transcribe` - Transcribe audio files (.wav, .mp3, .webm, .m4a) to text using Whisper API, with optional `auto_translate=true` for direct ISL translation

### Example Speech Transcription Request

```bash
curl -X POST http://localhost:8000/api/speech/transcribe \
  -F "file=@sample_recording.webm" \
  -F "language=en" \
  -F "auto_translate=true"
```

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point with CORS & routes
│   ├── api/
│   │   ├── routes/
│   │   │   ├── videos.py       # Video lookup endpoints
│   │   │   ├── translation.py  # Translation endpoints
│   │   │   └── speech.py       # Whisper speech-to-text endpoints
│   │   └── __init__.py
│   ├── services/
│   │   ├── video_lookup.py     # Dictionary lookup service
│   │   ├── isl_translation.py  # Text to ISL translation service
│   │   └── speech_service.py   # OpenAI Whisper API transcription service
│   ├── models/
│   └── data/
│       └── isl_dictionary.json # ISL gloss to video mapping
├── .env.example
├── requirements.txt
└── README.md
```
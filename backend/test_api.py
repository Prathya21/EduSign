import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.isl_translation import translation_service
from app.services.video_lookup import video_lookup_service

client = TestClient(app)


def test_health_endpoints():
    """Verify /health and /api/health return 200 OK."""
    for endpoint in ["/health", "/api/health"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "EduSign Backend" in data["service"]


def test_root_endpoint():
    """Verify root endpoint returns API information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "EduSign API"
    assert "/docs" in data["docs"]


def test_video_lookup_existing():
    """Verify video lookup for words in dictionary."""
    response = client.get("/api/videos/hello")
    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "HELLO"
    assert data["found"] is True
    assert data["video_path"] == "/data/videos/hello.mp4"


def test_video_lookup_missing():
    """Verify video lookup for unknown words."""
    response = client.get("/api/videos/unknownwordxyz")
    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "UNKNOWNWORDXYZ"
    assert data["found"] is False
    assert data["video_path"] is None


def test_translation_single_words():
    """Verify text translation for individual words."""
    payload = {"text": "Hello teacher please learn"}
    response = client.post("/api/translate/text-to-isl", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["gloss_sequence"] == ["HELLO", "TEACHER", "PLEASE", "LEARN"]
    assert len(data["videos"]) == 4
    assert all(v["found"] is True for v in data["videos"])


def test_translation_multi_word_phrases():
    """Verify multi-word phrase matching like 'thank you' -> 'THANK_YOU'."""
    payload = {"text": "Thank you teacher, please help students!"}
    response = client.post("/api/translate/text-to-isl", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["gloss_sequence"] == ["THANK_YOU", "TEACHER", "PLEASE", "HELP", "STUDENT"]
    assert len(data["videos"]) == 5
    assert all(v["found"] is True for v in data["videos"])


def test_translation_inflections_and_synonyms():
    """Verify plurals and verb inflections map to root glosses."""
    payload = {"text": "Students learning with books and asking questions"}
    response = client.post("/api/translate/text-to-isl", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "STUDENT" in data["gloss_sequence"]
    assert "LEARN" in data["gloss_sequence"]
    assert "BOOK" in data["gloss_sequence"]
    assert "QUESTION" in data["gloss_sequence"]


def test_translation_empty_text():
    """Verify 400 error on empty text input."""
    response = client.post("/api/translate/text-to-isl", json={"text": "   "})
    assert response.status_code == 400


def test_speech_transcribe_demo_fallback():
    """Verify speech transcribe returns demo fallback when no API key is set."""
    fake_audio = b"RIFF....WAVEfmt ...."
    files = {"file": ("test_speech.wav", io.BytesIO(fake_audio), "audio/wav")}
    data = {"language": "en", "auto_translate": "true"}
    
    response = client.post("/api/speech/transcribe", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert "text" in res
    assert res["text"] != ""
    assert res["is_mock"] is True
    assert res["isl_translation"] is not None
    assert len(res["isl_translation"]["gloss_sequence"]) > 0


def test_speech_transcribe_empty_file():
    """Verify empty audio file upload is rejected with 400 Bad Request."""
    files = {"file": ("empty.wav", io.BytesIO(b""), "audio/wav")}
    response = client.post("/api/speech/transcribe", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

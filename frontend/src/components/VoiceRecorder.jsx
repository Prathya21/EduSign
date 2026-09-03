import React, { useState, useRef, useEffect } from 'react';
import { api, ApiError } from '../services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto-Detect Language' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'bn', label: 'Bengali' },
];

export function VoiceRecorder({ onTranscriptionComplete, onPopulateText, isCompact = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [autoTranslateToIsl, setAutoTranslateToIsl] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clean up timer and object URLs on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setUploadedFile(null);
    setTranscriptionResult(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording (MediaDevices API missing).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // 100ms timeslice for steady streaming
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect an audio input device.');
      } else {
        setError(err.message || 'Could not start audio recording.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsPaused(false);
    setRecordDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setUploadedFile(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset recorder states
    cancelRecording();
    setUploadedFile(file);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setError(null);
    setTranscriptionResult(null);
  };

  const [copied, setCopied] = useState(false);

  const handleTranscribe = async () => {
    const fileToSend = audioBlob || uploadedFile;
    if (!fileToSend) {
      setError('Please record audio or upload an audio file first.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      let ext = 'webm';
      if (uploadedFile && uploadedFile.name) {
        ext = uploadedFile.name.split('.').pop() || 'webm';
      } else if (audioBlob && audioBlob.type) {
        if (audioBlob.type.includes('mp4')) ext = 'mp4';
        else if (audioBlob.type.includes('ogg')) ext = 'ogg';
        else if (audioBlob.type.includes('wav')) ext = 'wav';
        else if (audioBlob.type.includes('webm')) ext = 'webm';
      }

      const filename = uploadedFile ? uploadedFile.name : `speech_recording_${Date.now()}.${ext}`;

      const data = await api.transcribeAudio(fileToSend, {
        language: selectedLanguage,
        autoTranslate: autoTranslateToIsl,
        filename,
      });

      setTranscriptionResult(data);

      if (onPopulateText && data.text) {
        onPopulateText(data.text);
      }

      if (onTranscriptionComplete) {
        onTranscriptionComplete(data);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to transcribe audio. Please check your network and backend configuration.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopyText = (text) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        setCopied(false);
      });
    }
  };

  return (
    <div className={`voice-recorder-card ${isCompact ? 'compact' : ''}`}>
      <div className="voice-header">
        <div className="voice-title-wrapper">
          <span className="mic-icon-badge">MIC</span>
          <div>
            <h3>Speech to Text (Whisper AI)</h3>
            <p className="voice-subtitle">Record speech or upload audio to transcribe and translate into ISL</p>
          </div>
        </div>

        <div className="voice-controls-config">
          <select
            id="whisper-language-select"
            className="select-input"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording || isTranscribing}
            aria-label="Select Whisper Audio Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message voice-error">
          <span>{error}</span>
          <button className="error-dismiss-btn" onClick={() => setError(null)} title="Dismiss">
            x
          </button>
        </div>
      )}

      {/* Recording Stage Visualizer */}
      {isRecording && (
        <div className="recording-active-panel">
          <div className="pulse-ring-container">
            <div className="pulse-ring pulse-1" />
            <div className="pulse-ring pulse-2" />
            <div className={`mic-active-badge ${isPaused ? 'paused' : 'live'}`}>
              {isPaused ? 'II' : 'REC'}
            </div>
          </div>

          <div className="recording-info">
            <div className="recording-status-tag">
              <span className={`status-dot ${isPaused ? 'paused' : 'live'}`} />
              {isPaused ? 'Recording Paused' : 'Listening & Recording Audio...'}
            </div>
            <div className="recording-timer">{formatTime(recordDuration)}</div>
          </div>

          <div className="audio-wave-bars">
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '30%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '70%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '100%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '60%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '90%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '40%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '80%' }} />
            <span className={`bar ${isPaused ? 'paused' : ''}`} style={{ height: '50%' }} />
          </div>

          <div className="record-actions-group">
            {isPaused ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={resumeRecording}>
                Resume
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={pauseRecording}>
                Pause
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={stopRecording}>
              Stop &amp; Save
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={cancelRecording}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ready / Playback Stage */}
      {!isRecording && audioUrl && (
        <div className="audio-preview-panel">
          <div className="audio-preview-header">
            <span className="audio-file-badge">
              {uploadedFile ? uploadedFile.name : `Recording (${formatTime(recordDuration || 0)})`}
            </span>
            <button
              type="button"
              className="btn btn-text btn-xs"
              onClick={cancelRecording}
              title="Discard and record again"
            >
              Discard / New
            </button>
          </div>

          <audio src={audioUrl} controls className="audio-player-element" />

          <div className="translate-options-row">
            <label className="checkbox-label" htmlFor="auto-translate-checkbox">
              <input
                id="auto-translate-checkbox"
                type="checkbox"
                checked={autoTranslateToIsl}
                onChange={(e) => setAutoTranslateToIsl(e.target.checked)}
              />
              <span>Auto-translate directly to Indian Sign Language</span>
            </label>
          </div>

          <div className="transcribe-actions-row">
            <button
              type="button"
              id="transcribe-audio-btn"
              className="btn btn-primary btn-glow"
              onClick={handleTranscribe}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <>
                  <span className="loading" />
                  Transcribing with Whisper AI...
                </>
              ) : (
                autoTranslateToIsl ? 'Transcribe & Translate to ISL' : 'Transcribe Speech to Text'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Idle Controls */}
      {!isRecording && !audioUrl && (
        <div className="recorder-idle-container">
          <div className="recorder-button-row">
            <button
              type="button"
              id="start-voice-record-btn"
              className="btn btn-record"
              onClick={startRecording}
            >
              Start Voice Dictation
            </button>

            <span className="divider-text">or</span>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Audio File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
          <p className="idle-hint">Supports live microphone speech or audio uploads (.mp3, .wav, .m4a, .webm)</p>
        </div>
      )}

      {/* Transcription Result Banner */}
      {transcriptionResult && (
        <div className="transcription-result-box">
          <div className="transcription-result-header">
            <div className="badge badge-success">Transcribed via Whisper API</div>
            {transcriptionResult.is_mock && (
              <span className="badge badge-warning" title={transcriptionResult.message}>
                Demo Mode
              </span>
            )}
          </div>
          <p className="transcribed-text">"{transcriptionResult.text}"</p>

          <div className="transcription-footer-actions">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => {
                if (onPopulateText) onPopulateText(transcriptionResult.text);
              }}
            >
              Use in Text Box
            </button>
            <button
              type="button"
              className={`btn btn-xs ${copied ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleCopyText(transcriptionResult.text)}
            >
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;

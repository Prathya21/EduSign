import { useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function SpeechInput({
  onTranscriptionComplete,
  onPopulateText,
}) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  // -----------------------------------
  // START RECORDING
  // -----------------------------------
  const startRecording = async () => {
    try {
      setError("");
      setTranscript("");

      // Ask browser for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      // Check which audio format the browser supports
      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const options = mimeType ? { mimeType } : {};

      const mediaRecorder = new MediaRecorder(
        stream,
        options
      );

      mediaRecorderRef.current = mediaRecorder;

      // Clear previous recording
      audioChunksRef.current = [];

      // Store audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops
      mediaRecorder.onstop = async () => {
        // Stop microphone tracks
        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => track.stop());

          streamRef.current = null;
        }

        // Create audio file from chunks
        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type:
              mediaRecorder.mimeType ||
              "audio/webm",
          }
        );

        // Make sure we actually recorded something
        if (audioBlob.size === 0) {
          setIsTranscribing(false);
          setError(
            "No audio was recorded. Please try again."
          );
          return;
        }

        // Send recording to FastAPI
        await sendAudioToBackend(audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error(
          "MediaRecorder error:",
          event.error
        );

        setIsRecording(false);
        setIsTranscribing(false);

        setError(
          "An error occurred while recording. Please try again."
        );

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => track.stop());

          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start();

      setIsRecording(true);

    } catch (err) {
      console.error(
        "Microphone access error:",
        err
      );

      setIsRecording(false);

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Microphone permission was denied. Please allow microphone access in your browser."
        );
      } else if (
        err.name === "NotFoundError"
      ) {
        setError(
          "No microphone was found on this device."
        );
      } else {
        setError(
          "Could not access your microphone. Please check your microphone settings."
        );
      }
    }
  };


  // -----------------------------------
  // STOP RECORDING
  // -----------------------------------
  const stopRecording = () => {
    const mediaRecorder =
      mediaRecorderRef.current;

    if (
      mediaRecorder &&
      mediaRecorder.state !== "inactive"
    ) {
      setIsRecording(false);
      setIsTranscribing(true);

      mediaRecorder.stop();
    }
  };


  // -----------------------------------
  // SEND AUDIO TO FASTAPI
  // -----------------------------------
  const sendAudioToBackend = async (
    audioBlob
  ) => {
    try {
      setError("");

      const formData = new FormData();

      // Audio file
      formData.append(
        "file",
        audioBlob,
        "recording.webm"
      );

      // Language
      // Currently using English.
      formData.append(
        "language",
        "en"
      );

      // We only want speech-to-text
      // at this stage.
      formData.append(
        "auto_translate",
        "false"
      );

      console.log(
        "Sending audio to Whisper backend..."
      );

      const response = await fetch(
        `${API_URL}/api/speech/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage =
          "Transcription failed.";

        try {
          const errorData =
            await response.json();

          if (errorData.detail) {
            errorMessage =
              errorData.detail;
          }
        } catch {
          // Ignore JSON parsing error
        }

        throw new Error(errorMessage);
      }

      // Get Whisper response
      const data =
        await response.json();

      console.log(
        "Whisper response:",
        data
      );

      const text =
        data.text?.trim() || "";

      if (!text) {
        setTranscript("");
        setError(
          "No speech was detected. Please speak clearly and try again."
        );
        return;
      }

      // Display transcription inside SpeechInput
      setTranscript(text);

      // Send complete response to App.jsx
      if (onTranscriptionComplete) {
        onTranscriptionComplete(data);
      }

      // Also send just the text to App.jsx
      if (onPopulateText) {
        onPopulateText(text);
      }

    } catch (err) {
      console.error(
        "Transcription error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while transcribing your speech."
      );

    } finally {
      setIsTranscribing(false);
    }
  };


  // -----------------------------------
  // RENDER
  // -----------------------------------
  return (
    <div className="speech-input">

      {/* Title */}
      <div className="speech-header">

        <h2>
          🎤 Speech to Text
        </h2>

        <p>
          Speak into your microphone and
          Whisper AI will convert your speech
          into text.
        </p>

      </div>


      {/* Microphone Button */}
      <div className="speech-controls">

        {!isRecording ? (

          <button
            type="button"
            onClick={startRecording}
            disabled={isTranscribing}
            className="mic-button"
          >

            {isTranscribing
              ? "⏳ Transcribing..."
              : "🎤 Start Speaking"}

          </button>

        ) : (

          <button
            type="button"
            onClick={stopRecording}
            className="recording-button"
          >
            ⏹ Stop Recording
          </button>

        )}

      </div>


      {/* Recording Status */}
      {isRecording && (

        <div className="recording-status">

          <span className="recording-dot">
            🔴
          </span>

          <span>
            Listening... Speak now
          </span>

        </div>

      )}


      {/* Transcribing Status */}
      {isTranscribing && (

        <div className="recording-status">

          <span>
            ⏳
          </span>

          <span>
            Converting your speech to text...
          </span>

        </div>

      )}


      {/* Error */}
      {error && (

        <div className="speech-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            className="speech-error-close"
          >
            ×
          </button>

        </div>

      )}


      {/* Transcription */}
      <div className="transcript-box">

        <h3>
          Transcribed Text
        </h3>

        <div className="transcript-content">

          {transcript ? (

            <p>
              {transcript}
            </p>

          ) : (

            <p className="transcript-placeholder">
              Your speech will appear here
              after you stop recording...
            </p>

          )}

        </div>

      </div>


      {/* Information */}
      <div className="speech-info">

        <span>🎙️</span>

        <p>
          Click <strong>Start Speaking</strong>,
          talk normally, then click{" "}
          <strong>Stop Recording</strong>.
        </p>

      </div>

    </div>
  );
}

export default SpeechInput;
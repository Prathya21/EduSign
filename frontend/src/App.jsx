import React, { useState } from 'react';
import { api, ApiError } from './services/api';
import SpeechInput from './components/SpeechInput';

function App() {
  const [activeTab, setActiveTab] = useState('text');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSource, setLastSource] = useState(null);

  const [selectedVideo, setSelectedVideo] = useState(null);

  // -----------------------------
  // TEXT → ISL
  // -----------------------------
  const handleTranslate = async (e) => {
    if (e) e.preventDefault();

    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setLastSource('text');

    try {
      const data = await api.translateTextToIsl(inputText);

      setResult(data);

      const firstFound = data.videos?.find(
        (v) => v.found && v.video_path
      );

      setSelectedVideo(firstFound || null);

    } catch (err) {

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          'An unexpected error occurred during translation'
        );
      }

      setResult(null);
      setSelectedVideo(null);

    } finally {
      setLoading(false);
    }
  };


  // -----------------------------
  // SPEECH TRANSCRIPTION
  // -----------------------------
  const handleSpeechTranscriptionComplete = (data) => {

    if (data.text) {
      setInputText(data.text);
    }

    if (data.isl_translation) {

      setResult(data.isl_translation);

      setLastSource('speech');

      setError(null);

      const firstFound =
        data.isl_translation.videos?.find(
          (v) => v.found && v.video_path
        );

      setSelectedVideo(firstFound || null);
    }
  };


  // -----------------------------
  // POPULATE TEXT
  // -----------------------------
  const handlePopulateText = (text) => {
    setInputText(text);
  };


  const samplePhrases = [
    'Hello teacher',
    'Please help student',
    'Good book learn',
    'Yes understand question'
  ];


  return (
    <div className="container">

      {/* =========================
          HEADER
      ========================== */}
      <header>

        <div className="header-badge">
          ISL Multimodal AI Translation Platform
        </div>

        <h1>EduSign</h1>

        <p>
          Breaking communication barriers through
          Indian Sign Language &amp; Whisper AI
        </p>


        {/* TAB NAVIGATION */}
        <div className="tab-navigation">

          <button
            type="button"
            id="tab-text"
            className={`tab-btn ${
              activeTab === 'text' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('text')}
          >
            Text to ISL
          </button>


          <button
            type="button"
            id="tab-speech"
            className={`tab-btn ${
              activeTab === 'speech' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('speech')}
          >
            Speech to Text (Whisper AI)
          </button>

        </div>

      </header>


      {/* =========================
          MAIN DASHBOARD
      ========================== */}
      <div className="dashboard">


        {/* =========================
            LEFT COLUMN
        ========================== */}
        <div className="input-column">


          {/* =========================
              TEXT → ISL
          ========================== */}
          {activeTab === 'text' && (

            <section className="card">

              <div className="card-header-with-action">

                <h2>Text to ISL</h2>

                <button
                  type="button"
                  className="quick-mic-link"
                  id="switch-to-voice-btn"
                  onClick={() => setActiveTab('speech')}
                  title="Switch to Voice Input"
                >
                  Use Voice Input
                </button>

              </div>


              <form onSubmit={handleTranslate}>

                <div className="form-group">

                  <label htmlFor="text-input">
                    Enter text to translate
                  </label>

                  <textarea
                    id="text-input"
                    value={inputText}
                    onChange={(e) =>
                      setInputText(e.target.value)
                    }
                    placeholder="e.g., Hello teacher, please learn"
                    rows={4}
                  />

                </div>


                <div className="form-actions">

                  <button
                    id="translate-btn"
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      loading || !inputText.trim()
                    }
                  >

                    {loading && (
                      <span className="loading" />
                    )}

                    {loading
                      ? 'Translating...'
                      : 'Translate to ISL'}

                  </button>


                  {inputText && (

                    <button
                      id="clear-text-btn"
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setInputText('')}
                    >
                      Clear
                    </button>

                  )}

                </div>

              </form>


              {/* ERROR */}
              {error && (

                <div className="error-message">

                  <span>{error}</span>

                  <button
                    type="button"
                    className="error-dismiss-btn"
                    onClick={() => setError(null)}
                  >
                    x
                  </button>

                </div>

              )}


              {/* QUICK PHRASES */}
              <div className="sample-prompts">

                <span className="sample-label">
                  Quick test phrases
                </span>

                <div className="sample-chips">

                  {samplePhrases.map(
                    (phrase, idx) => (

                      <button
                        key={idx}
                        id={`phrase-chip-${idx}`}
                        type="button"
                        className="chip-btn"
                        onClick={() =>
                          setInputText(phrase)
                        }
                      >
                        {phrase}
                      </button>

                    )
                  )}

                </div>

              </div>

            </section>

          )}


          {/* =========================
              SPEECH → TEXT
          ========================== */}
          {activeTab === 'speech' && (

            <section className="card speech-studio-card">

              <SpeechInput
              onTranscriptionComplete={handleSpeechTranscriptionComplete}
              onPopulateText={handlePopulateText}
              />

            </section>

          )}

        </div>


        {/* =========================
            RIGHT COLUMN
        ========================== */}
        <div className="output-column">

          <section className="card output-card">

            <div className="card-header-with-badge">

              <h2>ISL Translation</h2>

              {lastSource && (

                <span className="source-badge">

                  {lastSource === 'speech'
                    ? 'Via Whisper'
                    : 'From Text'}

                </span>

              )}

            </div>


            {/* =========================
                RESULT EXISTS
            ========================== */}
            {result ? (

              <>

                {/* ORIGINAL TEXT */}
                <div className="form-group">

                  <label>
                    Original Text
                  </label>

                  <div className="text-display-box">
                    "{result.original_text}"
                  </div>

                </div>


                {/* GLOSS SEQUENCE */}
                <div className="form-group">

                  <label>
                    Gloss Sequence
                  </label>

                  <div className="output-area gloss-area">

                    {result.gloss_sequence &&
                    result.gloss_sequence.length > 0 ? (

                      <div className="gloss-pills">

                        {result.gloss_sequence.map(
                          (gloss, idx) => (

                            <React.Fragment key={idx}>

                              <span className="gloss-pill">
                                {gloss}
                              </span>

                              {idx <
                                result.gloss_sequence.length -
                                  1 && (

                                <span className="gloss-arrow">
                                  →
                                </span>

                              )}

                            </React.Fragment>

                          )
                        )}

                      </div>

                    ) : (

                      'No gloss generated'

                    )}

                  </div>

                </div>


                {/* ACTIVE VIDEO */}
                {selectedVideo &&
                  selectedVideo.found &&
                  selectedVideo.video_path && (

                  <div className="form-group video-player-panel">

                    <label>
                      Sign Preview —{' '}
                      <strong>
                        {selectedVideo.word}
                      </strong>
                    </label>

                    <div className="video-player-wrapper">

                      <video
                        key={selectedVideo.video_path}
                        src={selectedVideo.video_path}
                        controls
                        autoPlay
                        className="active-isl-video"
                      >
                        Your browser does not support
                        the video tag.
                      </video>

                      <div className="video-player-meta">

                        <span className="video-player-badge">
                          Sign: {selectedVideo.word}
                        </span>

                        <span className="video-player-path">
                          {selectedVideo.video_path}
                        </span>

                      </div>

                    </div>

                  </div>

                )}


                {/* VIDEO LIST */}
                <div className="form-group">

                  <label>
                    Video Sequence (
                    {result.videos
                      ? result.videos.length
                      : 0}{' '}
                    signs)
                  </label>

                  <div className="video-list">

                    {result.videos &&
                    result.videos.length > 0 ? (

                      result.videos.map(
                        (video, index) => (

                          <div
                            key={index}
                            id={`video-item-${index}`}
                            className={`video-item ${
                              video.found
                                ? 'found'
                                : 'not-found'
                            } ${
                              selectedVideo?.word ===
                              video.word
                                ? 'selected'
                                : ''
                            } ${
                              video.found
                                ? 'clickable'
                                : ''
                            }`}
                            onClick={() => {

                              if (
                                video.found &&
                                video.video_path
                              ) {
                                setSelectedVideo(video);
                              }

                            }}
                          >

                            <div className="video-item-main">

                              <div className="video-word">

                                {video.found && (
                                  <span className="play-icon">
                                    ▶
                                  </span>
                                )}

                                {video.word}

                              </div>

                              <span
                                className={`video-status ${
                                  video.found
                                    ? 'found'
                                    : 'not-found'
                                }`}
                              >
                                {video.found
                                  ? 'Available'
                                  : 'Missing'}
                              </span>

                            </div>


                            {video.found &&
                              video.video_path && (

                              <div className="video-path">
                                {video.video_path}
                              </div>

                            )}

                          </div>

                        )
                      )

                    ) : (

                      <div className="output-area empty">
                        No videos generated for this phrase
                      </div>

                    )}

                  </div>

                </div>

              </>

            ) : (

              /* =========================
                 NO RESULT
              ========================== */
              <div className="output-area empty-placeholder">

                <div className="placeholder-icon">
                  [ ISL ]
                </div>

                <p>
                  Translate text or speak into the
                  microphone to see ISL gloss sequences
                  and video matches.
                </p>

              </div>

            )}

          </section>

        </div>

      </div>


      {/* =========================
          MODULES
      ========================== */}
      <section className="card modules-section">

        <h2>EduSign System Modules</h2>

        <div className="modules">


          <div
            className="module-card active"
            id="module-text"
            onClick={() => setActiveTab('text')}
          >

            <span className="module-icon-text">
              T
            </span>

            <h3>Text to ISL</h3>

            <p>
              Convert text to sign language
              gloss &amp; videos
            </p>

            <span className="module-badge active-badge">
              Active
            </span>

          </div>


          <div
            className="module-card active"
            id="module-speech"
            onClick={() => setActiveTab('speech')}
          >

            <span className="module-icon-text">
              S
            </span>

            <h3>Speech to Text</h3>

            <p>
              Voice dictation with OpenAI
              Whisper AI
            </p>

            <span className="module-badge active-badge">
              Active
            </span>

          </div>


          <div
            className="module-card"
            id="module-classroom"
          >

            <span className="module-icon-text">
              L
            </span>

            <h3>Live Classroom</h3>

            <p>
              Real-time lecture audio streaming
              &amp; translation
            </p>

            <span className="module-badge coming-badge">
              Phase 2
            </span>

          </div>


          <div
            className="module-card"
            id="module-gesture"
          >

            <span className="module-icon-text">
              G
            </span>

            <h3>Gesture to Text</h3>

            <p>
              Webcam-based sign language
              recognition
            </p>

            <span className="module-badge coming-badge">
              Phase 2
            </span>

          </div>


          <div
            className="module-card"
            id="module-aac"
          >

            <span className="module-icon-text">
              A
            </span>

            <h3>AAC Communication</h3>

            <p>
              Augmentative visual
              communication board
            </p>

            <span className="module-badge coming-badge">
              Phase 2
            </span>

          </div>


          <div
            className="module-card"
            id="module-youtube"
          >

            <span className="module-icon-text">
              Y
            </span>

            <h3>YouTube Learning</h3>

            <p>
              Educational video subtitle
              translation
            </p>

            <span className="module-badge coming-badge">
              Phase 3
            </span>

          </div>

        </div>

      </section>


    </div>
  );
}

export default App;
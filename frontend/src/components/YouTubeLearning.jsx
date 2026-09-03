import React, { useState } from 'react';
import { api, ApiError } from '../services/api';

function YouTubeLearning() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [segments, setSegments] = useState([]);
  const [videoId, setVideoId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [generatedVideos, setGeneratedVideos] = useState([]);

  const [error, setError] = useState(null);

  // =========================================================
  // EXTRACT YOUTUBE SUBTITLES
  // =========================================================

  const handleExtractSubtitles = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL.');
      return;
    }

    setLoading(true);
    setError(null);

    setSegments([]);
    setVideoId(null);
    setGeneratedVideos([]);

    try {
      const data = await api.getYouTubeSubtitles(
        youtubeUrl
      );

      console.log(
        'YouTube subtitle data:',
        data
      );

      setVideoId(data.video_id);

      setSegments(
        data.segments || []
      );

    } catch (err) {
      console.error(err);

      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          'Could not extract YouTube subtitles.'
        );
      }

    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // GENERATE ISL VIDEOS USING KIE.AI
  // =========================================================

  const handleGenerateISLVideos = async () => {

    if (!segments.length) {
      setError(
        'Please extract subtitles first.'
      );
      return;
    }

    setGenerating(true);
    setError(null);

    setGeneratedVideos([]);

    try {

      const videos = [];

      // Generate videos one subtitle at a time
      for (let i = 0; i < segments.length; i++) {

        const segment = segments[i];

        console.log(
          `Generating video ${i + 1}/${segments.length}`,
          segment.text
        );


        // ---------------------------------------------------
        // CREATE KIE TASK
        // ---------------------------------------------------

        const task =
          await api.generateISLVideo(
            segment.text
          );


        console.log(
          'Kie task:',
          task
        );


        const taskId =
          task.task_id;


        if (!taskId) {
          throw new Error(
            'Kie.ai did not return a task ID.'
          );
        }


        // ---------------------------------------------------
        // POLL KIE STATUS
        // ---------------------------------------------------

        let videoUrl = null;

        while (true) {

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                5000
              )
          );


          const status =
            await api.getISLVideoStatus(
              taskId
            );


          console.log(
            'Kie status:',
            status
          );


          if (
            status.state === 'success'
          ) {

            videoUrl =
              status.video_url;

            break;
          }


          if (
            status.state === 'fail'
          ) {

            throw new Error(
              status.fail_message ||
              `Kie.ai failed for subtitle: ${segment.text}`
            );
          }

        }


        // ---------------------------------------------------
        // SAVE RESULT
        // ---------------------------------------------------

        videos.push({
          start: segment.start,
          end: segment.end,
          text: segment.text,
          video_url: videoUrl
        });


        // Show completed video immediately
        setGeneratedVideos([
          ...videos
        ]);

      }

    } catch (err) {

      console.error(
        'Kie.ai generation error:',
        err
      );

      setError(
        err.message ||
        'Failed to generate ISL videos.'
      );

    } finally {

      setGenerating(false);

    }
  };


  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (seconds) => {

    const totalSeconds =
      Math.floor(seconds);

    const minutes =
      Math.floor(
        totalSeconds / 60
      );

    const remainingSeconds =
      totalSeconds % 60;

    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(remainingSeconds).padStart(2, '0')}`
    );
  };


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div className="youtube-learning">

      {/* =====================================================
          INPUT
          ===================================================== */}

      <div className="card">

        <h2>
          YouTube → ISL
        </h2>

        <p>
          Enter a YouTube educational video,
          extract its subtitles and generate
          an ISL video.
        </p>


        <div className="form-group">

          <label htmlFor="youtube-url">
            YouTube Video URL
          </label>


          <input
            id="youtube-url"
            type="text"
            value={youtubeUrl}
            onChange={(e) =>
              setYoutubeUrl(
                e.target.value
              )
            }
            placeholder="https://www.youtube.com/watch?v=..."
          />

        </div>


        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >

          <button
            type="button"
            className="btn btn-primary"
            onClick={
              handleExtractSubtitles
            }
            disabled={loading}
          >

            {loading
              ? 'Extracting...'
              : 'Extract Subtitles'}

          </button>


          {segments.length > 0 && (

            <button
              type="button"
              className="btn btn-primary"
              onClick={
                handleGenerateISLVideos
              }
              disabled={generating}
            >

              {generating
                ? 'Generating ISL Videos...'
                : '✨ Generate ISL Video'}

            </button>

          )}

        </div>


        {/* ERROR */}

        {error && (

          <div className="error-message">

            {error}

          </div>

        )}

      </div>


      {/* =====================================================
          YOUTUBE VIDEO
          ===================================================== */}

      {videoId && (

        <div className="card">

          <h2>
            Original Video
          </h2>


          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%',
              overflow: 'hidden',
              borderRadius: '12px'
            }}
          >

            <iframe
              src={
                `https://www.youtube.com/embed/${videoId}`
              }
              title="YouTube video"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
              allowFullScreen
            />

          </div>

        </div>

      )}


      {/* =====================================================
          SUBTITLES
          ===================================================== */}

      {segments.length > 0 && (

        <div className="card">

          <h2>
            Extracted Subtitles
          </h2>


          <div className="youtube-subtitles">

            {segments.map(
              (segment, index) => (

                <div
                  key={index}
                  className="subtitle-item"
                >

                  <span className="subtitle-time">
                    {formatTime(
                      segment.start
                    )}
                  </span>


                  <span className="subtitle-text">
                    {segment.text}
                  </span>

                </div>

              )
            )}

          </div>

        </div>

      )}


      {/* =====================================================
          GENERATED ISL VIDEOS
          ===================================================== */}

      {generatedVideos.length > 0 && (

        <div className="card">

          <h2>
            🤟 Generated ISL Videos
          </h2>


          <p>
            AI-generated sign language
            demonstrations for the subtitles.
          </p>


          <div className="generated-youtube-videos">

            {generatedVideos.map(
              (video, index) => (

                <div
                  key={index}
                  className="generated-youtube-item"
                >

                  <div className="generated-youtube-info">

                    <span className="subtitle-time">

                      {formatTime(
                        video.start
                      )}

                      {' → '}

                      {formatTime(
                        video.end
                      )}

                    </span>


                    <span className="subtitle-text">

                      {video.text}

                    </span>

                  </div>


                  {video.video_url && (

                    <video
                      className="generated-isl-video"
                      controls
                      playsInline
                      src={
                        video.video_url
                      }
                    >
                      Your browser does not support
                      video playback.
                    </video>

                  )}

                </div>

              )
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default YouTubeLearning;
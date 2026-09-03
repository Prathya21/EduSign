const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const headers = { ...options.headers };
  let body = options.body;

  // For FormData, let the browser set Content-Type
  // including the multipart boundary.
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const config = {
    ...options,
    headers,
    body,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({
        detail: 'Unknown error',
      }));

    throw new ApiError(
      error.detail ||
        `HTTP ${response.status}`,
      response.status
    );
  }

  return response.json();
}


export const api = {

  // =====================================================
  // HEALTH
  // =====================================================

  health: () =>
    request('/health'),


  // =====================================================
  // GET ISL VIDEO FOR A WORD
  // =====================================================

  getVideo: (word) =>
    request(
      `/videos/${encodeURIComponent(word)}`
    ),


  // =====================================================
  // TEXT → ISL
  // =====================================================

  translateTextToIsl: (text) =>
    request(
      '/translate/text-to-isl',
      {
        method: 'POST',
        body: {
          text,
        },
      }
    ),


  // =====================================================
  // SPEECH → TEXT
  // =====================================================

  transcribeAudio: (
    audioBlobOrFile,
    options = {}
  ) => {

    const formData =
      new FormData();

    const filename =
      options.filename ||
      audioBlobOrFile.name ||
      'recording.webm';

    formData.append(
      'file',
      audioBlobOrFile,
      filename
    );


    if (
      options.language &&
      options.language !== 'auto'
    ) {

      formData.append(
        'language',
        options.language
      );

    }


    if (
      options.autoTranslate !==
      undefined
    ) {

      formData.append(
        'auto_translate',
        options.autoTranslate
      );

    }


    if (options.prompt) {

      formData.append(
        'prompt',
        options.prompt
      );

    }


    return request(
      '/speech/transcribe',
      {
        method: 'POST',
        body: formData,
      }
    );

  },


  // =====================================================
  // YOUTUBE → SUBTITLES
  // =====================================================

  getYouTubeSubtitles: (
    url,
    language = 'en'
  ) =>
    request(
      '/youtube/subtitles',
      {
        method: 'POST',

        body: {
          url,
          language,
        },
      }
    ),


  // =====================================================
  // KIE.AI → GENERATE ISL VIDEO
  // =====================================================

  generateISLVideo: (text) =>
    request(
      '/kie/generate-isl',
      {
        method: 'POST',

        body: {
          text,
          duration: 5,
          resolution: '720p',
          ratio: '16:9',
        },
      }
    ),


  // =====================================================
  // KIE.AI → CHECK VIDEO STATUS
  // =====================================================

  getISLVideoStatus: (taskId) =>
    request(
      `/kie/status/${encodeURIComponent(
        taskId
      )}`
    ),

};


export { ApiError };
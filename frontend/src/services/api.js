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

  // For FormData, let the browser set the Content-Type header with the boundary
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
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export const api = {
  health: () => request('/health'),

  getVideo: (word) => request(`/videos/${encodeURIComponent(word)}`),

  translateTextToIsl: (text) => request('/translate/text-to-isl', {
    method: 'POST',
    body: { text },
  }),

  /**
   * Transcribe an audio Blob or File to text using Whisper API
   * @param {Blob|File} audioBlobOrFile
   * @param {Object} [options]
   * @param {string} [options.language] - Language code (e.g. 'en', 'hi', 'gu')
   * @param {boolean} [options.autoTranslate=false] - If true, translates directly to ISL gloss & videos
   * @param {string} [options.prompt] - Optional prompt for Whisper
   * @param {string} [options.filename] - Custom filename override
   */
  transcribeAudio: (audioBlobOrFile, options = {}) => {
    const formData = new FormData();
    const filename = options.filename || audioBlobOrFile.name || 'recording.webm';
    formData.append('file', audioBlobOrFile, filename);
    
    if (options.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    if (options.autoTranslate !== undefined) {
      formData.append('auto_translate', options.autoTranslate);
    }
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    return request('/speech/transcribe', {
      method: 'POST',
      body: formData,
    });
  },
};

export { ApiError };
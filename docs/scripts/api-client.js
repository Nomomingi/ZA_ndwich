(function () {
  function clean(base) {
    return String(base || '').replace(/\/+$/, '');
  }

  const fromConfig = window.ZANDWICH_CONFIG && window.ZANDWICH_CONFIG.apiBase;
  const explicit = fromConfig || window.__ZANDWICH_API_BASE__;
  const defaultBase = window.location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : '/api';

  const baseUrl = clean(explicit || defaultBase);

  const isGithubPages = /github\.io$/i.test(window.location.hostname || '');
  if (isGithubPages && !explicit) {
    console.warn(
      'ZAndwich API base is not explicitly configured. Set window.ZANDWICH_CONFIG.apiBase in scripts/site-config.js.'
    );
  }

  function endpoint(path) {
    return `${baseUrl}/${String(path || '').replace(/^\/+/, '')}`;
  }

  async function fetchJson(path) {
    const response = await fetch(endpoint(path));
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  async function requestJson(path, options = {}) {
    const customHeaders = options.headers || {};
    const requestOptions = { ...options };
    delete requestOptions.headers;

    const response = await fetch(endpoint(path), {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {}

    if (!response.ok) {
      const message = payload?.message || `API request failed: ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.httpStatus = response.status;
      throw error;
    }

    return payload;
  }

  window.ZAndwichApi = {
    baseUrl,
    endpoint,
    fetchJson,
    requestJson
  };
})();

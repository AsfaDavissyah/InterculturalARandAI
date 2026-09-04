import { getAuthSession } from './auth-session';

export class ApiError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson(firstArg, secondArg = {}) {
  let endpoint = '';
  let baseUrl = '';
  let method = 'GET';
  let body = null;
  let token = '';
  let signal;
  let fetchImpl = fetch;

  if (typeof firstArg === 'string') {
    endpoint = firstArg;
    baseUrl = secondArg.baseUrl !== undefined ? secondArg.baseUrl : (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000');
    method = secondArg.method || 'GET';
    body = secondArg.body !== undefined ? secondArg.body : null;
    token = secondArg.token !== undefined ? secondArg.token : (getAuthSession()?.token || '');
    signal = secondArg.signal;
    fetchImpl = secondArg.fetchImpl || fetch;
  } else if (firstArg && typeof firstArg === 'object') {
    endpoint = firstArg.endpoint || '';
    baseUrl = firstArg.baseUrl !== undefined ? firstArg.baseUrl : (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000');
    method = firstArg.method || 'GET';
    body = firstArg.body !== undefined ? firstArg.body : null;
    token = firstArg.token !== undefined ? firstArg.token : (getAuthSession()?.token || '');
    signal = firstArg.signal;
    fetchImpl = firstArg.fetchImpl || fetch;
  }

  const headers = { Accept: 'application/json' };
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    const fullUrl = `${String(baseUrl).replace(/\/+$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    response = await fetchImpl(fullUrl, {
      method,
      headers,
      signal,
      ...(body !== null ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi dan alamat API.', {
      cause: error,
    });
  }

  const contentType = response.headers?.get?.('content-type') || '';
  let data = null;

  try {
    data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch (error) {
    throw new ApiError('Server mengirim respons yang tidak dapat dibaca.', {
      status: response.status,
      cause: error,
    });
  }

  if (!response.ok) {
    let message =
      typeof data === 'object'
        ? data?.error || data?.message
        : data;
    if (typeof message === 'string' && /<(!doctype|html|head|body|pre)\b/i.test(message)) {
      message = response.status === 404
        ? 'API endpoint was not found. Restart the backend so it loads the latest dashboard routes.'
        : 'The server returned an invalid HTML response. Check the backend API process.';
    }
    throw new ApiError(message || `Server request failed (${response.status})`, {
      status: response.status,
    });
  }

  return data;
}

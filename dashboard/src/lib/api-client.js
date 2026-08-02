export class ApiError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson({
  baseUrl,
  endpoint,
  method = 'GET',
  body = null,
  token = '',
  signal,
  fetchImpl = fetch,
}) {
  const headers = { Accept: 'application/json' };
  if (body !== null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetchImpl(`${String(baseUrl).replace(/\/+$/, '')}${endpoint}`, {
      method,
      headers,
      signal,
      ...(body !== null ? { body: JSON.stringify(body) } : {}),
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
    const message = typeof data === 'object'
      ? data?.error || data?.message
      : data;
    throw new ApiError(message || `Server request failed (${response.status})`, {
      status: response.status,
    });
  }

  return data;
}

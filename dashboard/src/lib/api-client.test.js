import { describe, expect, it, vi } from 'vitest';
import { requestJson } from './api-client';

const jsonResponse = (data, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  headers: {
    get: () => 'application/json',
  },
  json: async () => data,
});

const textResponse = (data, { ok = false, status = 404 } = {}) => ({
  ok,
  status,
  headers: { get: () => 'text/html; charset=utf-8' },
  text: async () => data,
});

describe('requestJson', () => {
  it('sends JSON and the bearer token without duplicating URL slashes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ success: true }));

    const result = await requestJson({
      baseUrl: 'https://api.example.com/',
      endpoint: '/api/scenarios',
      method: 'POST',
      body: { title: 'Campus Practice' },
      token: 'secret-token',
      fetchImpl,
    });

    expect(result).toEqual({ success: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/scenarios',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ title: 'Campus Practice' }),
      }),
    );
  });

  it('uses the API error message returned by the backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Token sudah kedaluwarsa.' }, { ok: false, status: 403 }),
    );

    await expect(requestJson({
      baseUrl: 'https://api.example.com',
      endpoint: '/api/history',
      fetchImpl,
    })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Token sudah kedaluwarsa.',
      status: 403,
    });
  });

  it('returns a friendly error when the network is unavailable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(requestJson({
      baseUrl: 'https://api.example.com',
      endpoint: '/api/history',
      fetchImpl,
    })).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringContaining('Tidak dapat terhubung ke server'),
    });
  });

  it('does not expose a raw HTML Cannot GET page to the dashboard', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      textResponse('<!DOCTYPE html><html><body><pre>Cannot GET /api/dashboard/overview</pre></body></html>'),
    );
    await expect(requestJson({
      baseUrl: 'http://127.0.0.1:3000',
      endpoint: '/api/dashboard/overview',
      fetchImpl,
    })).rejects.toMatchObject({
      status: 404,
      message: expect.stringContaining('Restart the backend'),
    });
  });

  it('preserves request cancellation without converting it to a server error', async () => {
    const aborted = new DOMException('Aborted', 'AbortError');
    const fetchImpl = vi.fn().mockRejectedValue(aborted);

    await expect(requestJson({
      baseUrl: 'https://api.example.com',
      endpoint: '/api/history',
      fetchImpl,
    })).rejects.toBe(aborted);
  });
});

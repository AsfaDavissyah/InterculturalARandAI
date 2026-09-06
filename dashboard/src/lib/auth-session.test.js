import { describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from './auth-session';

describe('auth session', () => {
  it('keeps authentication across reloads in sessionStorage without using localStorage', () => {
    setAuthSession('jwt-value', {
      name: 'Research Admin',
      role: 'admin',
    });

    expect(getAuthSession()).toEqual({
      token: 'jwt-value',
      user: {
        name: 'Research Admin',
        role: 'admin',
      },
    });
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('engora_auth_session'))).toEqual({
      token: 'jwt-value',
      user: {
        name: 'Research Admin',
        role: 'admin',
      },
    });
  });

  it('clears the complete session on logout', () => {
    setAuthSession('jwt-value', { role: 'lecturer' });
    clearAuthSession();

    expect(getAuthSession()).toEqual({
      token: '',
      user: null,
    });
    expect(sessionStorage.getItem('engora_auth_session')).toBeNull();
  });

  it('restores authentication when the application module reloads', async () => {
    sessionStorage.setItem('engora_auth_session', JSON.stringify({
      token: 'persisted-jwt',
      user: {
        name: 'Research Admin',
        role: 'admin',
      },
    }));

    vi.resetModules();
    const reloadedSession = await import('./auth-session');

    expect(reloadedSession.getAuthSession()).toEqual({
      token: 'persisted-jwt',
      user: {
        name: 'Research Admin',
        role: 'admin',
      },
    });
  });
});

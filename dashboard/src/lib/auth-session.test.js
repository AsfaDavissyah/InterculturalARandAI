import { describe, expect, it } from 'vitest';
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from './auth-session';

describe('auth session', () => {
  it('keeps authentication in memory without writing JWT data to localStorage', () => {
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
  });

  it('clears the complete session on logout', () => {
    setAuthSession('jwt-value', { role: 'lecturer' });
    clearAuthSession();

    expect(getAuthSession()).toEqual({
      token: '',
      user: null,
    });
  });
});

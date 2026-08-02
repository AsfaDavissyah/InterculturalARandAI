import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { getAuthSession } from './lib/auth-session';

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

describe('dashboard login', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('shows backend login errors in the form and as a toast', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ error: 'Invalid email or password' }),
    }));
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in to Portal' }));

    expect(await screen.findByText('Invalid email or password')).toBeVisible();
    expect(toastError).toHaveBeenCalledWith('Invalid email or password');
  });

  it('keeps a successful login in memory without persisting the JWT', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (String(url).endsWith('/api/auth/login')) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: () => 'application/json',
          },
          json: async () => ({
            token: 'dashboard-jwt',
            user: {
              name: 'System Admin',
              role: 'admin',
            },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: async () => [],
      };
    }));
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Log in to Portal' }));

    expect(await screen.findByRole('heading', { name: 'Scenario Builder' })).toBeVisible();
    expect(getAuthSession().token).toBe('dashboard-jwt');
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
  });
});

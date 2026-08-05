import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearAuthSession, getAuthSession } from './lib/auth-session';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

const adminUser = {
  name: 'System Admin',
  role: 'admin',
};

const topicFixture = {
  _id: 'topic-db-id',
  topicId: 'academic-communication',
  title: 'Academic Communication',
  description: 'Academic speaking practice.',
  iconKey: 'school',
  displayOrder: 1,
  isActive: true,
  languageObjectives: ['Ask questions politely'],
  iccObjectives: ['Use formal address'],
};

const settingFixture = {
  _id: 'setting-db-id',
  settingId: 'ACADEMIC-LECTURER-OFFICE',
  topicId: 'academic-communication',
  title: "Lecturer's Office Consultation",
  location: "Lecturer's Office",
  briefing: 'Ask your lecturer for guidance.',
  stickerAssetKey: 'sticker_lecturer_office',
  studentRole: 'Student attending a consultation',
  aiCharacter: {
    display_name: 'Dr Emma Collins',
    role: 'Foreign lecturer',
    culture: 'United Kingdom',
    avatar_key: 'female_lecturer_v1',
  },
  taskInstruction: 'Explain the concern and ask politely.',
  conversationStages: ['greeting_and_introduction', 'polite_closing'],
  constraints: ['Stay in the office.'],
  rubric: { politeness: 5 },
  sessionRules: {
    minimumStudentResponses: 5,
    targetStudentResponsesMin: 6,
    targetStudentResponsesMax: 8,
    maximumStudentResponses: 10,
  },
  isActive: true,
  version: 1,
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function mockAdminApi(onRequest = () => {}) {
  return vi.fn().mockImplementation(async (url, options = {}) => {
    const path = new URL(String(url)).pathname;
    onRequest(path, options);
    if (path === '/api/auth/login') {
      return jsonResponse({ token: 'dashboard-jwt', user: adminUser });
    }
    if (path === '/api/admin/topics' && (!options.method || options.method === 'GET')) {
      return jsonResponse([topicFixture]);
    }
    if (path === '/api/admin/settings' && (!options.method || options.method === 'GET')) {
      return jsonResponse([settingFixture]);
    }
    if (path === '/api/admin/topics' && options.method === 'POST') {
      return jsonResponse(JSON.parse(options.body), 201);
    }
    return jsonResponse([]);
  });
}

describe('dashboard login', () => {
  beforeEach(() => {
    clearAuthSession();
    localStorage.clear();
    toastError.mockClear();
    toastSuccess.mockClear();
    vi.unstubAllGlobals();
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
            user: adminUser,
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

    expect(await screen.findByRole('heading', { name: 'Topics & Settings' })).toBeVisible();
    expect(getAuthSession().token).toBe('dashboard-jwt');
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('user_profile')).toBeNull();
  });

  it('creates a topic from the Topic Builder and shows success feedback', async () => {
    const requests = [];
    vi.stubGlobal('fetch', mockAdminApi((path, options) => requests.push({ path, options })));
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Log in to Portal' }));
    await screen.findByRole('heading', { name: 'Topics & Settings' });

    await user.click(screen.getByRole('button', { name: 'New Topic' }));
    await user.type(screen.getByLabelText('Topic ID (lowercase)'), 'travel-communication');
    await user.type(screen.getByLabelText('Title'), 'Travel Communication');
    await user.type(screen.getByLabelText('Description'), 'Practice communication while travelling.');
    await user.type(screen.getByLabelText('Language Objectives (one per line)'), 'Ask for directions');
    await user.type(screen.getByLabelText('ICC Objectives (one per line)'), 'Respect local customs');
    await user.click(screen.getByRole('button', { name: 'Save Topic' }));

    expect(toastSuccess).toHaveBeenCalledWith('New topic created successfully.');
    const createRequest = requests.find((item) => item.path === '/api/admin/topics' && item.options.method === 'POST');
    expect(createRequest).toBeTruthy();
    expect(JSON.parse(createRequest.options.body)).toMatchObject({
      topicId: 'travel-communication',
      title: 'Travel Communication',
      languageObjectives: ['Ask for directions'],
      iccObjectives: ['Respect local customs'],
    });
  });

  it('shows complete setting detail and prevents an invalid response range', async () => {
    vi.stubGlobal('fetch', mockAdminApi());
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Log in to Portal' }));
    await screen.findByRole('heading', { name: 'Topics & Settings' });

    await user.click(await screen.findByRole('button', { name: `View ${settingFixture.title}` }));
    expect(screen.getByRole('heading', { name: settingFixture.title })).toBeVisible();
    expect(screen.getByText('sticker_lecturer_office')).toBeVisible();
    expect(screen.getByText('greeting_and_introduction')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'New Setting' }));
    await user.type(screen.getByLabelText('Setting ID (UPPERCASE)'), 'SOCIAL-TEST-SETTING');
    await user.type(screen.getByLabelText('Title'), 'Test Setting');
    await user.type(screen.getByLabelText('Location'), 'Test Location');
    await user.type(screen.getByLabelText('Student Role'), 'Student customer');
    await user.type(screen.getByLabelText('AI Display Name'), 'Alex Morgan');
    await user.type(screen.getByLabelText('AI Role'), 'Service staff member');
    await user.clear(screen.getByLabelText('Minimum responses'));
    await user.type(screen.getByLabelText('Minimum responses'), '9');
    await user.click(screen.getByRole('button', { name: 'Save Setting' }));

    expect(toastError).toHaveBeenCalledWith('Invalid response count range (Minimum <= Target Min <= Target Max <= Maximum).');
  });
});

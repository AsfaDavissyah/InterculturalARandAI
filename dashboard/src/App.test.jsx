import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearAuthSession } from './lib/auth-session';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
    info: vi.fn(),
  },
  Toaster: () => null,
}));

const adminUser = {
  id: 'admin_1',
  name: 'System Admin',
  email: 'admin@icc.com',
  role: 'admin',
};

const lecturerUser = {
  id: 'lecturer_1',
  name: 'Dr. Jane Smith',
  email: 'lecturer@icc.com',
  role: 'lecturer',
  lecturerCode: 'DR-JANE-01',
};

const categoryFixture = {
  category_id: 'academic-communication',
  name: 'Academic Communication',
  description: 'Academic speaking practice.',
  icon_key: 'school',
  published_scenario_count: 5,
  status: 'active',
  display_order: 0,
};

const scenarioFixture = {
  scenario_id: 'SCN-ACADEMIC-001',
  title: "Lecturer's Office Consultation",
  briefing: 'Ask your lecturer for guidance on research methodology.',
  placements: ['guided_topics', 'scenario_library'],
  category_ids: ['academic-communication'],
  status: 'published',
  student_role: 'Student attending a consultation',
  ai_partner: {
    profile_id: 'emma-lecturer',
    display_name: 'Dr Emma Collins',
    role: 'Foreign lecturer',
    culture: 'United Kingdom',
    avatar_key: 'female_lecturer_v1',
    voice_profile: 'female',
  },
  student_task: 'Explain your concern clearly and ask questions politely.',
  practice_location: "Lecturer's Office",
  level: 'B1',
  owner: { type: 'admin', display_name: 'System Admin' },
  version: 1,
  updated_at: new Date().toISOString(),
};

const overviewFixture = {
  role: 'admin',
  summary: {
    published_scenarios: 16,
    drafts_awaiting_review: 2,
    active_categories: 3,
    active_lecturers: 4,
    registered_students: 25,
    completed_practices: 120,
  },
  drafts_awaiting_review: [],
  recent_sessions: [],
  recent_lecturers: [],
};

const lecturerOverviewFixture = {
  role: 'lecturer',
  summary: {
    connected_students: 15,
    practices_this_week: 8,
    average_cohort_score: '4.2',
    own_draft_scenarios: 1,
  },
  recent_sessions: [],
  students_needing_attention: [],
  own_drafts: [],
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function mockApi(role = 'admin') {
  return vi.fn().mockImplementation(async (url, _options = {}) => {
    const parsedUrl = new URL(String(url));
    const path = parsedUrl.pathname;

    if (path === '/api/auth/login') {
      const user = role === 'admin' ? adminUser : lecturerUser;
      return jsonResponse({ token: 'dashboard-jwt', user });
    }

    if (path === '/api/dashboard/overview') {
      return jsonResponse(role === 'admin' ? overviewFixture : lecturerOverviewFixture);
    }

    if (path === '/api/dashboard/categories') {
      return jsonResponse([categoryFixture]);
    }

    if (path === '/api/dashboard/scenarios') {
      return jsonResponse({
        items: [scenarioFixture],
        page: 1,
        page_size: 10,
        total_items: 1,
        total_pages: 1,
      });
    }

    if (path === `/api/dashboard/scenarios/${scenarioFixture.scenario_id}`) {
      return jsonResponse(scenarioFixture);
    }

    if (path === '/api/dashboard/lecturers') {
      return jsonResponse([
        {
          id: 'lec_1',
          name: 'Dr. Jane Smith',
          email: 'lecturer@icc.com',
          lecturer_code: 'DR-JANE-01',
          connected_students_count: 15,
          status: 'active',
        },
      ]);
    }

    if (path === '/api/dashboard/students') {
      return jsonResponse([
        {
          id: 'st_1',
          name: 'Budi Santoso',
          email: 'budi@icc.com',
          student_id: 'NIM-101',
          practice_count: 6,
          completed_count: 5,
          average_score: 4.2,
          last_practice: new Date().toISOString(),
        },
      ]);
    }

    if (path === '/api/dashboard/practice-results') {
      return jsonResponse({
        items: [
          {
            session_id: 'sess_1',
            student: { display_name: 'Budi Santoso', student_id: 'NIM-101' },
            scenario: { title: "Lecturer's Office Consultation" },
            category_id: 'academic-communication',
            duration_seconds: 240,
            total_student_responses: 6,
            overall_score: 4.5,
            status: 'completed',
            completed_at: new Date().toISOString(),
          },
        ],
        page: 1,
        page_size: 15,
        total_items: 1,
        total_pages: 1,
      });
    }

    if (path === '/api/dashboard/system-settings') {
      return jsonResponse({
        approved_ai_partners: [scenarioFixture.ai_partner],
        default_session_rules: { target_duration_minutes: 5, minimum_student_responses: 5 },
        default_criteria: [{ criterion: 'grammar', weight: 5 }],
        feature_flags: { modules: false, qr: false },
      });
    }

    if (path === '/api/dashboard/profile') {
      return jsonResponse(role === 'admin' ? adminUser : lecturerUser);
    }

    return jsonResponse({});
  });
}

describe('Dashboard PRD Simplification', () => {
  beforeEach(() => {
    clearAuthSession();
    localStorage.clear();
    toastError.mockClear();
    toastSuccess.mockClear();
    vi.unstubAllGlobals();
  });

  it('Admin login shows simplified navigation and hides Modules & QR', async () => {
    vi.stubGlobal('fetch', mockApi('admin'));
    const user = userEvent.setup();
    render(<App />);

    const emailInput = screen.getByPlaceholderText(/lecturer@university.edu/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /log in to portal/i });

    await user.type(emailInput, 'admin@icc.com');
    await user.type(passwordInput, 'admin123');
    await user.click(submitBtn);

    // Verify Admin Navigation is rendered
    await waitFor(() => {
      expect(screen.getByText('Admin Console Overview')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lecturers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /practice results/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system settings/i })).toBeInTheDocument();

    // Verify Modules and QR are NOT in navigation
    expect(screen.queryByText(/learning modules/i)).toBeNull();
    expect(screen.queryByText(/qr code/i)).toBeNull();
  });

  it('Lecturer login shows Lecturer navigation with Students and Profile', async () => {
    vi.stubGlobal('fetch', mockApi('lecturer'));
    const user = userEvent.setup();
    render(<App />);

    const emailInput = screen.getByPlaceholderText(/lecturer@university.edu/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /log in to portal/i });

    await user.type(emailInput, 'dr.jane@icc.com');
    await user.type(passwordInput, 'lecturer123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Lecturer Research Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /students/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /practice results/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();

    // Categories and Lecturers should not be visible for Lecturer
    expect(screen.queryByRole('button', { name: /^categories$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^lecturers$/i })).toBeNull();
  });

  it('Navigates to Scenarios view and opens Scenario Detail', async () => {
    vi.stubGlobal('fetch', mockApi('admin'));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText(/lecturer@university.edu/i), 'admin@icc.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /log in to portal/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin Console Overview')).toBeInTheDocument();
    });

    // Click Scenarios in sidebar
    await user.click(screen.getByRole('button', { name: /scenarios/i }));

    await waitFor(() => {
      expect(screen.getByText("Lecturer's Office Consultation")).toBeInTheDocument();
    });

    // Click to view detail
    await user.click(screen.getByText("Lecturer's Office Consultation"));

    await waitFor(() => {
      expect(screen.getByText('Practice Briefing')).toBeInTheDocument();
      expect(screen.getByText(/Ask your lecturer for guidance on research methodology/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Conversation Partner/i)).toBeInTheDocument();
    });
  });
});

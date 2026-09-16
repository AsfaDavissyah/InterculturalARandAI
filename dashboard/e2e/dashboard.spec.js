import { expect, test } from '@playwright/test';

const admin = {
  id: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439011',
  name: 'System Admin',
  email: 'admin@engora.test',
  role: 'admin',
};

async function mockDashboardApi(page) {
  await page.route('http://localhost:3000/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body = {};
    if (path === '/api/auth/login') body = { token: 'e2e-token', user: admin };
    if (path === '/api/dashboard/categories') body = [{
      category_id: 'academic-communication', name: 'Academic Communication', status: 'active',
    }];
    if (path === '/api/dashboard/overview') body = {
      role: 'admin',
      summary: {},
      drafts_awaiting_review: [],
      recent_sessions: [],
      recent_lecturers: [],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('insufficient evidence is shown without a fabricated perfect score', async ({ page }, testInfo) => {
  await mockDashboardApi(page);
  const session = {
    session_id: 'evidence-test', student_name: 'Test Student', student: { display_name: 'Test Student', student_id: 'TEST001' },
    scenario_title: 'Office Consultation', scenario: { title: 'Office Consultation' },
    status: 'ended_manually', overall_score: null, score_breakdown: {}, student_response_count: 1,
    assessment: { status: 'insufficient_evidence', completed_objectives: 2, total_objectives: 5 },
    transcript: [{ speaker: 'Student', message: 'Could you help with my assignment?' }],
  };
  await page.route('**/api/dashboard/practice-results**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/evidence-test') ? session : { items: [session], total_items: 1, total_pages: 1 }),
  }));
  await page.goto('/#/practice-results');
  await page.getByLabel('Email').fill('admin@engora.test');
  await page.getByLabel('Password').fill('valid-password');
  await page.getByRole('button', { name: 'Log in to Portal' }).click();
  await expect(page.getByText('Insufficient evidence')).toBeVisible();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Practice Session Analysis' })).toBeVisible();
  await expect(page.getByText('Insufficient evidence')).toBeVisible();
  await expect(page.getByText('2/5 objectives')).toBeVisible();
  await expect(page.getByText('Could you help with my assignment?')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('assessment.png'), fullPage: true });
});

test('direct Scenario create route survives login', async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto('/#/scenarios/new');
  await page.getByLabel('Email').fill('admin@engora.test');
  await page.getByLabel('Password').fill('valid-password');
  await page.getByRole('button', { name: 'Log in to Portal' }).click();
  await expect(page.getByRole('heading', { name: 'Create New Scenario' })).toBeVisible();
  await expect(page).toHaveURL(/#\/scenarios\/new$/);
});

test('unknown routes fall back to the role overview without layout overflow', async ({ page }) => {
  await mockDashboardApi(page);
  await page.goto('/#/not-a-page');
  await page.getByLabel('Email').fill('admin@engora.test');
  await page.getByLabel('Password').fill('valid-password');
  await page.getByRole('button', { name: 'Log in to Portal' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Console Overview' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

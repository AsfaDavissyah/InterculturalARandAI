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

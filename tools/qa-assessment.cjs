const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const output = path.join(__dirname, '../dashboard/test-results/assessment');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const session = {
        session_id: 'evidence-test', student_name: 'Test Student', student: { display_name: 'Test Student', student_id: 'TEST001' },
        scenario_title: 'Office Consultation', scenario: { title: 'Office Consultation' },
        status: 'ended_manually', overall_score: null, score_breakdown: {}, student_response_count: 1,
        assessment: { status: 'insufficient_evidence', completed_objectives: 2, total_objectives: 5 },
        transcript: [{ speaker: 'Student', message: 'Could you help with my assignment?' }],
      };
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        let body = {};
        if (url.pathname === '/api/auth/login') body = { token: 'qa-token', user: { id: 'admin-test', name: 'Test Admin', role: 'admin', email: 'admin@engora.test' } };
        if (url.pathname.includes('/practice-results')) body = url.pathname.endsWith('/evidence-test') ? session : { items: [session], total_items: 1, total_pages: 1 };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      });
      await page.goto(process.env.QA_URL || 'http://127.0.0.1:4173/#/practice-results');
      await page.getByLabel('Email').fill('admin@engora.test');
      await page.getByLabel('Password').fill('valid-password');
      await page.getByRole('button', { name: 'Log in to Portal' }).click();
      await page.getByText('Insufficient evidence', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByText('2/5 objectives', { exact: true }).waitFor();
      await page.getByText('Insufficient evidence', { exact: true }).waitFor();
      if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error(`${name}: horizontal overflow`);
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
      console.log(`${name}: insufficient-evidence detail and objective coverage verified`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

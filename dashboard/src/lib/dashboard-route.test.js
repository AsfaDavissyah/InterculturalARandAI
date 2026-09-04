import { describe, expect, it } from 'vitest';
import { buildDashboardHash, parseDashboardRoute } from './dashboard-route';

describe('dashboard URL routes', () => {
  it('restores primary views from a hash URL', () => {
    expect(parseDashboardRoute('#/categories')).toEqual({
      tab: 'categories', scenarioMode: 'list', scenarioId: null,
    });
  });

  it('round-trips Scenario detail and edit routes', () => {
    const hash = buildDashboardHash('scenarios', { action: 'edit', scenarioId: 'SCN-2026-0001' });
    expect(hash).toBe('#/scenarios/SCN-2026-0001/edit');
    expect(parseDashboardRoute(hash)).toEqual({
      tab: 'scenarios', scenarioMode: 'edit', scenarioId: 'SCN-2026-0001',
    });
  });

  it('falls back to Overview for unknown routes', () => {
    expect(parseDashboardRoute('#/not-a-page').tab).toBe('overview');
  });
});

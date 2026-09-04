const VALID_TABS = new Set([
  'overview',
  'scenarios',
  'categories',
  'lecturers',
  'students',
  'practice-results',
  'system-settings',
  'profile',
]);

export function parseDashboardRoute(hash = '') {
  const parts = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = VALID_TABS.has(parts[0]) ? parts[0] : 'overview';
  if (tab !== 'scenarios') return { tab, scenarioMode: 'list', scenarioId: null };
  if (parts[1] === 'new') return { tab, scenarioMode: 'create', scenarioId: null };
  if (parts[1]) {
    return {
      tab,
      scenarioMode: parts[2] === 'edit' ? 'edit' : 'detail',
      scenarioId: decodeURIComponent(parts[1]),
    };
  }
  return { tab, scenarioMode: 'list', scenarioId: null };
}

export function buildDashboardHash(tab, params = {}) {
  if (tab === 'scenarios') {
    if (params.action === 'create') return '#/scenarios/new';
    if (params.scenarioId && params.action === 'edit') {
      return `#/scenarios/${encodeURIComponent(params.scenarioId)}/edit`;
    }
    if (params.scenarioId && params.action === 'detail') {
      return `#/scenarios/${encodeURIComponent(params.scenarioId)}`;
    }
  }
  return `#/${VALID_TABS.has(tab) ? tab : 'overview'}`;
}

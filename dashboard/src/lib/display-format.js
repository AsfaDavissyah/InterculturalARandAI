const STATUS_LABELS = {
  active: 'Active',
  abandoned: 'Abandoned',
  archived: 'Archived',
  completed: 'Completed',
  draft: 'Draft',
  ended_manually: 'Ended Manually',
  inactive: 'Inactive',
  in_progress: 'In Progress',
  in_review: 'In Review',
  published: 'Published',
};

export function formatStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'Unknown';
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isNumericScore(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function formatScore(value, fallback = '—') {
  if (!isNumericScore(value)) return fallback;

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function cleanDisplayText(value, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).replace(/\bcampuss\b/gi, 'Campus');
}

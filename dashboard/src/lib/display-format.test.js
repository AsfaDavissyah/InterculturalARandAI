import { describe, expect, it } from 'vitest';
import {
  cleanDisplayText,
  formatScore,
  formatStatusLabel,
  isNumericScore,
} from './display-format';

describe('dashboard display formatting', () => {
  it('formats scores with one or two decimal places', () => {
    expect(formatScore(4.749999999)).toBe('4.75');
    expect(formatScore(4.5)).toBe('4.5');
    expect(formatScore(5)).toBe('5.0');
    expect(formatScore(null)).toBe('—');
    expect(isNumericScore(0)).toBe(true);
  });

  it('turns machine statuses into readable labels', () => {
    expect(formatStatusLabel('ended_manually')).toBe('Ended Manually');
    expect(formatStatusLabel('in_review')).toBe('In Review');
    expect(formatStatusLabel('custom_status')).toBe('Custom Status');
  });

  it('corrects the known Campus typo in legacy display text', () => {
    expect(cleanDisplayText('Global Campuss Conversation')).toBe('Global Campus Conversation');
    expect(cleanDisplayText('CAMPUSS')).toBe('Campus');
  });
});

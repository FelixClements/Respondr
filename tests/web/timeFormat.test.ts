import { describe, expect, it } from 'vitest';
import { formatDateTime, formatNextScan } from '../../web/src/lib/status';

describe('24-hour time', () => {
  it('formats the next scan as 00–23 without AM or PM', () => {
    expect(formatNextScan(new Date(2026, 8, 26, 0, 5))).toBe('00:05');
    expect(formatNextScan(new Date(2026, 8, 26, 9, 5))).toBe('09:05');
    expect(formatNextScan(new Date(2026, 8, 26, 12, 0))).toBe('12:00');
    expect(formatNextScan(new Date(2026, 8, 26, 15, 30))).toBe('15:30');
    expect(formatNextScan(new Date(2026, 8, 26, 23, 59))).toBe('23:59');
    expect(formatNextScan(null)).toBe('—');
    expect(formatNextScan('not-a-date')).toBe('—');
  });

  it('formats every timestamp hour as 00–23', () => {
    const morning = formatDateTime(new Date(2026, 8, 26, 9, 5, 0).getTime());
    const afternoon = formatDateTime(new Date(2026, 8, 26, 15, 30, 46).getTime());
    expect(morning.endsWith('09:05:00')).toBe(true);
    expect(afternoon.endsWith('15:30:46')).toBe(true);
    expect(`${morning} ${afternoon}`).not.toMatch(/am|pm/i);
  });
});

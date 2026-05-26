import { describe, expect, it } from 'vitest';

import { buildFilename, hexToRgb, sanitizePrefix, todayString } from './format.ts';

describe('todayString', () => {
  it('formats as YYYY-MM-DD with zero padding', () => {
    expect(todayString(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(todayString(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('uses local timezone (month is 0-based on the Date input)', () => {
    expect(todayString(new Date(2025, 6, 9))).toBe('2025-07-09');
  });
});

describe('sanitizePrefix', () => {
  it('returns empty string for null / undefined / empty', () => {
    expect(sanitizePrefix(null)).toBe('');
    expect(sanitizePrefix(undefined)).toBe('');
    expect(sanitizePrefix('')).toBe('');
  });

  it('strips filesystem-illegal characters', () => {
    expect(sanitizePrefix('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij');
  });

  it('strips control characters', () => {
    expect(sanitizePrefix('hi\x00\x07world')).toBe('hiworld');
  });

  it('trims leading / trailing dashes and whitespace', () => {
    expect(sanitizePrefix('  -- foo --  ')).toBe('foo');
  });

  it('preserves Chinese characters', () => {
    expect(sanitizePrefix('1班 数学')).toBe('1班 数学');
  });
});

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ffaa00')).toEqual({ r: 255, g: 170, b: 0 });
    expect(hexToRgb('cdd9e1')).toEqual({ r: 205, g: 217, b: 225 });
  });

  it('expands 3-digit hex', () => {
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
  });

  it('returns black for malformed input', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#zzzzzz')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('buildFilename', () => {
  it('builds default name without prefix', () => {
    expect(
      buildFilename({ kind: 'queens', size: '6x6', pages: 3, date: '2025-05-26' }),
    ).toBe('queens-6x6-3p-2025-05-26.pdf');
  });

  it('prepends sanitized prefix when given', () => {
    expect(
      buildFilename({
        kind: 'onestroke',
        size: '5x5',
        pages: 1,
        prefix: ' 1班/',
        date: '2025-05-26',
      }),
    ).toBe('1班-onestroke-5x5-1p-2025-05-26.pdf');
  });

  it('uses today when date omitted', () => {
    const fname = buildFilename({ kind: 'queens', size: '6x6', pages: 1 });
    expect(fname).toMatch(/^queens-6x6-1p-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

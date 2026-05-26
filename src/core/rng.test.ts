import { describe, expect, it } from 'vitest';

import { mulberry32, range, shuffle } from './rng.ts';

describe('range', () => {
  it('returns [0, 1, ..., n-1]', () => {
    expect(range(0)).toEqual([]);
    expect(range(1)).toEqual([0]);
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('mulberry32', () => {
  it('is deterministic for same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 8; i++) {
      expect(a()).toBe(b());
    }
  });

  it('returns values in [0, 1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('preserves the multiset of elements', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle([...input], mulberry32(7));
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it('returns the same array reference (in-place)', () => {
    const arr = [1, 2, 3];
    expect(shuffle(arr, mulberry32(0))).toBe(arr);
  });

  it('produces deterministic output for fixed seed', () => {
    expect(shuffle([0, 1, 2, 3, 4], mulberry32(123))).toEqual(
      shuffle([0, 1, 2, 3, 4], mulberry32(123)),
    );
  });

  it('handles empty / single-element arrays', () => {
    expect(shuffle([], mulberry32(0))).toEqual([]);
    expect(shuffle([42], mulberry32(0))).toEqual([42]);
  });
});

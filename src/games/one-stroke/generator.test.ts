import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../../core/rng.ts';

import { buildPuzzles, generatePath } from './generator.ts';
import { DIFFICULTY_RATIO, type Difficulty } from './types.ts';

function isAdjacent(a: readonly [number, number], b: readonly [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

describe('generatePath', () => {
  it('produces a path of exact target length with all cells distinct', () => {
    const data = generatePath(6, 25, mulberry32(1));
    expect(data).not.toBeNull();
    expect(data!.path.length).toBe(25);
    const seen = new Set<string>();
    for (const [r, c] of data!.path) seen.add(`${r},${c}`);
    expect(seen.size).toBe(25);
  });

  it('all consecutive path nodes are 4-adjacent', () => {
    const data = generatePath(7, 30, mulberry32(2))!;
    for (let i = 1; i < data.path.length; i++) {
      expect(isAdjacent(data.path[i - 1]!, data.path[i]!), `step ${i}`).toBe(true);
    }
  });

  it('cells matrix matches the path', () => {
    const data = generatePath(5, 14, mulberry32(3))!;
    let count = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (data.cells[r]![c]) count++;
      }
    }
    expect(count).toBe(14);
  });

  it('startRC and endRC are first / last of path', () => {
    const data = generatePath(6, 18, mulberry32(4))!;
    expect(data.startRC[0]).toBe(data.path[0]![0]);
    expect(data.startRC[1]).toBe(data.path[0]![1]);
    const last = data.path[data.path.length - 1]!;
    expect(data.endRC[0]).toBe(last[0]);
    expect(data.endRC[1]).toBe(last[1]);
  });

  it('returns null when target out of range', () => {
    expect(generatePath(5, 0)).toBeNull();
    expect(generatePath(5, 26)).toBeNull(); // > n*n
  });

  it('converges across all 4..7 × easy/medium/hard combos (sanity)', () => {
    const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
    for (let n = 4; n <= 7; n++) {
      for (const d of diffs) {
        const target = Math.max(4, Math.round(DIFFICULTY_RATIO[d] * n * n));
        const data = generatePath(n, target);
        expect(data, `n=${n} diff=${d}`).not.toBeNull();
      }
    }
  });
});

describe('buildPuzzles', () => {
  it('returns pages × 6 boards', () => {
    const pages = buildPuzzles(6, DIFFICULTY_RATIO.medium, 2, mulberry32(7));
    expect(pages.length).toBe(2);
    for (const page of pages) {
      expect(page.length).toBe(6);
      for (const board of page) {
        expect(board).not.toBeNull();
      }
    }
  });
});

import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../../core/rng.ts';

import {
  buildPuzzles,
  countSolutions,
  generatePuzzle,
  generateQueens,
  generateRegions,
  isConnectedRegions,
  solveWithLogic,
} from './generator.ts';

describe('generateQueens', () => {
  it('places one queen per row, all columns distinct', () => {
    const queens = generateQueens(6, mulberry32(1));
    expect(queens).not.toBeNull();
    expect(queens!.length).toBe(6);
    expect(new Set(queens!).size).toBe(6);
  });

  it('respects non-adjacency on neighboring rows', () => {
    for (let s = 1; s <= 5; s++) {
      const queens = generateQueens(7, mulberry32(s));
      expect(queens).not.toBeNull();
      for (let r = 1; r < 7; r++) {
        expect(Math.abs(queens![r]! - queens![r - 1]!)).toBeGreaterThan(1);
      }
    }
  });

  it('works for n = 5..9', () => {
    for (let n = 5; n <= 9; n++) {
      expect(generateQueens(n, mulberry32(n * 7))).not.toBeNull();
    }
  });
});

describe('generateRegions', () => {
  it('assigns every cell to a valid region id (0..n-1)', () => {
    const rand = mulberry32(42);
    const queens = generateQueens(6, rand)!;
    const regions = generateRegions(6, queens, rand);
    expect(regions.length).toBe(6);
    for (let r = 0; r < 6; r++) {
      expect(regions[r]!.length).toBe(6);
      for (let c = 0; c < 6; c++) {
        const v = regions[r]![c]!;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(6);
      }
    }
  });

  it("places each queen in the region keyed by that queen's row index", () => {
    const rand = mulberry32(2025);
    const queens = generateQueens(6, rand)!;
    const regions = generateRegions(6, queens, rand);
    for (let r = 0; r < 6; r++) {
      const qc = queens[r]!;
      // 区域种子必然是该皇后所在格，区域 id 等于行号 r
      expect(regions[r]![qc]).toBe(r);
    }
  });

  it('keeps every color region connected', () => {
    for (let n = 5; n <= 9; n++) {
      const rand = mulberry32(3000 + n);
      const queens = generateQueens(n, rand)!;
      const regions = generateRegions(n, queens, rand);
      expect(isConnectedRegions(n, regions), `n=${n}`).toBe(true);
    }
  });
});

describe('countSolutions', () => {
  it('returns exactly 1 for a verified-unique puzzle', () => {
    const regions = generatePuzzle(6, mulberry32(123));
    expect(regions).not.toBeNull();
    expect(countSolutions(6, regions!, 2)).toBe(1);
  });
});

describe('generatePuzzle', () => {
  it('produces connected, unique, logic-solvable puzzles for n = 5..9', () => {
    for (let n = 5; n <= 9; n++) {
      const regions = generatePuzzle(n, mulberry32(7000 + n));
      expect(regions, `n=${n}`).not.toBeNull();
      expect(isConnectedRegions(n, regions!), `n=${n}`).toBe(true);
      expect(countSolutions(n, regions!, 2)).toBe(1);
      expect(solveWithLogic(n, regions!).solved, `n=${n}`).toBe(true);
    }
  });
});

describe('buildPuzzles', () => {
  it('produces pages × 6 boards for given n', () => {
    const pages = buildPuzzles(6, 2, mulberry32(7));
    expect(pages.length).toBe(2);
    for (const page of pages) {
      expect(page.length).toBe(6);
      for (const board of page) {
        expect(board).not.toBeNull();
        expect(board!.length).toBe(6);
      }
    }
  });

  it('does not fall back to non-unique boards at n=8/9', () => {
    for (const n of [8, 9]) {
      const pages = buildPuzzles(n, 1, mulberry32(9000 + n));
      expect(pages.length).toBe(1);
      const page = pages[0]!;
      expect(page.length).toBe(6);
      for (const board of page) {
        expect(board).not.toBeNull();
        expect(countSolutions(n, board!, 2)).toBe(1);
        expect(solveWithLogic(n, board!).solved).toBe(true);
      }
    }
  });
});

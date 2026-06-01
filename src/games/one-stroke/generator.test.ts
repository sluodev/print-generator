import { describe, expect, it } from 'vitest';

import { mulberry32 } from '../../core/rng.ts';

import { analyzeBoard, buildPuzzles, countPlayerSolutions, generatePath } from './generator.ts';
import {
  DIFFICULTY_PROFILES,
  type Difficulty,
  type MarkMode,
  type OneStrokeBoard,
} from './types.ts';

function isAdjacent(a: readonly [number, number], b: readonly [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

function makeBoard(n: number, path: ReadonlyArray<readonly [number, number]>): OneStrokeBoard {
  const cells: boolean[][] = [];
  for (let r = 0; r < n; r++) cells.push(new Array<boolean>(n).fill(false));
  for (const [r, c] of path) cells[r]![c] = true;
  const start = path[0]!;
  const end = path[path.length - 1]!;
  return {
    cells,
    startRC: [start[0], start[1]] as const,
    endRC: [end[0], end[1]] as const,
    path,
  };
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
        const [target] = DIFFICULTY_PROFILES[d].cellCountBySize[n as 4 | 5 | 6 | 7];
        const data = generatePath(n, target);
        expect(data, `n=${n} diff=${d}`).not.toBeNull();
      }
    }
  });
});

describe('countPlayerSolutions', () => {
  it('counts fixed start and end solutions', () => {
    const board = makeBoard(2, [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]);

    expect(countPlayerSolutions(board, 'both', 10)).toBe(1);
  });

  it('counts multiple routes when only the start is marked', () => {
    const board = makeBoard(2, [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]);

    expect(countPlayerSolutions(board, 'start', 10)).toBe(2);
  });

  it('deduplicates reversed routes when neither endpoint is marked', () => {
    const board = makeBoard(2, [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]);

    expect(countPlayerSolutions(board, 'none', 10)).toBe(4);
  });
});

describe('buildPuzzles', () => {
  it('returns pages × 6 boards', () => {
    const pages = buildPuzzles(6, 'medium', 'start', 2, mulberry32(7));
    expect(pages.length).toBe(2);
    for (const page of pages) {
      expect(page.length).toBe(6);
      for (const board of page) {
        expect(board).not.toBeNull();
      }
    }
  });

  it('keeps hard boards below the old 90% coverage target', () => {
    const pages = buildPuzzles(6, 'hard', 'both', 1, mulberry32(11));
    const hardMax = DIFFICULTY_PROFILES.hard.cellCountBySize[6][1];
    for (const board of pages[0]!) {
      expect(board).not.toBeNull();
      expect(board!.path.length).toBeLessThanOrEqual(hardMax);
      expect(board!.path.length).toBeLessThan(Math.round(0.9 * 6 * 6));
    }
  });

  it('narrows the capped solution space as difficulty increases', () => {
    const easy = buildPuzzles(5, 'easy', 'both', 1, mulberry32(21))[0]![0]!;
    const hard = buildPuzzles(5, 'hard', 'both', 1, mulberry32(22))[0]![0]!;

    const easySolutions = analyzeBoard(
      easy,
      'both',
      DIFFICULTY_PROFILES.easy.solveCap,
    ).solutionCount;
    const hardSolutions = analyzeBoard(
      hard,
      'both',
      DIFFICULTY_PROFILES.hard.solveCap,
    ).solutionCount;

    expect(easySolutions).toBeGreaterThan(hardSolutions);
    expect(hardSolutions).toBeGreaterThanOrEqual(DIFFICULTY_PROFILES.hard.minSolutions);
    expect(hardSolutions).toBeLessThanOrEqual(DIFFICULTY_PROFILES.hard.maxSolutions!);
  });

  it('keeps hard boards from collapsing into a mostly forced corridor', () => {
    const hard = buildPuzzles(6, 'hard', 'both', 1, mulberry32(31))[0]![0]!;
    const metrics = analyzeBoard(hard, 'both', DIFFICULTY_PROFILES.hard.solveCap);

    expect(metrics.branchPoints).toBeGreaterThanOrEqual(2);
    expect(metrics.extraEdges).toBeGreaterThanOrEqual(2);
    expect(metrics.forcedMoveRatio).toBeLessThan(0.9);
  });

  it('generates boards for every size, difficulty, and marker mode', () => {
    const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
    const markModes: MarkMode[] = ['start', 'both', 'none'];

    for (let n = 4; n <= 7; n++) {
      for (const diff of diffs) {
        for (const markMode of markModes) {
          const pages = buildPuzzles(
            n,
            diff,
            markMode,
            1,
            mulberry32(n * 100 + diff.length * 10 + markMode.length),
          );
          expect(pages[0]![0], `n=${n} diff=${diff} markMode=${markMode}`).not.toBeNull();
        }
      }
    }
  }, 15000);
});

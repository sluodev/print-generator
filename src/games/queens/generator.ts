/**
 * Queens 题面生成算法（纯函数、无 DOM）。
 *
 * 流程：
 *   1. `generateQueens` — 回溯放置 n 个皇后：每行 1 个、列互不相同、相邻行的列差 > 1。
 *   2. `generateRegions` — 以皇后位置为种子做 BFS 区域涂色，得到 n 个色块。
 *   3. `countSolutions` — 用回溯求解器，验证给定题面的解数。
 *   4. `generatePuzzle` — 反复尝试 (1)+(2) 直到 (3) 返回 1（唯一解）。
 *   5. `buildPuzzles` — 多页多题封装，单题失败时降级保留视觉。
 *
 * 注：所有需要随机性的函数都接收一个可注入的 `RandomFn`，方便测试中固定 seed。
 */

import { range, shuffle, type RandomFn } from '../../core/rng.ts';

import type { QueensBoard } from './types.ts';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** 放置 n 个皇后；成功返回 `queens[row]=col`，失败返回 null。 */
export function generateQueens(n: number, rand: RandomFn = Math.random): number[] | null {
  const queens: number[] = new Array<number>(n).fill(-1);

  const place = (row: number): boolean => {
    if (row === n) return true;
    const cols = shuffle(range(n), rand);
    for (const col of cols) {
      // 列不能重复
      let used = false;
      for (let i = 0; i < row; i++) {
        if (queens[i] === col) {
          used = true;
          break;
        }
      }
      if (used) continue;
      // 与上一行皇后的列差必须 > 1（避免 8 邻域相邻）
      if (row > 0) {
        const prev = queens[row - 1] ?? -1;
        if (prev !== -1 && Math.abs(prev - col) <= 1) continue;
      }
      queens[row] = col;
      if (place(row + 1)) return true;
      queens[row] = -1;
    }
    return false;
  };

  return place(0) ? queens.slice() : null;
}

/**
 * 以每个皇后所在格作为种子，BFS 泛洪扩展，直到全部 n×n 格被吃光。
 * 用 1D 数组做内部表示（性能 + 严格类型噪声更少），最后转 2D 输出。
 */
export function generateRegions(
  n: number,
  queens: number[],
  rand: RandomFn = Math.random,
): QueensBoard {
  const flat: number[] = new Array<number>(n * n).fill(-1);
  const idx = (r: number, c: number): number => r * n + c;

  const frontiers: Array<Array<readonly [number, number]>> = [];
  for (let i = 0; i < n; i++) frontiers.push([]);

  const addFrontier = (rid: number, r: number, c: number): void => {
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (flat[idx(nr, nc)] !== -1) continue;
      const f = frontiers[rid];
      if (f) f.push([nr, nc]);
    }
  };

  // 用行号当区域 id（0..n-1），每个皇后是一种区域的种子
  for (let k = 0; k < n; k++) {
    const qc = queens[k];
    if (qc === undefined || qc < 0) continue;
    flat[idx(k, qc)] = k;
    addFrontier(k, k, qc);
  }

  let remaining = n * n - n;
  let safety = 100000;
  while (remaining > 0 && safety-- > 0) {
    const order = shuffle(range(n), rand);
    let extended = false;

    for (const rid of order) {
      const f = frontiers[rid];
      if (!f) continue;

      // 清理已被占据的边界
      const live: Array<readonly [number, number]> = [];
      for (const cell of f) {
        if (flat[idx(cell[0], cell[1])] === -1) live.push(cell);
      }
      frontiers[rid] = live;
      if (live.length === 0) continue;

      const i = Math.floor(rand() * live.length);
      const pick = live[i];
      if (!pick) continue;
      live.splice(i, 1);

      flat[idx(pick[0], pick[1])] = rid;
      addFrontier(rid, pick[0], pick[1]);
      remaining--;
      extended = true;
      // 每轮每个区域最多多吃一个，整体保持均衡
      break;
    }

    if (!extended) break;
  }

  // 极少数情况下还有未填格（被孤立），就近合并到已分配的邻居
  if (remaining > 0) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (flat[idx(r, c)] !== -1) continue;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
          const v = flat[idx(nr, nc)];
          if (v !== undefined && v !== -1) {
            flat[idx(r, c)] = v;
            break;
          }
        }
      }
    }
  }

  // 转 2D
  const out: number[][] = [];
  for (let r = 0; r < n; r++) {
    out.push(flat.slice(r * n, (r + 1) * n));
  }
  return out;
}

/** 解题数（最多 limit）。 用于"是否唯一解"校验：limit=2 时 1 表示唯一。 */
export function countSolutions(n: number, regions: QueensBoard, limit: number): number {
  let count = 0;
  const usedCols: boolean[] = new Array<boolean>(n).fill(false);
  const usedRegions: boolean[] = new Array<boolean>(n).fill(false);

  const solve = (row: number, prev: number): void => {
    if (count >= limit) return;
    if (row === n) {
      count++;
      return;
    }
    const rowRegions = regions[row];
    if (!rowRegions) return;
    for (let col = 0; col < n; col++) {
      if (usedCols[col]) continue;
      const rid = rowRegions[col];
      if (rid === undefined || usedRegions[rid]) continue;
      if (prev !== -1 && Math.abs(prev - col) <= 1) continue;
      usedCols[col] = true;
      usedRegions[rid] = true;
      solve(row + 1, col);
      usedCols[col] = false;
      usedRegions[rid] = false;
      if (count >= limit) return;
    }
  };

  solve(0, -1);
  return count;
}

/** 反复尝试，直到生成"恰好 1 解"的题面。失败返回 null。 */
export function generatePuzzle(n: number, rand: RandomFn = Math.random): QueensBoard | null {
  for (let attempt = 0; attempt < 400; attempt++) {
    const queens = generateQueens(n, rand);
    if (!queens) continue;

    // 同一皇后位置允许多次尝试不同区域分割
    for (let ra = 0; ra < 6; ra++) {
      const regions = generateRegions(n, queens, rand);

      // 校验：每个区域恰好包含 1 个皇后（理论上一定，但稳妥起见再确认）
      const rqCount = new Array<number>(n).fill(0);
      let ok = true;
      for (let r = 0; r < n && ok; r++) {
        const qc = queens[r];
        if (qc === undefined) {
          ok = false;
          break;
        }
        const rid = regions[r]?.[qc];
        if (rid === undefined) {
          ok = false;
          break;
        }
        rqCount[rid] = (rqCount[rid] ?? 0) + 1;
      }
      if (!ok) continue;
      let allOne = true;
      for (const c of rqCount) {
        if (c !== 1) {
          allOne = false;
          break;
        }
      }
      if (!allOne) continue;

      if (countSolutions(n, regions, 2) === 1) return regions;
    }
  }
  return null;
}

/** 整本题册：pages × 6 题。失败时降级到"只满足皇后约束"的随机区域分割（视觉占位）。 */
export function buildPuzzles(
  n: number,
  pageCount: number,
  rand: RandomFn = Math.random,
): Array<Array<QueensBoard | null>> {
  const pages: Array<Array<QueensBoard | null>> = [];
  for (let p = 0; p < pageCount; p++) {
    const boards: Array<QueensBoard | null> = [];
    for (let b = 0; b < 6; b++) {
      let regions = generatePuzzle(n, rand);
      if (!regions) {
        const queens = generateQueens(n, rand);
        regions = queens ? generateRegions(n, queens, rand) : null;
      }
      boards.push(regions);
    }
    pages.push(boards);
  }
  return pages;
}

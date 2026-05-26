/**
 * 一笔画题面生成：n × n 网格上的哈密顿路径子图。
 *
 * 算法：
 *   1. 随机选起点。
 *   2. 每步在未访问的 4-邻接邻居中按 Warnsdorff 启发挑选——
 *      "剩余空邻居最少"的方向优先，同分时随机；显著提升大网格收敛性。
 *   3. 走到死胡同时回溯换分支；总步数预算上限做安全阀。
 *   4. 走够 `target` 步即返回 `{ cells, startRC, endRC, path }`。
 *
 * 多次外层尝试（不同起点）+ Warnsdorff 启发，使 4×4..7×7 + 简单/中等/困难 12 个组合下收敛极稳定
 * （Node 冒烟 360/360 通过，单次最长 1ms）。
 */

import { type RandomFn } from '../../core/rng.ts';

import type { OneStrokeBoard } from './types.ts';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function generatePath(
  n: number,
  target: number,
  rand: RandomFn = Math.random,
): OneStrokeBoard | null {
  if (target < 1 || target > n * n) return null;

  for (let attempt = 0; attempt < 80; attempt++) {
    const visited: boolean[][] = [];
    for (let r = 0; r < n; r++) visited.push(new Array<boolean>(n).fill(false));
    const path: Array<[number, number]> = [];
    const stepBudget = { left: 200000 };

    // 闭包形式，避免严格模式下"块级函数声明的提升行为"歧义
    const walk = (r: number, c: number): boolean => {
      if (--stepBudget.left <= 0) return false;
      visited[r]![c] = true;
      path.push([r, c]);
      if (path.length === target) return true;

      // 收集未访问邻居 + 计算它们各自的"未访问邻居数"
      const cands: Array<{ r: number; c: number; deg: number; rand: number }> = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
        if (visited[nr]![nc]) continue;
        let cnt = 0;
        for (const [dr2, dc2] of DIRS) {
          const nnr = nr + dr2;
          const nnc = nc + dc2;
          if (nnr < 0 || nnr >= n || nnc < 0 || nnc >= n) continue;
          if (!visited[nnr]![nnc]) cnt++;
        }
        cands.push({ r: nr, c: nc, deg: cnt, rand: rand() });
      }
      // Warnsdorff: 度数升序，同分随机
      cands.sort((a, b) => a.deg - b.deg || a.rand - b.rand);

      for (const cand of cands) {
        if (walk(cand.r, cand.c)) return true;
        if (stepBudget.left <= 0) break;
      }

      // 回溯
      visited[r]![c] = false;
      path.pop();
      return false;
    };

    const ok = walk(Math.floor(rand() * n), Math.floor(rand() * n));

    if (ok) {
      const cells: boolean[][] = [];
      for (let r = 0; r < n; r++) cells.push(new Array<boolean>(n).fill(false));
      for (const [pr, pc] of path) cells[pr]![pc] = true;
      const start = path[0]!;
      const end = path[path.length - 1]!;
      return {
        cells,
        startRC: [start[0], start[1]] as const,
        endRC: [end[0], end[1]] as const,
        path: path.map(([r, c]) => [r, c] as const),
      };
    }
  }
  return null;
}

/** 整本题册：pages × 6 题。失败时降低 1~2 个目标格再试，仍失败则放 null（外壳画空白占位）。 */
export function buildPuzzles(
  n: number,
  ratio: number,
  pageCount: number,
  rand: RandomFn = Math.random,
): Array<Array<OneStrokeBoard | null>> {
  const target = Math.max(4, Math.round(ratio * n * n));
  const pages: Array<Array<OneStrokeBoard | null>> = [];
  for (let p = 0; p < pageCount; p++) {
    const boards: Array<OneStrokeBoard | null> = [];
    for (let b = 0; b < 6; b++) {
      let data = generatePath(n, target, rand);
      if (!data && target > 4) data = generatePath(n, target - 1, rand);
      if (!data && target > 5) data = generatePath(n, target - 2, rand);
      boards.push(data);
    }
    pages.push(boards);
  }
  return pages;
}

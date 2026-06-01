/**
 * 一笔画题面生成：先构造保证有解的自避路径，再从玩家视角估算解空间。
 *
 * 难度不再等同于激活格比例。每个候选题都会用 capped DFS 统计玩家看到的可行一笔画数量：
 * easy 倾向多解，medium 倾向少解，hard 倾向唯一/近唯一解，同时保留少量局部分支。
 */

import { type RandomFn } from '../../core/rng.ts';

import { DIFFICULTY_PROFILES, type BoardSize, type Difficulty, type MarkMode } from './types.ts';
import type { DifficultyProfile, OneStrokeBoard } from './types.ts';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

interface GeneratePathOptions {
  readonly shortcutPenalty?: number;
}

interface BoardGraph {
  readonly activeIds: readonly number[];
  readonly active: Uint8Array;
  readonly neighbors: ReadonlyArray<readonly number[]>;
  readonly startId: number;
  readonly endId: number;
}

interface BoardMetrics {
  readonly activeCells: number;
  readonly branchPoints: number;
  readonly extraEdges: number;
  readonly turns: number;
  readonly solutionCount: number;
  readonly searchNodes: number;
  readonly forcedMoveRatio: number;
}

interface ScoredBoard {
  readonly board: OneStrokeBoard;
  readonly metrics: BoardMetrics;
  readonly score: number;
}

interface SolutionStats {
  readonly count: number;
  readonly searchNodes: number;
}

export function generatePath(
  n: number,
  target: number,
  rand: RandomFn = Math.random,
  options: GeneratePathOptions = {},
): OneStrokeBoard | null {
  if (target < 1 || target > n * n) return null;

  const shortcutPenalty = options.shortcutPenalty ?? 0;

  for (let attempt = 0; attempt < 80; attempt++) {
    const visited: boolean[][] = [];
    for (let r = 0; r < n; r++) visited.push(new Array<boolean>(n).fill(false));
    const path: Array<[number, number]> = [];
    const stepBudget = { left: 200000 };

    const walk = (r: number, c: number): boolean => {
      if (--stepBudget.left <= 0) return false;
      visited[r]![c] = true;
      path.push([r, c]);
      if (path.length === target) return true;

      const cands: Array<{ r: number; c: number; score: number }> = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(n, nr, nc)) continue;
        if (visited[nr]![nc]) continue;

        let openDegree = 0;
        let shortcutContacts = 0;
        for (const [dr2, dc2] of DIRS) {
          const nnr = nr + dr2;
          const nnc = nc + dc2;
          if (!inBounds(n, nnr, nnc)) continue;
          if (!visited[nnr]![nnc]) {
            openDegree++;
          } else if (!(nnr === r && nnc === c)) {
            shortcutContacts++;
          }
        }

        cands.push({
          r: nr,
          c: nc,
          score: openDegree * 1.5 + shortcutContacts * shortcutPenalty + rand(),
        });
      }
      cands.sort((a, b) => a.score - b.score);

      for (const cand of cands) {
        if (walk(cand.r, cand.c)) return true;
        if (stepBudget.left <= 0) break;
      }

      visited[r]![c] = false;
      path.pop();
      return false;
    };

    const ok = walk(Math.floor(rand() * n), Math.floor(rand() * n));
    if (ok) return pathToBoard(n, path);
  }

  return null;
}

export function countPlayerSolutions(board: OneStrokeBoard, markMode: MarkMode, cap = 100): number {
  return countPlayerSolutionStats(board, markMode, cap).count;
}

function countPlayerSolutionStats(
  board: OneStrokeBoard,
  markMode: MarkMode,
  cap = 100,
): SolutionStats {
  const graph = buildGraph(board);
  if (graph.activeIds.length === 0 || cap <= 0) return { count: 0, searchNodes: 0 };

  if (markMode === 'both') {
    return countSolutionsFromStart(graph, graph.startId, graph.endId, cap);
  }

  if (markMode === 'start') {
    return countSolutionsFromStart(graph, graph.startId, null, cap);
  }

  let orientedCount = 0;
  let searchNodes = 0;
  const orientedCap = cap * 2;
  const startIds = [...graph.activeIds]
    .sort((a, b) => (graph.neighbors[a]?.length ?? 0) - (graph.neighbors[b]?.length ?? 0))
    .slice(0, Math.min(graph.activeIds.length, Math.max(8, cap * 2)));
  for (const startId of startIds) {
    const stats = countSolutionsFromStart(graph, startId, null, orientedCap - orientedCount);
    orientedCount += stats.count;
    searchNodes += stats.searchNodes;
    if (orientedCount >= orientedCap) return { count: cap, searchNodes };
  }
  return { count: Math.min(cap, Math.ceil(orientedCount / 2)), searchNodes };
}

export function analyzeBoard(
  board: OneStrokeBoard,
  markMode: MarkMode,
  solveCap = 100,
): BoardMetrics {
  const graph = buildGraph(board);
  let edgeCount = 0;
  let branchPoints = 0;
  const solutionStats = countPlayerSolutionStats(board, markMode, solveCap);

  for (const id of graph.activeIds) {
    const degree = graph.neighbors[id]?.length ?? 0;
    edgeCount += degree;
    if (degree >= 3) branchPoints++;
  }

  return {
    activeCells: graph.activeIds.length,
    branchPoints,
    extraEdges: Math.max(0, edgeCount / 2 - (graph.activeIds.length - 1)),
    turns: countTurns(board.path),
    solutionCount: solutionStats.count,
    searchNodes: solutionStats.searchNodes,
    forcedMoveRatio: countForcedMoveRatio(board),
  };
}

/** 整本题册：pages × 6 题。失败时返回本轮评分最接近目标的候选，避免整题空白。 */
export function buildPuzzles(
  n: number,
  difficulty: Difficulty,
  markMode: MarkMode,
  pageCount: number,
  rand: RandomFn = Math.random,
): Array<Array<OneStrokeBoard | null>> {
  const pages: Array<Array<OneStrokeBoard | null>> = [];
  for (let p = 0; p < pageCount; p++) {
    const boards: Array<OneStrokeBoard | null> = [];
    for (let b = 0; b < 6; b++) {
      boards.push(generatePuzzle(n, difficulty, markMode, rand));
    }
    pages.push(boards);
  }
  return pages;
}

function generatePuzzle(
  n: number,
  difficulty: Difficulty,
  markMode: MarkMode,
  rand: RandomFn,
): OneStrokeBoard | null {
  const size = toBoardSize(n);
  const profile = DIFFICULTY_PROFILES[difficulty];
  const [minCells, maxCells] = profile.cellCountBySize[size];
  let best: ScoredBoard | null = null;

  for (let attempt = 0; attempt < profile.candidateAttempts; attempt++) {
    const target = randomInt(minCells, maxCells, rand);
    const board = generatePath(n, target, rand, { shortcutPenalty: profile.shortcutPenalty });
    if (!board) continue;

    const scored = scoreBoard(board, markMode, size, profile);
    if (!best || scored.score < best.score) best = scored;
    if (isAcceptable(scored.metrics, size, profile)) return board;
  }

  return (
    best?.board ?? generatePath(n, minCells, rand, { shortcutPenalty: profile.shortcutPenalty })
  );
}

function scoreBoard(
  board: OneStrokeBoard,
  markMode: MarkMode,
  size: BoardSize,
  profile: DifficultyProfile,
): ScoredBoard {
  const metrics = analyzeBoard(board, markMode, profile.solveCap);
  const solutionPenalty = solutionDistance(metrics.solutionCount, profile) * 100;
  const branchPenalty =
    Math.max(0, profile.minBranchPointsBySize[size] - metrics.branchPoints) * 35;
  const extraEdgePenalty = Math.max(0, profile.minExtraEdgesBySize[size] - metrics.extraEdges) * 30;
  const searchPenalty =
    Math.max(0, profile.minSearchNodesBySize[size] - metrics.searchNodes) /
    profile.minSearchNodesBySize[size];
  const forcedPenalty = Math.max(0, metrics.forcedMoveRatio - profile.maxForcedMoveRatio) * 160;
  const shapePenalty = Math.max(0, 3 - metrics.turns) * 8;

  return {
    board,
    metrics,
    score:
      solutionPenalty +
      branchPenalty +
      extraEdgePenalty +
      searchPenalty * 90 +
      forcedPenalty +
      shapePenalty,
  };
}

function isAcceptable(metrics: BoardMetrics, size: BoardSize, profile: DifficultyProfile): boolean {
  if (metrics.solutionCount < profile.minSolutions) return false;
  if (profile.maxSolutions !== null && metrics.solutionCount > profile.maxSolutions) return false;
  if (metrics.branchPoints < profile.minBranchPointsBySize[size]) return false;
  if (metrics.extraEdges < profile.minExtraEdgesBySize[size]) return false;
  if (metrics.searchNodes < profile.minSearchNodesBySize[size]) return false;
  if (metrics.forcedMoveRatio > profile.maxForcedMoveRatio) return false;
  return true;
}

function solutionDistance(solutionCount: number, profile: DifficultyProfile): number {
  if (solutionCount < profile.minSolutions) return profile.minSolutions - solutionCount;
  if (profile.maxSolutions !== null && solutionCount > profile.maxSolutions) {
    return solutionCount - profile.maxSolutions;
  }
  return 0;
}

function countSolutionsFromStart(
  graph: BoardGraph,
  startId: number,
  endId: number | null,
  cap: number,
): SolutionStats {
  if (cap <= 0 || graph.active[startId] !== 1) return { count: 0, searchNodes: 0 };
  if (endId !== null && graph.active[endId] !== 1) return { count: 0, searchNodes: 0 };

  const visited = new Uint8Array(graph.active.length);
  const activeCount = graph.activeIds.length;
  let count = 0;
  let searchNodes = 0;
  visited[startId] = 1;

  const dfs = (nodeId: number, depth: number): void => {
    if (count >= cap) return;
    searchNodes++;
    if (endId !== null && nodeId === endId && depth < activeCount) return;

    if (depth === activeCount) {
      if (endId === null || nodeId === endId) count++;
      return;
    }

    if (!canStillFinish(graph, visited, nodeId, depth, endId)) return;

    const nextIds = [...(graph.neighbors[nodeId] ?? [])].filter((nextId) => {
      if (visited[nextId] === 1) return false;
      return !(endId !== null && nextId === endId && depth + 1 < activeCount);
    });
    nextIds.sort(
      (a, b) =>
        availableDegree(graph, visited, a, nodeId) - availableDegree(graph, visited, b, nodeId),
    );

    for (const nextId of nextIds) {
      visited[nextId] = 1;
      dfs(nextId, depth + 1);
      visited[nextId] = 0;
      if (count >= cap) return;
    }
  };

  dfs(startId, 1);
  return { count, searchNodes };
}

function canStillFinish(
  graph: BoardGraph,
  visited: Uint8Array,
  currentId: number,
  depth: number,
  endId: number | null,
): boolean {
  const remaining = graph.activeIds.length - depth;
  if (remaining <= 0) return true;

  let currentOpen = 0;
  for (const nextId of graph.neighbors[currentId] ?? []) {
    if (visited[nextId] === 0) currentOpen++;
  }
  if (currentOpen === 0) return false;

  if (!allRemainingReachable(graph, visited, currentId, remaining)) return false;

  let freeLeafCount = 0;
  for (const id of graph.activeIds) {
    if (visited[id] === 1) continue;
    const degree = availableDegree(graph, visited, id, currentId);
    if (degree === 0) return false;
    if (degree === 1) {
      if (endId !== null) {
        if (id !== endId) return false;
      } else {
        freeLeafCount++;
        if (freeLeafCount > 1) return false;
      }
    }
  }

  return true;
}

function allRemainingReachable(
  graph: BoardGraph,
  visited: Uint8Array,
  currentId: number,
  remaining: number,
): boolean {
  const seen = new Uint8Array(graph.active.length);
  const stack = [currentId];
  seen[currentId] = 1;
  let reachedRemaining = 0;

  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const nextId of graph.neighbors[id] ?? []) {
      if (seen[nextId] === 1) continue;
      if (visited[nextId] === 1) continue;
      seen[nextId] = 1;
      reachedRemaining++;
      stack.push(nextId);
    }
  }

  return reachedRemaining === remaining;
}

function availableDegree(
  graph: BoardGraph,
  visited: Uint8Array,
  id: number,
  currentId: number,
): number {
  let degree = 0;
  for (const nextId of graph.neighbors[id] ?? []) {
    if (visited[nextId] === 0 || nextId === currentId) degree++;
  }
  return degree;
}

function buildGraph(board: OneStrokeBoard): BoardGraph {
  const n = board.cells.length;
  const total = n * n;
  const active = new Uint8Array(total);
  const activeIds: number[] = [];
  const neighbors: number[][] = Array.from({ length: total }, () => []);

  for (let r = 0; r < n; r++) {
    const row = board.cells[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      if (!row[c]) continue;
      const id = encode(n, r, c);
      active[id] = 1;
      activeIds.push(id);
    }
  }

  for (const id of activeIds) {
    const [r, c] = decode(n, id);
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(n, nr, nc)) continue;
      const nextId = encode(n, nr, nc);
      if (active[nextId] === 1) neighbors[id]!.push(nextId);
    }
  }

  return {
    activeIds,
    active,
    neighbors,
    startId: encode(n, board.startRC[0], board.startRC[1]),
    endId: encode(n, board.endRC[0], board.endRC[1]),
  };
}

function pathToBoard(n: number, path: ReadonlyArray<readonly [number, number]>): OneStrokeBoard {
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

function countTurns(path: ReadonlyArray<readonly [number, number]>): number {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const a = path[i - 2]!;
    const b = path[i - 1]!;
    const c = path[i]!;
    if (a[0] - b[0] !== b[0] - c[0] || a[1] - b[1] !== b[1] - c[1]) turns++;
  }
  return turns;
}

function countForcedMoveRatio(board: OneStrokeBoard): number {
  if (board.path.length <= 2) return 1;

  const graph = buildGraph(board);
  const visited = new Uint8Array(graph.active.length);
  let forcedSteps = 0;
  let measuredSteps = 0;

  const first = board.path[0]!;
  visited[encode(board.cells.length, first[0], first[1])] = 1;

  for (let i = 1; i < board.path.length - 1; i++) {
    const current = board.path[i]!;
    const currentId = encode(board.cells.length, current[0], current[1]);
    visited[currentId] = 1;

    let availableMoves = 0;
    for (const nextId of graph.neighbors[currentId] ?? []) {
      if (visited[nextId] === 0) availableMoves++;
    }

    measuredSteps++;
    if (availableMoves <= 1) forcedSteps++;
  }

  return forcedSteps / measuredSteps;
}

function toBoardSize(n: number): BoardSize {
  if (n === 4 || n === 5 || n === 6 || n === 7) return n;
  return 6;
}

function randomInt(min: number, max: number, rand: RandomFn): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function encode(n: number, r: number, c: number): number {
  return r * n + c;
}

function decode(n: number, id: number): readonly [number, number] {
  return [Math.floor(id / n), id % n] as const;
}

function inBounds(n: number, r: number, c: number): boolean {
  return r >= 0 && r < n && c >= 0 && c < n;
}

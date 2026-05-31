/**
 * Queens 题面生成算法（纯函数、无 DOM）。
 *
 * 生成器现在走"构造 + 验证"路线：
 *   1. `generateQueens` 生成隐藏答案：每行/列 1 个 Queen，且相邻行不贴边。
 *   2. `generateRegions` 围绕隐藏答案构造 n 个四连通色块。
 *   3. `countSolutions` 精确验证唯一解。
 *   4. `solveWithLogic` 用可解释规则验证题面可逻辑推出。
 *   5. `buildPuzzles` 只接受通过验证的题面；失败保留 null，不再降级为非唯一题。
 */

import { range, shuffle, type RandomFn } from '../../core/rng.ts';

import type { QueensBoard } from './types.ts';

const ORTHOGONAL_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const enum CellState {
  Candidate,
  Blocked,
  Queen,
}

export type LogicRule =
  | 'unit-single'
  | 'locked-candidates'
  | 'hall-subset'
  | 'conflict-coverage'
  | 'assumption-contradiction';

export interface LogicStep {
  readonly rule: LogicRule;
  readonly action: 'place' | 'remove';
  readonly row: number;
  readonly col: number;
  readonly detail: string;
}

export interface LogicSolveResult {
  readonly solved: boolean;
  readonly contradiction: boolean;
  readonly queens: readonly number[];
  readonly steps: readonly LogicStep[];
}

type UnitKind = 'row' | 'column' | 'region';

interface LogicState {
  readonly n: number;
  readonly regions: QueensBoard;
  readonly cells: CellState[];
  readonly queensByRow: number[];
  readonly queensByColumn: number[];
  readonly queensByRegion: number[];
  readonly steps: LogicStep[];
  contradiction: boolean;
}

interface RegionCandidate {
  readonly regions: QueensBoard;
  readonly logic: LogicSolveResult;
  readonly score: number;
}

/** 放置 n 个 Queen；成功返回 `queens[row]=col`，失败返回 null。 */
export function generateQueens(n: number, rand: RandomFn = Math.random): number[] | null {
  const queens: number[] = new Array<number>(n).fill(-1);

  const place = (row: number): boolean => {
    if (row === n) return true;
    const cols = shuffle(range(n), rand);
    for (const col of cols) {
      let used = false;
      for (let i = 0; i < row; i++) {
        if (queens[i] === col) {
          used = true;
          break;
        }
      }
      if (used) continue;

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
 * 构造四连通色块。
 *
 * 色块 id 仍等于隐藏答案 Queen 的行号，保证 `regions[row][queens[row]] === row`。
 * 构造时按一个可逻辑推进的行顺序安排色块：第一个色块是单格起点，后续色块只能吸收
 * 已被更早 Queen 的行/列/相邻约束排除的格子。因此这些题面会被逻辑求解器逐步推出。
 */
export function generateRegions(
  n: number,
  queens: number[],
  rand: RandomFn = Math.random,
): QueensBoard {
  for (let attempt = 0; attempt < 24; attempt++) {
    const order = buildExpansionOrder(n, rand);
    const regions = buildCascadingRegions(n, queens, order, rand);
    if (regions) return regions;
  }

  return generateSeededRegions(n, queens, rand);
}

/** 解题数（最多 limit）。用于唯一解校验：limit=2 时 1 表示唯一。 */
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
      if (rid === undefined || rid < 0 || rid >= n || usedRegions[rid]) continue;
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

/** 用可解释规则求解；不使用递归搜索作为成功条件。 */
export function solveWithLogic(n: number, regions: QueensBoard): LogicSolveResult {
  const state = createLogicState(n, regions);

  let progressed = true;
  while (progressed && !state.contradiction && !isSolved(state)) {
    progressed =
      applyUnitSingles(state) ||
      applyLockedCandidates(state) ||
      applyHallSubsets(state) ||
      applyConflictCoverage(state) ||
      applyAssumptionContradictions(state);
  }

  if (hasUnitContradiction(state)) state.contradiction = true;

  return {
    solved: !state.contradiction && isSolved(state),
    contradiction: state.contradiction,
    queens: state.queensByRow.slice(),
    steps: state.steps.slice(),
  };
}

/** 反复尝试，直到生成"唯一且可逻辑推出"的题面。失败返回 null。 */
export function generatePuzzle(n: number, rand: RandomFn = Math.random): QueensBoard | null {
  const attempts = generationAttempts(n);
  let best: RegionCandidate | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const queens = generateQueens(n, rand);
    if (!queens) continue;

    for (let regionAttempt = 0; regionAttempt < 1; regionAttempt++) {
      const regions = generateRegions(n, queens, rand);
      if (!isValidGeneratedBoard(n, regions, queens)) continue;
      if (countSolutions(n, regions, 2) !== 1) continue;

      const logic = solveWithLogic(n, regions);
      if (!logic.solved) continue;

      const candidate = refineRegions(n, regions, queens, rand);
      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }
    }
  }

  return best?.regions ?? null;
}

/** 整本题册：pages × 6 题。生成失败保留空白占位，不再输出非唯一题。 */
export function buildPuzzles(
  n: number,
  pageCount: number,
  rand: RandomFn = Math.random,
): Array<Array<QueensBoard | null>> {
  const pages: Array<Array<QueensBoard | null>> = [];
  for (let p = 0; p < pageCount; p++) {
    const boards: Array<QueensBoard | null> = [];
    for (let b = 0; b < 6; b++) {
      boards.push(generatePuzzle(n, rand));
    }
    pages.push(boards);
  }
  return pages;
}

export function isConnectedRegions(n: number, regions: QueensBoard): boolean {
  for (let rid = 0; rid < n; rid++) {
    if (!isRegionConnected(n, boardToFlat(n, regions), rid)) return false;
  }
  return true;
}

function generationAttempts(n: number): number {
  if (n <= 6) return 2;
  if (n <= 8) return 3;
  return 4;
}

function idx(n: number, row: number, col: number): number {
  return row * n + col;
}

function rowOf(n: number, cell: number): number {
  return Math.floor(cell / n);
}

function colOf(n: number, cell: number): number {
  return cell % n;
}

function boardToFlat(n: number, regions: QueensBoard): number[] {
  const flat: number[] = [];
  for (let row = 0; row < n; row++) {
    const boardRow = regions[row];
    for (let col = 0; col < n; col++) {
      flat.push(boardRow?.[col] ?? -1);
    }
  }
  return flat;
}

function flatToBoard(n: number, flat: readonly number[]): QueensBoard {
  const out: number[][] = [];
  for (let row = 0; row < n; row++) {
    out.push(flat.slice(row * n, (row + 1) * n));
  }
  return out;
}

function buildExpansionOrder(n: number, rand: RandomFn): number[] {
  const start = Math.floor(rand() * n);
  const order = [start];
  let low = start;
  let high = start;

  while (order.length < n) {
    const canLow = low > 0;
    const canHigh = high < n - 1;
    if (canLow && (!canHigh || rand() < 0.5)) {
      low--;
      order.push(low);
    } else if (canHigh) {
      high++;
      order.push(high);
    } else if (canLow) {
      low--;
      order.push(low);
    }
  }

  return order;
}

function buildCascadingRegions(
  n: number,
  queens: readonly number[],
  order: readonly number[],
  rand: RandomFn,
): QueensBoard | null {
  if (queens.length !== n || order.length !== n) return null;

  const stepByRegion = new Array<number>(n).fill(-1);
  for (let step = 0; step < n; step++) {
    const rid = order[step];
    if (rid === undefined || rid < 0 || rid >= n) return null;
    stepByRegion[rid] = step;
  }
  if (stepByRegion.some((step) => step < 0)) return null;

  const queenCells = new Set<number>();
  for (let row = 0; row < n; row++) {
    const col = queens[row];
    if (col === undefined || col < 0 || col >= n) return null;
    queenCells.add(idx(n, row, col));
  }

  const lastRegion = order[n - 1];
  if (lastRegion === undefined) return null;
  const flat = new Array<number>(n * n).fill(lastRegion);
  for (let row = 0; row < n; row++) {
    const col = queens[row];
    if (col === undefined) return null;
    flat[idx(n, row, col)] = row;
  }

  if (!isRegionConnected(n, flat, lastRegion)) return null;

  const attackStep = buildAttackSteps(n, queens, order);
  const targetSize = n + 1;

  for (let step = 1; step < n - 1; step++) {
    const region = order[step];
    if (region === undefined) return null;
    growRegion(n, flat, region, step, targetSize, stepByRegion, attackStep, queenCells, rand);
  }

  if (!allRegionsConnected(n, flat)) return null;
  return flatToBoard(n, flat);
}

function buildAttackSteps(
  n: number,
  queens: readonly number[],
  order: readonly number[],
): number[] {
  const attackStep = new Array<number>(n * n).fill(Number.POSITIVE_INFINITY);
  for (let step = 0; step < order.length; step++) {
    const queenRow = order[step];
    const queenCol = queenRow === undefined ? undefined : queens[queenRow];
    if (queenRow === undefined || queenCol === undefined) continue;
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (
          row === queenRow ||
          col === queenCol ||
          (Math.abs(row - queenRow) <= 1 && Math.abs(col - queenCol) <= 1)
        ) {
          const cell = idx(n, row, col);
          attackStep[cell] = Math.min(attackStep[cell] ?? Number.POSITIVE_INFINITY, step);
        }
      }
    }
  }
  return attackStep;
}

function growRegion(
  n: number,
  flat: number[],
  region: number,
  step: number,
  targetSize: number,
  stepByRegion: readonly number[],
  attackStep: readonly number[],
  queenCells: ReadonlySet<number>,
  rand: RandomFn,
): void {
  let safety = n * n * n;
  while (countRegionCells(flat, region) < targetSize && safety-- > 0) {
    const candidates: number[] = [];
    for (let cell = 0; cell < flat.length; cell++) {
      if (flat[cell] === region || queenCells.has(cell)) continue;
      const owner = flat[cell];
      if (owner === undefined || (stepByRegion[owner] ?? -1) <= step) continue;
      if ((attackStep[cell] ?? Number.POSITIVE_INFINITY) >= step) continue;
      if (!touchesRegion(n, flat, cell, region)) continue;
      if (!canRemoveFromRegion(n, flat, cell)) continue;
      candidates.push(cell);
    }

    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(rand() * candidates.length)];
    if (pick === undefined) return;
    flat[pick] = region;
  }
}

function touchesRegion(n: number, flat: readonly number[], cell: number, region: number): boolean {
  const row = rowOf(n, cell);
  const col = colOf(n, cell);
  for (const [dr, dc] of ORTHOGONAL_DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
    if (flat[idx(n, nr, nc)] === region) return true;
  }
  return false;
}

function canRemoveFromRegion(n: number, flat: readonly number[], cell: number): boolean {
  const region = flat[cell];
  if (region === undefined) return false;
  const size = countRegionCells(flat, region);
  if (size <= 1) return false;
  return isRegionConnected(n, flat, region, cell);
}

function countRegionCells(flat: readonly number[], region: number): number {
  let count = 0;
  for (const value of flat) {
    if (value === region) count++;
  }
  return count;
}

function allRegionsConnected(n: number, flat: readonly number[]): boolean {
  for (let region = 0; region < n; region++) {
    if (!isRegionConnected(n, flat, region)) return false;
  }
  return true;
}

function isRegionConnected(
  n: number,
  flat: readonly number[],
  region: number,
  excludedCell = -1,
): boolean {
  let start = -1;
  let total = 0;
  for (let cell = 0; cell < flat.length; cell++) {
    if (cell === excludedCell || flat[cell] !== region) continue;
    total++;
    if (start === -1) start = cell;
  }
  if (total === 0) return false;

  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const cell = stack.pop();
    if (cell === undefined) continue;
    const row = rowOf(n, cell);
    const col = colOf(n, cell);
    for (const [dr, dc] of ORTHOGONAL_DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      const next = idx(n, nr, nc);
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (next === excludedCell || flat[next] !== region || seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }

  return seen.size === total;
}

function generateSeededRegions(n: number, queens: readonly number[], rand: RandomFn): QueensBoard {
  const flat: number[] = new Array<number>(n * n).fill(-1);
  const frontiers: Array<Array<readonly [number, number]>> = [];
  for (let i = 0; i < n; i++) frontiers.push([]);

  const addFrontier = (rid: number, row: number, col: number): void => {
    for (const [dr, dc] of ORTHOGONAL_DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (flat[idx(n, nr, nc)] !== -1) continue;
      frontiers[rid]?.push([nr, nc]);
    }
  };

  for (let row = 0; row < n; row++) {
    const col = queens[row];
    if (col === undefined || col < 0) continue;
    flat[idx(n, row, col)] = row;
    addFrontier(row, row, col);
  }

  let remaining = n * n - n;
  let safety = 100000;
  while (remaining > 0 && safety-- > 0) {
    let extended = false;
    for (const rid of shuffle(range(n), rand)) {
      const frontier = frontiers[rid];
      if (!frontier) continue;

      const live = frontier.filter(([row, col]) => flat[idx(n, row, col)] === -1);
      frontiers[rid] = live;
      if (live.length === 0) continue;

      const pickIndex = Math.floor(rand() * live.length);
      const pick = live[pickIndex];
      if (!pick) continue;
      live.splice(pickIndex, 1);

      flat[idx(n, pick[0], pick[1])] = rid;
      addFrontier(rid, pick[0], pick[1]);
      remaining--;
      extended = true;
      break;
    }
    if (!extended) break;
  }

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const cell = idx(n, row, col);
      if (flat[cell] !== -1) continue;
      for (const [dr, dc] of ORTHOGONAL_DIRS) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
        const value = flat[idx(n, nr, nc)];
        if (value !== undefined && value !== -1) {
          flat[cell] = value;
          break;
        }
      }
    }
  }

  return flatToBoard(n, flat);
}

function isValidGeneratedBoard(
  n: number,
  regions: QueensBoard,
  queens: readonly number[],
): boolean {
  if (regions.length !== n) return false;
  const queenCountByRegion = new Array<number>(n).fill(0);

  for (let row = 0; row < n; row++) {
    const boardRow = regions[row];
    if (!boardRow || boardRow.length !== n) return false;
    for (let col = 0; col < n; col++) {
      const region = boardRow[col];
      if (region === undefined || region < 0 || region >= n) return false;
    }

    const queenCol = queens[row];
    if (queenCol === undefined || queenCol < 0 || queenCol >= n) return false;
    const queenRegion = boardRow[queenCol];
    if (queenRegion === undefined) return false;
    queenCountByRegion[queenRegion] = (queenCountByRegion[queenRegion] ?? 0) + 1;
  }

  return queenCountByRegion.every((count) => count === 1) && isConnectedRegions(n, regions);
}

function scorePuzzle(n: number, regions: QueensBoard, logic: LogicSolveResult): number {
  const sizes = new Array<number>(n).fill(0);
  let boundaries = 0;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const region = regions[row]?.[col] ?? 0;
      sizes[region] = (sizes[region] ?? 0) + 1;
      if (row + 1 < n && regions[row + 1]?.[col] !== region) boundaries++;
      if (col + 1 < n && regions[row]?.[col + 1] !== region) boundaries++;
    }
  }

  const balancePenalty = sizes.reduce((sum, size) => sum + Math.abs(size - n), 0);
  const tinyPenalty = sizes.filter((size) => size <= 1).length * n;
  const ruleVariety = new Set(logic.steps.map((step) => step.rule)).size;
  const advancedSteps = logic.steps.filter((step) => step.rule !== 'unit-single').length;

  return (
    boundaries +
    ruleVariety * n +
    advancedSteps * 30 +
    logic.steps.length * 2 -
    balancePenalty * 2 -
    tinyPenalty
  );
}

function refineRegions(
  n: number,
  regions: QueensBoard,
  queens: readonly number[],
  rand: RandomFn,
): RegionCandidate | null {
  const initialLogic = solveWithLogic(n, regions);
  if (!initialLogic.solved) return null;

  const flat = boardToFlat(n, regions);
  const queenCells = new Set<number>();
  for (let row = 0; row < n; row++) {
    const col = queens[row];
    if (col === undefined) return null;
    queenCells.add(idx(n, row, col));
  }

  let currentRegions = regions;
  let currentLogic = initialLogic;
  let currentScore = scorePuzzle(n, currentRegions, currentLogic);
  let best: RegionCandidate = { regions: currentRegions, logic: currentLogic, score: currentScore };
  const rounds = n <= 6 ? 8 : n <= 8 ? 10 : 12;

  for (let round = 0; round < rounds; round++) {
    const move = pickBoundaryMove(n, flat, queenCells, rand);
    if (!move) break;

    const previousRegion = flat[move.cell];
    if (previousRegion === undefined) continue;
    flat[move.cell] = move.toRegion;

    const nextRegions = flatToBoard(n, flat);
    if (!isValidGeneratedBoard(n, nextRegions, queens)) {
      flat[move.cell] = previousRegion;
      continue;
    }

    const nextLogic = solveWithLogic(n, nextRegions);
    if (!nextLogic.solved || countSolutions(n, nextRegions, 2) !== 1) {
      flat[move.cell] = previousRegion;
      continue;
    }

    const nextScore = scorePuzzle(n, nextRegions, nextLogic);
    const accept = nextScore >= currentScore || rand() < 0.08;
    if (!accept) {
      flat[move.cell] = previousRegion;
      continue;
    }

    currentRegions = nextRegions;
    currentLogic = nextLogic;
    currentScore = nextScore;
    if (nextScore > best.score) {
      best = { regions: currentRegions, logic: currentLogic, score: currentScore };
    }
  }

  return best;
}

function pickBoundaryMove(
  n: number,
  flat: readonly number[],
  queenCells: ReadonlySet<number>,
  rand: RandomFn,
): { readonly cell: number; readonly toRegion: number } | null {
  const candidates: Array<{ readonly cell: number; readonly toRegion: number }> = [];

  for (let cell = 0; cell < flat.length; cell++) {
    if (queenCells.has(cell) || !canRemoveFromRegion(n, flat, cell)) continue;

    const fromRegion = flat[cell];
    if (fromRegion === undefined) continue;

    const row = rowOf(n, cell);
    const col = colOf(n, cell);
    const neighborRegions: number[] = [];
    for (const [dr, dc] of ORTHOGONAL_DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      const neighborRegion = flat[idx(n, nr, nc)];
      if (
        neighborRegion === undefined ||
        neighborRegion === fromRegion ||
        neighborRegions.includes(neighborRegion)
      ) {
        continue;
      }
      neighborRegions.push(neighborRegion);
    }

    for (const toRegion of neighborRegions) {
      candidates.push({ cell, toRegion });
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rand() * candidates.length)] ?? null;
}

function createLogicState(n: number, regions: QueensBoard): LogicState {
  return {
    n,
    regions,
    cells: new Array<CellState>(n * n).fill(CellState.Candidate),
    queensByRow: new Array<number>(n).fill(-1),
    queensByColumn: new Array<number>(n).fill(-1),
    queensByRegion: new Array<number>(n).fill(-1),
    steps: [],
    contradiction: false,
  };
}

function cloneLogicState(state: LogicState): LogicState {
  return {
    n: state.n,
    regions: state.regions,
    cells: state.cells.slice(),
    queensByRow: state.queensByRow.slice(),
    queensByColumn: state.queensByColumn.slice(),
    queensByRegion: state.queensByRegion.slice(),
    steps: state.steps.slice(),
    contradiction: state.contradiction,
  };
}

function isSolved(state: LogicState): boolean {
  return state.queensByRow.every((col) => col >= 0);
}

function hasUnitContradiction(state: LogicState): boolean {
  for (const kind of unitKinds()) {
    for (let id = 0; id < state.n; id++) {
      if (!unitHasQueen(state, kind, id) && unitCandidates(state, kind, id).length === 0) {
        return true;
      }
    }
  }
  return false;
}

function unitKinds(): readonly UnitKind[] {
  return ['row', 'column', 'region'];
}

function unitName(kind: UnitKind, id: number): string {
  if (kind === 'row') return `row ${id + 1}`;
  if (kind === 'column') return `column ${id + 1}`;
  return `region ${id + 1}`;
}

function unitHasQueen(state: LogicState, kind: UnitKind, id: number): boolean {
  if (kind === 'row') return (state.queensByRow[id] ?? -1) >= 0;
  if (kind === 'column') return (state.queensByColumn[id] ?? -1) >= 0;
  return (state.queensByRegion[id] ?? -1) >= 0;
}

function unitCandidates(state: LogicState, kind: UnitKind, id: number): number[] {
  if (unitHasQueen(state, kind, id)) return [];

  const cells: number[] = [];
  for (let cell = 0; cell < state.cells.length; cell++) {
    if (state.cells[cell] !== CellState.Candidate) continue;
    if (cellUnitId(state, kind, cell) === id) cells.push(cell);
  }
  return cells;
}

function cellUnitId(state: LogicState, kind: UnitKind, cell: number): number {
  if (kind === 'row') return rowOf(state.n, cell);
  if (kind === 'column') return colOf(state.n, cell);
  return state.regions[rowOf(state.n, cell)]?.[colOf(state.n, cell)] ?? -1;
}

function placeQueen(state: LogicState, cell: number, rule: LogicRule, detail: string): boolean {
  if (state.contradiction) return false;
  if (state.cells[cell] === CellState.Blocked) {
    state.contradiction = true;
    return false;
  }
  if (state.cells[cell] === CellState.Queen) return false;

  const row = rowOf(state.n, cell);
  const col = colOf(state.n, cell);
  const region = state.regions[row]?.[col] ?? -1;
  if (
    region < 0 ||
    (state.queensByRow[row] ?? -1) >= 0 ||
    (state.queensByColumn[col] ?? -1) >= 0 ||
    (state.queensByRegion[region] ?? -1) >= 0
  ) {
    state.contradiction = true;
    return false;
  }

  state.cells[cell] = CellState.Queen;
  state.queensByRow[row] = col;
  state.queensByColumn[col] = row;
  state.queensByRegion[region] = cell;
  state.steps.push({ rule, action: 'place', row, col, detail });

  for (let other = 0; other < state.cells.length; other++) {
    if (other === cell || state.cells[other] !== CellState.Candidate) continue;
    if (queenConflicts(state, cell, other)) {
      state.cells[other] = CellState.Blocked;
    }
  }

  if (hasUnitContradiction(state)) state.contradiction = true;
  return true;
}

function removeCandidate(
  state: LogicState,
  cell: number,
  rule: LogicRule,
  detail: string,
): boolean {
  if (state.contradiction || state.cells[cell] !== CellState.Candidate) return false;
  state.cells[cell] = CellState.Blocked;
  state.steps.push({
    rule,
    action: 'remove',
    row: rowOf(state.n, cell),
    col: colOf(state.n, cell),
    detail,
  });
  if (hasUnitContradiction(state)) state.contradiction = true;
  return true;
}

function queenConflicts(state: LogicState, a: number, b: number): boolean {
  const ar = rowOf(state.n, a);
  const ac = colOf(state.n, a);
  const br = rowOf(state.n, b);
  const bc = colOf(state.n, b);
  return (
    ar === br ||
    ac === bc ||
    (state.regions[ar]?.[ac] ?? -1) === (state.regions[br]?.[bc] ?? -2) ||
    (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1)
  );
}

function applyUnitSingles(state: LogicState): boolean {
  for (const kind of unitKinds()) {
    for (let id = 0; id < state.n; id++) {
      const candidates = unitCandidates(state, kind, id);
      if (candidates.length === 1) {
        const cell = candidates[0];
        if (cell === undefined) continue;
        return placeQueen(state, cell, 'unit-single', `${unitName(kind, id)} has one candidate`);
      }
    }
  }
  return false;
}

function applyLockedCandidates(state: LogicState): boolean {
  for (const sourceKind of unitKinds()) {
    for (const targetKind of unitKinds()) {
      if (sourceKind === targetKind) continue;
      for (let sourceId = 0; sourceId < state.n; sourceId++) {
        const candidates = unitCandidates(state, sourceKind, sourceId);
        if (candidates.length <= 1) continue;

        const targetIds = uniqueIds(candidates.map((cell) => cellUnitId(state, targetKind, cell)));
        if (targetIds.length !== 1) continue;

        const targetId = targetIds[0];
        if (targetId === undefined || unitHasQueen(state, targetKind, targetId)) continue;

        for (const cell of unitCandidates(state, targetKind, targetId)) {
          if (cellUnitId(state, sourceKind, cell) === sourceId) continue;
          if (
            removeCandidate(
              state,
              cell,
              'locked-candidates',
              `${unitName(sourceKind, sourceId)} is locked in ${unitName(targetKind, targetId)}`,
            )
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function applyHallSubsets(state: LogicState): boolean {
  for (const sourceKind of unitKinds()) {
    for (const targetKind of unitKinds()) {
      if (sourceKind === targetKind) continue;
      const sourceIds = range(state.n).filter((id) => !unitHasQueen(state, sourceKind, id));
      for (let size = 2; size <= Math.min(4, sourceIds.length); size++) {
        const subsets = combinations(sourceIds, size);
        for (const subset of subsets) {
          const targetIds = new Set<number>();
          let valid = true;
          for (const sourceId of subset) {
            const candidates = unitCandidates(state, sourceKind, sourceId);
            if (candidates.length === 0) {
              valid = false;
              break;
            }
            for (const cell of candidates) targetIds.add(cellUnitId(state, targetKind, cell));
          }
          if (!valid || targetIds.size !== size) continue;

          for (const targetId of targetIds) {
            if (unitHasQueen(state, targetKind, targetId)) continue;
            for (const cell of unitCandidates(state, targetKind, targetId)) {
              if (subset.includes(cellUnitId(state, sourceKind, cell))) continue;
              if (
                removeCandidate(
                  state,
                  cell,
                  'hall-subset',
                  `${size} ${sourceKind} units claim ${size} ${targetKind} units`,
                )
              ) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

function applyConflictCoverage(state: LogicState): boolean {
  for (let cell = 0; cell < state.cells.length; cell++) {
    if (state.cells[cell] !== CellState.Candidate) continue;

    for (const kind of unitKinds()) {
      for (let id = 0; id < state.n; id++) {
        if (unitHasQueen(state, kind, id) || cellUnitId(state, kind, cell) === id) continue;
        const candidates = unitCandidates(state, kind, id);
        if (candidates.length === 0) continue;
        if (candidates.every((other) => queenConflicts(state, cell, other))) {
          return removeCandidate(
            state,
            cell,
            'conflict-coverage',
            `candidate blocks every option in ${unitName(kind, id)}`,
          );
        }
      }
    }
  }
  return false;
}

function applyAssumptionContradictions(state: LogicState): boolean {
  for (let cell = 0; cell < state.cells.length; cell++) {
    if (state.cells[cell] !== CellState.Candidate) continue;

    const assumed = cloneLogicState(state);
    placeQueen(assumed, cell, 'assumption-contradiction', 'temporary assumption');
    let progressed = true;
    while (progressed && !assumed.contradiction && !isSolved(assumed)) {
      progressed = applyUnitSingles(assumed);
    }
    if (assumed.contradiction || hasUnitContradiction(assumed)) {
      return removeCandidate(
        state,
        cell,
        'assumption-contradiction',
        'assuming this candidate leads to contradiction',
      );
    }
  }
  return false;
}

function uniqueIds(ids: readonly number[]): number[] {
  const out: number[] = [];
  for (const id of ids) {
    if (id < 0 || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

function combinations(values: readonly number[], size: number): number[][] {
  const out: number[][] = [];
  const pick: number[] = [];

  const visit = (start: number): void => {
    if (pick.length === size) {
      out.push(pick.slice());
      return;
    }
    for (let i = start; i < values.length; i++) {
      const value = values[i];
      if (value === undefined) continue;
      pick.push(value);
      visit(i + 1);
      pick.pop();
    }
  };

  visit(0);
  return out;
}

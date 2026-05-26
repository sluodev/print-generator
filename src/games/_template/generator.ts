// TODO: 替换成你的题面生成算法。
// 当前实现：每题填随机颜色，作为接口走通的最小 demo。

import type { RandomFn } from '../../core/rng.ts';

import type { TemplateBoard } from './types.ts';

const PALETTE = [
  '#fde68a', // amber-200
  '#fca5a5', // red-300
  '#a7f3d0', // emerald-200
  '#bfdbfe', // blue-200
  '#ddd6fe', // violet-200
];

/** 生成单题：n × n 个随机颜色。 */
export function generateBoard(n: number, rand: RandomFn = Math.random): TemplateBoard {
  const board: string[][] = [];
  for (let r = 0; r < n; r++) {
    const row: string[] = [];
    for (let c = 0; c < n; c++) {
      row.push(PALETTE[Math.floor(rand() * PALETTE.length)] ?? '#000');
    }
    board.push(row);
  }
  return board;
}

/** 多题多页。生成失败可以 push null（外壳会画空白占位）。 */
export function buildPuzzles(
  n: number,
  pageCount: number,
  rand: RandomFn = Math.random,
): Array<Array<TemplateBoard | null>> {
  const pages: Array<Array<TemplateBoard | null>> = [];
  for (let p = 0; p < pageCount; p++) {
    const boards: Array<TemplateBoard | null> = [];
    for (let b = 0; b < 6; b++) {
      boards.push(generateBoard(n, rand));
    }
    pages.push(boards);
  }
  return pages;
}

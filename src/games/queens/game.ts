import type { Game } from '../../core/game.ts';

import { buildPuzzles } from './generator.ts';
import { drawQueensPDF } from './pdf.ts';
import { renderQueensSVG } from './render.ts';
import type { QueensBoard, QueensConfig } from './types.ts';

export const queensGame: Game<QueensConfig, QueensBoard> = {
  id: 'queens',
  title: 'Queens 题纸生成器',
  description: 'N×N 棋盘上每行/列各放一个皇后，且每个色块也放且仅放 1 个；唯一解题面随机生成。',
  storageKey: 'queens-print-generator:v3',
  filenameKind: 'queens',

  controls: [
    {
      kind: 'select',
      id: 'size',
      label: '棋盘',
      options: [
        { value: '5', label: '5 × 5' },
        { value: '6', label: '6 × 6' },
        { value: '7', label: '7 × 7' },
        { value: '8', label: '8 × 8' },
        { value: '9', label: '9 × 9' },
      ],
      default: '6',
      triggersRegenerate: true,
    },
    {
      kind: 'number',
      id: 'pages',
      label: '页数',
      min: 1,
      max: 50,
      step: 1,
      default: 3,
    },
    {
      kind: 'text',
      id: 'prefix',
      label: '文件名前缀（PDF 用，可选）',
      placeholder: '例如：1班',
      maxLength: 40,
      default: '',
      fullRow: true,
    },
  ],

  readConfig(raw): QueensConfig {
    return {
      size: clampInt(raw.size, 5, 9, 6),
      pages: clampInt(raw.pages, 1, 50, 3),
      prefix: raw.prefix ?? '',
    };
  },

  build(cfg) {
    return buildPuzzles(cfg.size, cfg.pages);
  },

  renderSVG(board, cfg) {
    return renderQueensSVG(board, cfg.size);
  },

  drawPDF(doc, board, ctx, cfg) {
    drawQueensPDF(doc, board, cfg.size, ctx.x, ctx.y, ctx.size);
  },

  filenameSize(cfg) {
    return `${cfg.size}x${cfg.size}`;
  },
};

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

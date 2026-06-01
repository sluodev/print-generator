import type { Game } from '../../core/game.ts';

import { buildPuzzles } from './generator.ts';
import { drawOneStrokePDF } from './pdf.ts';
import { renderOneStrokeSVG } from './render.ts';
import {
  type Difficulty,
  type MarkMode,
  type OneStrokeBoard,
  type OneStrokeConfig,
} from './types.ts';

export const oneStrokeGame: Game<OneStrokeConfig, OneStrokeBoard> = {
  id: 'one-stroke',
  title: '一笔画题纸生成器',
  description: '从起点出发，不重复地走完所有激活格；4-邻接移动，构造性保证有解。',
  storageKey: 'one-stroke-print-generator:v2',
  filenameKind: 'onestroke',

  controls: [
    {
      kind: 'select',
      id: 'size',
      label: '棋盘',
      options: [
        { value: '4', label: '4 × 4' },
        { value: '5', label: '5 × 5' },
        { value: '6', label: '6 × 6' },
        { value: '7', label: '7 × 7' },
      ],
      default: '6',
      triggersRegenerate: true,
    },
    {
      kind: 'select',
      id: 'difficulty',
      label: '难度',
      options: [
        { value: 'easy', label: '简单（基础分支）' },
        { value: 'medium', label: '中等（深层分支）' },
        { value: 'hard', label: '困难（高干扰少解）' },
      ],
      default: 'medium',
      triggersRegenerate: true,
    },
    {
      kind: 'select',
      id: 'markMode',
      label: '起终点标记',
      options: [
        { value: 'start', label: '仅起点' },
        { value: 'both', label: '起点 + 终点' },
        { value: 'none', label: '不标' },
      ],
      default: 'start',
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

  readConfig(raw): OneStrokeConfig {
    return {
      size: clampInt(raw.size, 4, 7, 6),
      difficulty: parseDifficulty(raw.difficulty),
      markMode: parseMarkMode(raw.markMode),
      pages: clampInt(raw.pages, 1, 50, 3),
      prefix: raw.prefix ?? '',
    };
  },

  build(cfg) {
    return buildPuzzles(cfg.size, cfg.difficulty, cfg.markMode, cfg.pages);
  },

  renderSVG(board, cfg) {
    return renderOneStrokeSVG(board, cfg.size, cfg.markMode);
  },

  drawPDF(doc, board, ctx, cfg) {
    drawOneStrokePDF(doc, board, cfg.size, ctx.x, ctx.y, ctx.size, cfg.markMode);
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

function parseDifficulty(raw: string | undefined): Difficulty {
  if (raw === 'easy' || raw === 'medium' || raw === 'hard') return raw;
  return 'medium';
}

function parseMarkMode(raw: string | undefined): MarkMode {
  if (raw === 'start' || raw === 'both' || raw === 'none') return raw;
  return 'start';
}

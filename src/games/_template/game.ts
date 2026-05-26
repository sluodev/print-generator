// TODO: 改名 / 改控件 / 改文案 / 改 storageKey 等。

import type { Game } from '../../core/game.ts';

import { buildPuzzles } from './generator.ts';
import { drawTemplatePDF } from './pdf.ts';
import { renderTemplateSVG } from './render.ts';
import type { TemplateBoard, TemplateConfig } from './types.ts';

export const templateGame: Game<TemplateConfig, TemplateBoard> = {
  // TODO: 改成你的游戏 id（kebab-case，与目录名一致）。
  id: '_template',
  // TODO: 改成你的游戏标题（会显示在浏览器标签和首页）。
  title: '模板游戏',
  // TODO: 一句话描述，会出现在首页卡片副标题。
  description: '游戏脚手架最小可运行示例。复制本目录、改名、实现真正的算法。',
  // TODO: 持久化 key，建议带版本号，方便后续平滑迁移。
  storageKey: 'template-print-generator:v1',
  // TODO: PDF 文件名标识，例如 'queens' / 'onestroke'。
  filenameKind: 'template',

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
      default: '5',
      // 切换棋盘尺寸时立即重新生成；其它控件可以按需开关。
      triggersRegenerate: true,
    },
    {
      kind: 'number',
      id: 'pages',
      label: '页数',
      min: 1,
      max: 50,
      step: 1,
      default: 1,
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

  // 把 DOM 字符串值转成强类型配置；这里一并做范围 clamp。
  readConfig(raw): TemplateConfig {
    return {
      size: clampInt(raw.size, 4, 7, 5),
      pages: clampInt(raw.pages, 1, 50, 1),
      prefix: raw.prefix ?? '',
    };
  },

  build(cfg) {
    return buildPuzzles(cfg.size, cfg.pages);
  },

  renderSVG(board, cfg) {
    return renderTemplateSVG(board, cfg.size);
  },

  drawPDF(doc, board, ctx, cfg) {
    drawTemplatePDF(doc, board, cfg.size, ctx.x, ctx.y, ctx.size);
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

/**
 * 游戏插件契约。新增游戏时实现此接口并注册到 `src/games.config.ts`。
 *
 * 设计原则：
 *   - 接口保持小而稳定，让 Agent / 新成员看完类型就能补全。
 *   - 控件用声明式 `ControlSpec[]`，外壳代为渲染、读值、持久化、自动重生成。
 *   - 数据 / 渲染 / PDF 三步分离，方便单独写单测。
 *
 * 新增游戏的最小步骤（详见 AGENTS.md）：
 *   1. 在 `src/games/<id>/` 写 `entry.ts / generator.ts / render.ts / pdf.ts`
 *   2. `entry.ts` 用 `createApp(myGame)` 启动
 *   3. 顶层放 `<id>/index.html` 引用 `entry.ts`
 *   4. `vite.config.ts` 注册多页入口
 *   5. `src/games.config.ts` 注册到首页列表
 */

import type { jsPDF } from 'jspdf';

/** 题纸级别的元信息，用于首页卡片、文件名、持久化 key 等。 */
export interface GameMeta {
  /** 游戏唯一 id（kebab-case），与目录名一致。 */
  readonly id: string;
  /** 显示标题（首页卡片 / 题纸标题 / PDF 元数据）。 */
  readonly title: string;
  /** 一句话描述，用于首页卡片副标题。 */
  readonly description: string;
  /** localStorage 持久化 key，建议含版本号便于平滑迁移。 */
  readonly storageKey: string;
  /** PDF 文件名标识，例如 'queens'、'onestroke'。 */
  readonly filenameKind: string;
}

/** Select 下拉控件。 */
export interface SelectControlSpec {
  readonly kind: 'select';
  readonly id: string;
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly default: string;
  readonly triggersRegenerate?: boolean;
  readonly fullRow?: boolean;
}

/** 数值输入控件。 */
export interface NumberControlSpec {
  readonly kind: 'number';
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
  readonly triggersRegenerate?: boolean;
  readonly fullRow?: boolean;
}

/** 文本输入控件。 */
export interface TextControlSpec {
  readonly kind: 'text';
  readonly id: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly default: string;
  readonly triggersRegenerate?: boolean;
  readonly fullRow?: boolean;
}

export type ControlSpec = SelectControlSpec | NumberControlSpec | TextControlSpec;

/** PDF 单题绘制时的位置上下文（左上角 + 边长，单位 mm）。 */
export interface PDFDrawCtx {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/**
 * 题纸生成器主接口。`TConfig` 由游戏自己声明。
 *
 * - `readConfig` 把 DOM 字符串值 → 强类型配置（含数值范围 clamp 等）
 * - `build` 生成所有页的所有题，返回二维数组 [page][board]，null 表示该题失败（外壳会留空白占位）
 * - `renderSVG` 单题屏幕渲染
 * - `drawPDF` 单题 PDF 渲染（公用页眉由外壳画）
 */
export interface Game<TConfig, TBoardData> extends GameMeta {
  readonly controls: readonly ControlSpec[];

  /** 把控件的 DOM 字符串值转成强类型配置。同时负责输入校验 / clamp。 */
  readConfig(rawValues: Readonly<Record<string, string>>): TConfig;

  /** 生成全部页面的题面数据。返回 [pages][boardsPerPage]。 */
  build(cfg: TConfig): Array<Array<TBoardData | null>>;

  /** 单题屏幕渲染 → 返回一个独立的 SVG 节点（外壳负责把它放进 .boards-grid）。 */
  renderSVG(data: TBoardData, cfg: TConfig): SVGSVGElement;

  /** 单题 PDF 渲染。`ctx` 是外壳算好的位置 / 大小。 */
  drawPDF(doc: jsPDF, data: TBoardData, ctx: PDFDrawCtx, cfg: TConfig): void;

  /**
   * 用配置反推 PDF 文件名"size"段。
   * 例如 Queens 返回 '6x6'，One-Stroke 返回 '6x6'。
   * 不强制唯一格式，但建议跟控件中"棋盘大小"语义一致，便于人眼识别下载文件。
   */
  filenameSize(cfg: TConfig): string;
}

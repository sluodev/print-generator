/**
 * 一笔画的视觉常量（屏幕 / PDF 共用）。
 *
 * 默认配色为"软蓝底 + 翠绿起点 / 琥珀终点"——
 * 普通格浅蓝便于纸上手写、起点用 emerald-500（"出发"语义直观）、终点用 amber-500（与绿色对比强、对色弱友好）。
 *
 * 想换风格可整体替换以下四个 hex：
 *   样图同款冷灰蓝：ACTIVE='#cdd9e1' START='#475569' END='#94a3b8' BORDER='#94a3b8'
 *   暖色奶油：    ACTIVE='#fef3c7' START='#b45309' END='#f97316' BORDER='#d6d3d1'
 *   薄荷绿：      ACTIVE='#d1fae5' START='#065f46' END='#14b8a6' BORDER='#a7f3d0'
 *   粉紫：        ACTIVE='#ede9fe' START='#6d28d9' END='#ec4899' BORDER='#c4b5fd'
 */
export const STYLE = {
  ACTIVE: '#dbeafe',
  START: '#10b981',
  END: '#f59e0b',
  BORDER: '#94a3b8',

  /** 格间留白 / 单元格边长。 */
  CELL_GAP_RATIO: 0.1,
  /** 格圆角半径 / 内格边长。 */
  CELL_RADIUS_RATIO: 0.18,

  /** 外边框线宽（viewBox 单位）。 */
  BORDER_STROKE_VB: 0.05,
  /** 外边框圆角半径 / 棋盘总边长。 */
  BORDER_RADIUS_RATIO: 0.05,
  /** PDF 外边框线宽（mm）。 */
  BORDER_STROKE_MM: 0.5,
} as const;

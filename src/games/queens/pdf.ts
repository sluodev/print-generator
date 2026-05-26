/**
 * Queens PDF 渲染：与屏幕 SVG 视觉等价，参数走 mm。
 *   - 内部线宽 0.15 mm（与原版一致）
 *   - 外框线宽 0.30 mm
 *   - 颜色用 hexToRgb 解析后 setFillColor
 */

import type { jsPDF } from 'jspdf';

import { hexToRgb } from '../../core/format.ts';
import { setFill, setStroke } from '../../core/pdf.ts';

import { COLORS } from './colors.ts';
import type { QueensBoard } from './types.ts';

const BLACK = { r: 17, g: 17, b: 17 } as const;
const INNER_LINE_MM = 0.15;
const OUTER_LINE_MM = 0.3;

export function drawQueensPDF(
  doc: jsPDF,
  regions: QueensBoard,
  n: number,
  x: number,
  y: number,
  size: number,
): void {
  const cell = size / n;

  // 1) 彩色格子
  for (let r = 0; r < n; r++) {
    const row = regions[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      const id = row[c] ?? 0;
      setFill(doc, hexToRgb(COLORS[id % COLORS.length] ?? '#000000'));
      doc.rect(x + c * cell, y + r * cell, cell, cell, 'F');
    }
  }

  // 2) 内部网格线
  setStroke(doc, BLACK);
  doc.setLineWidth(INNER_LINE_MM);
  for (let i = 1; i < n; i++) {
    doc.line(x + i * cell, y, x + i * cell, y + size); // 垂直
    doc.line(x, y + i * cell, x + size, y + i * cell); // 水平
  }

  // 3) 外框
  doc.setLineWidth(OUTER_LINE_MM);
  doc.rect(x, y, size, size, 'S');
}

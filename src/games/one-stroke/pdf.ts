/**
 * 一笔画 PDF 渲染：圆角矩形填色 + 外边框。
 * 与屏幕 SVG 同一组比例（gap / radius）。
 */

import type { jsPDF } from 'jspdf';

import { hexToRgb } from '../../core/format.ts';
import { setFill, setStroke } from '../../core/pdf.ts';

import { fillForCell } from './render.ts';
import { STYLE } from './style.ts';
import type { MarkMode, OneStrokeBoard } from './types.ts';

export function drawOneStrokePDF(
  doc: jsPDF,
  board: OneStrokeBoard,
  n: number,
  x: number,
  y: number,
  size: number,
  markMode: MarkMode,
): void {
  const cell = size / n;
  const gap = STYLE.CELL_GAP_RATIO * cell;
  const inner = cell - gap;
  const rx = inner * STYLE.CELL_RADIUS_RATIO;

  doc.setLineWidth(0); // 仅填色，无边线
  for (let r = 0; r < n; r++) {
    const row = board.cells[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      if (!row[c]) continue;
      setFill(doc, hexToRgb(fillForCell(board, r, c, markMode)));
      doc.roundedRect(x + c * cell + gap / 2, y + r * cell + gap / 2, inner, inner, rx, rx, 'F');
    }
  }

  // 外边框
  setStroke(doc, hexToRgb(STYLE.BORDER));
  doc.setLineWidth(STYLE.BORDER_STROKE_MM);
  const br = size * STYLE.BORDER_RADIUS_RATIO;
  doc.roundedRect(x, y, size, size, br, br, 'S');
}

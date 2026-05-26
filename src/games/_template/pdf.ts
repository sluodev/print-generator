// TODO: 替换成你的 PDF 渲染逻辑。

import type { jsPDF } from 'jspdf';

import { hexToRgb } from '../../core/format.ts';
import { setFill } from '../../core/pdf.ts';

import type { TemplateBoard } from './types.ts';

export function drawTemplatePDF(
  doc: jsPDF,
  board: TemplateBoard,
  n: number,
  x: number,
  y: number,
  size: number,
): void {
  const cell = size / n;
  for (let r = 0; r < n; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      setFill(doc, hexToRgb(row[c] ?? '#000'));
      doc.rect(x + c * cell, y + r * cell, cell, cell, 'F');
    }
  }
}

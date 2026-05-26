/**
 * 一笔画屏幕渲染：仅画激活格 + 起点/终点高亮 + 外边框。
 */

import { STYLE } from './style.ts';
import type { MarkMode, OneStrokeBoard } from './types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

function fillForCell(board: OneStrokeBoard, r: number, c: number, markMode: MarkMode): string {
  const [sr, sc] = board.startRC;
  const [er, ec] = board.endRC;
  if (r === sr && c === sc) {
    if (markMode === 'start' || markMode === 'both') return STYLE.START;
  } else if (r === er && c === ec && markMode === 'both') {
    return STYLE.END;
  }
  return STYLE.ACTIVE;
}

export function renderOneStrokeSVG(
  board: OneStrokeBoard,
  n: number,
  markMode: MarkMode,
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'board');
  svg.setAttribute('xmlns', SVG_NS);
  // 外扩 stroke/2 防止外框线宽外侧被裁
  const pad = STYLE.BORDER_STROKE_VB;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${n + 2 * pad} ${n + 2 * pad}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('shape-rendering', 'geometricPrecision');

  const gap = STYLE.CELL_GAP_RATIO;
  const inner = 1 - gap;
  const rx = inner * STYLE.CELL_RADIUS_RATIO;

  for (let r = 0; r < n; r++) {
    const row = board.cells[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      if (!row[c]) continue;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(c + gap / 2));
      rect.setAttribute('y', String(r + gap / 2));
      rect.setAttribute('width', String(inner));
      rect.setAttribute('height', String(inner));
      rect.setAttribute('rx', String(rx));
      rect.setAttribute('ry', String(rx));
      rect.setAttribute('fill', fillForCell(board, r, c, markMode));
      svg.appendChild(rect);
    }
  }

  // 外边框
  const border = document.createElementNS(SVG_NS, 'rect');
  const borderR = n * STYLE.BORDER_RADIUS_RATIO;
  border.setAttribute('x', '0');
  border.setAttribute('y', '0');
  border.setAttribute('width', String(n));
  border.setAttribute('height', String(n));
  border.setAttribute('rx', String(borderR));
  border.setAttribute('ry', String(borderR));
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', STYLE.BORDER);
  border.setAttribute('stroke-width', String(STYLE.BORDER_STROKE_VB));
  svg.appendChild(border);

  return svg;
}

export { fillForCell };

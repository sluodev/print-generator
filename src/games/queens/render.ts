/**
 * Queens 屏幕渲染：单题 → 一个 SVG 节点。
 *
 * 视觉细节：
 *   - 所有内部线条来自一条 `<path>`，stroke-width 严格一致，避免低 DPI 抖动
 *   - 外框单独一条粗线（外框宽度 = 内线宽度 × 2）
 *   - viewBox 向外扩 stroke/2 防止外框被裁
 *   - shape-rendering: geometricPrecision 让低 DPI 下亚像素渲染均匀
 */

import { COLORS } from './colors.ts';
import type { QueensBoard } from './types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const OUTER_STROKE = 0.045; // viewBox 单位
const INNER_STROKE = OUTER_STROKE / 2;

export function renderQueensSVG(regions: QueensBoard, n: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'board');
  svg.setAttribute('xmlns', SVG_NS);
  const pad = OUTER_STROKE;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${n + 2 * pad} ${n + 2 * pad}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('shape-rendering', 'geometricPrecision');

  // 1) 彩色格子
  const cells = document.createElementNS(SVG_NS, 'g');
  for (let r = 0; r < n; r++) {
    const row = regions[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      const id = row[c] ?? 0;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(c));
      rect.setAttribute('y', String(r));
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', COLORS[id % COLORS.length] ?? '#000');
      cells.appendChild(rect);
    }
  }
  svg.appendChild(cells);

  // 2) 内部网格线 — 单条 path，所有线宽一致
  let d = '';
  for (let i = 1; i < n; i++) {
    d += `M0 ${i}H${n} `;
    d += `M${i} 0V${n} `;
  }
  if (d) {
    const inner = document.createElementNS(SVG_NS, 'path');
    inner.setAttribute('d', d);
    inner.setAttribute('fill', 'none');
    inner.setAttribute('stroke', '#111');
    inner.setAttribute('stroke-width', String(INNER_STROKE));
    inner.setAttribute('stroke-linecap', 'square');
    svg.appendChild(inner);
  }

  // 3) 外框 — 独立粗线
  const outer = document.createElementNS(SVG_NS, 'rect');
  outer.setAttribute('x', '0');
  outer.setAttribute('y', '0');
  outer.setAttribute('width', String(n));
  outer.setAttribute('height', String(n));
  outer.setAttribute('fill', 'none');
  outer.setAttribute('stroke', '#111');
  outer.setAttribute('stroke-width', String(OUTER_STROKE));
  svg.appendChild(outer);

  return svg;
}

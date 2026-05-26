// TODO: 替换成你的 SVG 渲染逻辑。

import type { TemplateBoard } from './types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderTemplateSVG(board: TemplateBoard, n: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'board');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  for (let r = 0; r < n; r++) {
    const row = board[r];
    if (!row) continue;
    for (let c = 0; c < n; c++) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(c));
      rect.setAttribute('y', String(r));
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', row[c] ?? '#000');
      svg.appendChild(rect);
    }
  }
  return svg;
}

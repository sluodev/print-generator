const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSvg(viewBox: string): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('xmlns', SVG_NS);
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return el;
}

export function createSvgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  radius = 0,
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('fill', fill);
  if (radius > 0) {
    rect.setAttribute('rx', String(radius));
    rect.setAttribute('ry', String(radius));
  }
  return rect;
}

export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}

import { describe, expect, it } from 'vitest';

import { createSvg, createSvgElement, createSvgRect } from './svg.ts';

describe('svg helpers', () => {
  it('creates an svg root with stable defaults', () => {
    const root = createSvg('0 0 4 4');

    expect(root.tagName.toLowerCase()).toBe('svg');
    expect(root.getAttribute('viewBox')).toBe('0 0 4 4');
    expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(root.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('creates rects with optional corner radius', () => {
    const rect = createSvgRect(1, 2, 3, 4, '#fff', 0.5);

    expect(rect.getAttribute('x')).toBe('1');
    expect(rect.getAttribute('y')).toBe('2');
    expect(rect.getAttribute('width')).toBe('3');
    expect(rect.getAttribute('height')).toBe('4');
    expect(rect.getAttribute('fill')).toBe('#fff');
    expect(rect.getAttribute('rx')).toBe('0.5');
    expect(rect.getAttribute('ry')).toBe('0.5');
  });

  it('creates arbitrary svg elements', () => {
    const path = createSvgElement('path');

    expect(path.tagName.toLowerCase()).toBe('path');
  });
});

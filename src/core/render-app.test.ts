import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from './game.ts';

const { savedFiles } = vi.hoisted(() => ({
  savedFiles: [] as string[],
}));

vi.mock('./pdf.ts', () => {
  class MockJsPDF {
    setProperties(): void {}
    addPage(): void {}
    getTextWidth(text: string): number {
      return text.length;
    }
    text(): void {}
    save(filename: string): void {
      savedFiles.push(filename);
    }
  }

  return {
    drawPageHeader: vi.fn(),
    ensureJsPDF: vi.fn(() => Promise.resolve(MockJsPDF)),
    isJsPDFReady: vi.fn(() => true),
    prefetchJsPDF: vi.fn(),
  };
});

const { createApp } = await import('./render-app.ts');

interface TestConfig {
  readonly size: string;
}

interface TestBoard {
  readonly id: string;
}

function makeSvg(id: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('board');
  svg.dataset['boardId'] = id;
  return svg;
}

function makeGame(build: Game<TestConfig, TestBoard>['build']): Game<TestConfig, TestBoard> {
  return {
    id: 'test-game',
    title: '测试题纸',
    description: '测试用游戏',
    storageKey: 'test-game:v1',
    filenameKind: 'test',
    controls: [
      {
        kind: 'select',
        id: 'size',
        label: '尺寸',
        default: 'small',
        triggersRegenerate: true,
        options: [{ value: 'small', label: '小' }],
      },
      {
        kind: 'text',
        id: 'prefix',
        label: '前缀',
        default: '',
      },
    ],
    readConfig(rawValues) {
      return { size: rawValues['size'] ?? 'small' };
    },
    build,
    renderSVG(data) {
      return makeSvg(data.id);
    },
    drawPDF: vi.fn(),
    filenameSize(cfg) {
      return cfg.size;
    },
  };
}

async function settleGeneration(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  document.body.innerHTML = '<main id="app"></main>';
  localStorage.clear();
  savedFiles.length = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    setTimeout(() => cb(0), 0);
    return 1;
  });
});

describe('createApp generation flow', () => {
  it('renders boards after the initial generation', async () => {
    createApp(makeGame(() => [[{ id: 'a' }, { id: 'b' }]]));
    await settleGeneration();

    expect(document.querySelectorAll('svg.board')).toHaveLength(2);
    expect(document.getElementById('app-status')?.hidden).toBe(true);
  });

  it('reuses the in-flight generation for rapid generate clicks', async () => {
    const build = vi.fn(() => [[{ id: 'a' }]]);
    createApp(makeGame(build));
    await settleGeneration();

    document.getElementById('btn-generate')?.click();
    document.getElementById('btn-generate')?.click();
    await settleGeneration();

    expect(build).toHaveBeenCalledTimes(2);
  });

  it('waits for generation before downloading a PDF', async () => {
    let shouldThrow = true;
    const build = vi.fn(() => {
      if (shouldThrow) throw new Error('first failure');
      return [[{ id: 'a' }]];
    });
    createApp(makeGame(build));
    await settleGeneration();

    shouldThrow = false;
    document.getElementById('btn-download')?.click();
    await settleGeneration();

    expect(build).toHaveBeenCalledTimes(2);
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0]).toMatch(/^test-small-1p-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('waits for generation before printing', async () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { configurable: true, value: print });
    let shouldThrow = true;
    createApp(
      makeGame(() => {
        if (shouldThrow) throw new Error('first failure');
        return [[{ id: 'a' }]];
      }),
    );
    await settleGeneration();

    shouldThrow = false;
    document.getElementById('btn-print')?.click();
    await settleGeneration();

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('shows an error and keeps the previous output when build throws', async () => {
    let shouldThrow = false;
    createApp(
      makeGame(() => {
        if (shouldThrow) throw new Error('boom');
        return [[{ id: 'stable' }]];
      }),
    );
    await settleGeneration();

    shouldThrow = true;
    document.getElementById('btn-generate')?.click();
    await settleGeneration();

    const status = document.getElementById('app-status');
    expect(status?.classList.contains('error')).toBe(true);
    expect(status?.textContent).toBe('生成失败：boom');
    expect(document.querySelectorAll('svg.board')).toHaveLength(1);
    expect(document.querySelector('svg.board')?.getAttribute('data-board-id')).toBe('stable');
  });

  it('shows a warning when some boards are empty placeholders', async () => {
    createApp(makeGame(() => [[{ id: 'a' }, null, { id: 'b' }]]));
    await settleGeneration();

    const status = document.getElementById('app-status');
    expect(status?.classList.contains('warning')).toBe(true);
    expect(status?.textContent).toBe('有 1 道题生成失败，已保留空白占位。');
  });
});

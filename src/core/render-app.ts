/**
 * createApp 外壳：消费一个 Game 实现，搭建整套 UI 与事件循环。
 *
 * 调用方只需在 entry.ts 里：
 *   import { createApp } from '../../core/render-app.ts';
 *   import { myGame } from './game.ts';
 *   createApp(myGame);
 *
 * 外壳负责：
 *   1. 构建 DOM（panel + controls + actions + #output）
 *   2. 注入 CSS（panel/page/print）
 *   3. 持久化（localStorage 存原始字符串值）
 *   4. 事件绑定：生成 / 下载 PDF / 打印 / 自动重生成
 *   5. 按钮 enable/disable + "生成中…" 视觉态
 *   6. PDF 库懒加载与按钮可用性
 */

import './styles/index.css';
import { buildFilename, todayString } from './format.ts';
import type { Game } from './game.ts';
import { drawPageHeader, ensureJsPDF, isJsPDFReady, prefetchJsPDF } from './pdf.ts';
import { createStore } from './persistence.ts';

const PDF_LAYOUT = {
  pageW: 210, // mm
  pad: 12,
  colGap: 8,
  rowGap: 6,
  boardSize: 83,
  headerYOffset: 5,
  boardsStartYOffset: 12,
} as const;

const PREFIX_CONTROL_ID = 'prefix';

export function createApp<TConfig, TBoardData>(game: Game<TConfig, TBoardData>): void {
  document.title = game.title;

  const root = ensureRoot();
  root.innerHTML = '';
  root.appendChild(buildLayout(game));

  const controlEls = wireControls(game);
  const store = createStore<Record<string, string>>(game.storageKey);

  // 1. 应用持久化值
  const stored = store.load();
  if (stored) {
    for (const c of game.controls) {
      const saved = stored[c.id];
      const el = controlEls.get(c.id);
      if (el && typeof saved === 'string') el.value = saved;
    }
  }

  let currentBoards: Array<Array<TBoardData | null>> = [];
  let currentCfg: TConfig | null = null;

  function readRawValues(): Record<string, string> {
    const raw: Record<string, string> = {};
    for (const c of game.controls) {
      const el = controlEls.get(c.id);
      raw[c.id] = el ? el.value : String(c.default);
    }
    return raw;
  }

  function persist(): void {
    store.save(readRawValues());
  }

  function btn(id: string): HTMLButtonElement {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLButtonElement)) {
      throw new Error(`button #${id} not found`);
    }
    return el;
  }

  function generate(): void {
    const btnG = btn('btn-generate');
    const btnD = btn('btn-download');
    const btnP = btn('btn-print');
    persist();

    const cfg = game.readConfig(readRawValues());
    currentCfg = cfg;

    btnG.textContent = '生成中…';
    btnG.disabled = true;
    btnD.disabled = true;
    btnP.disabled = true;

    // 给 UI 一点时间刷新
    setTimeout(() => {
      try {
        currentBoards = game.build(cfg);
        renderOutput(game, currentBoards, cfg);
      } finally {
        btnG.textContent = '生成题纸';
        btnG.disabled = false;
        btnP.disabled = false;
        updatePDFButton();
      }
    }, 30);
  }

  async function downloadPDF(): Promise<void> {
    if (currentBoards.length === 0 || currentCfg === null) {
      generate();
      // 给生成留一点时间（与 print 行为一致）
      await new Promise((r) => setTimeout(r, 60));
    }
    const cfg = currentCfg;
    if (!cfg || currentBoards.length === 0) return;

    const JsPDFCtor = await ensureJsPDF();
    const doc = new JsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const { pageW, pad, colGap, rowGap, boardSize, headerYOffset, boardsStartYOffset } = PDF_LAYOUT;
    const colWidth = (pageW - 2 * pad - colGap) / 2;
    const headerY = pad + headerYOffset;
    const boardsStartY = pad + boardsStartYOffset;

    const date = todayString();
    const totalPages = currentBoards.length;

    doc.setProperties({
      title: game.title,
      subject: `${game.title} x ${totalPages} pages`,
      creator: game.id,
      author: game.id,
    });

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) doc.addPage();
      drawPageHeader(doc, { pageW, pad, headerY, date, pageIndex: pageIdx, totalPages });
      const boards = currentBoards[pageIdx] ?? [];
      for (let b = 0; b < boards.length; b++) {
        const board = boards[b];
        if (!board) continue;
        const col = b % 2;
        const row = Math.floor(b / 2);
        const cellX = pad + col * (colWidth + colGap);
        const cellY = boardsStartY + row * (boardSize + rowGap);
        const bx = cellX + (colWidth - boardSize) / 2;
        game.drawPDF(doc, board, { x: bx, y: cellY, size: boardSize }, cfg);
      }
    }

    const fname = buildFilename({
      kind: game.filenameKind,
      size: game.filenameSize(cfg),
      pages: totalPages,
      prefix: readRawValues()[PREFIX_CONTROL_ID] ?? null,
    });
    doc.save(fname);
  }

  // 事件绑定
  btn('btn-generate').addEventListener('click', generate);
  btn('btn-download').addEventListener('click', () => {
    void downloadPDF();
  });
  btn('btn-print').addEventListener('click', () => {
    if (currentBoards.length === 0) {
      generate();
      setTimeout(() => window.print(), 80);
    } else {
      window.print();
    }
  });

  for (const c of game.controls) {
    const el = controlEls.get(c.id);
    if (!el) continue;
    if (c.triggersRegenerate) {
      el.addEventListener('change', generate);
    } else {
      const evt = c.kind === 'text' ? 'input' : 'change';
      el.addEventListener(evt, persist);
    }
  }

  // 初始化
  prefetchJsPDF();
  updatePDFButton();
  // 默认进入页面就生成一次
  generate();

  function updatePDFButton(): void {
    const btnD = btn('btn-download');
    if (isJsPDFReady()) {
      btnD.disabled = false;
      btnD.title = '';
    } else {
      btnD.disabled = true;
      btnD.title = 'PDF 库正在加载…';
      ensureJsPDF().then(
        () => updatePDFButton(),
        () => {
          btnD.title = 'PDF 库加载失败，请检查网络后刷新';
        },
      );
    }
  }
}

// ---------- DOM 构造 ----------

function ensureRoot(): HTMLElement {
  const existing = document.getElementById('app');
  if (existing) return existing;
  const fallback = document.createElement('main');
  fallback.id = 'app';
  document.body.appendChild(fallback);
  return fallback;
}

function buildLayout<TConfig, TBoardData>(game: Game<TConfig, TBoardData>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'container';

  const panel = document.createElement('div');
  panel.className = 'panel no-print';

  const h1 = document.createElement('h1');
  h1.textContent = game.title;
  panel.appendChild(h1);

  const controls = document.createElement('div');
  controls.className = 'controls';
  for (const c of game.controls) {
    controls.appendChild(buildControl(c));
  }
  panel.appendChild(controls);

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(makeButton('btn-generate', 'btn-primary', '生成题纸'));
  actions.appendChild(makeButton('btn-download', 'btn-tertiary', '下载 PDF'));
  actions.appendChild(makeButton('btn-print', 'btn-secondary', '打印'));
  panel.appendChild(actions);

  container.appendChild(panel);

  const output = document.createElement('main');
  output.id = 'output';
  const hint = document.createElement('div');
  hint.className = 'empty-hint';
  hint.textContent = '点击「生成题纸」开始';
  output.appendChild(hint);
  container.appendChild(output);

  return container;
}

function buildControl(c: Game<unknown, unknown>['controls'][number]): HTMLLabelElement {
  const label = document.createElement('label');
  if (c.fullRow) label.classList.add('full-row');
  const span = document.createElement('span');
  span.textContent = c.label;
  label.appendChild(span);

  let input: HTMLInputElement | HTMLSelectElement;
  if (c.kind === 'select') {
    const sel = document.createElement('select');
    sel.id = c.id;
    sel.setAttribute('aria-label', c.label);
    for (const opt of c.options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === c.default) o.selected = true;
      sel.appendChild(o);
    }
    input = sel;
  } else if (c.kind === 'number') {
    const num = document.createElement('input');
    num.type = 'number';
    num.id = c.id;
    num.inputMode = 'numeric';
    num.min = String(c.min);
    num.max = String(c.max);
    num.step = String(c.step);
    num.value = String(c.default);
    num.setAttribute('aria-label', c.label);
    input = num;
  } else {
    const txt = document.createElement('input');
    txt.type = 'text';
    txt.id = c.id;
    if (c.placeholder) txt.placeholder = c.placeholder;
    if (c.maxLength) txt.maxLength = c.maxLength;
    txt.autocomplete = 'off';
    txt.value = c.default;
    txt.setAttribute('aria-label', c.label);
    input = txt;
  }

  label.appendChild(input);
  return label;
}

function makeButton(id: string, cls: string, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.id = id;
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  return b;
}

function wireControls<TConfig, TBoardData>(
  game: Game<TConfig, TBoardData>,
): Map<string, HTMLInputElement | HTMLSelectElement> {
  const map = new Map<string, HTMLInputElement | HTMLSelectElement>();
  for (const c of game.controls) {
    const el = document.getElementById(c.id);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      map.set(c.id, el);
    }
  }
  return map;
}

// ---------- 输出渲染 ----------

function renderOutput<TConfig, TBoardData>(
  game: Game<TConfig, TBoardData>,
  pages: Array<Array<TBoardData | null>>,
  cfg: TConfig,
): void {
  const output = document.getElementById('output');
  if (!output) return;
  output.innerHTML = '';
  const date = todayString();
  const totalPages = pages.length;

  for (let p = 0; p < totalPages; p++) {
    const page = document.createElement('section');
    page.className = 'page';

    const header = document.createElement('div');
    header.className = 'page-header';
    const left = document.createElement('span');
    left.textContent = date;
    const right = document.createElement('span');
    right.textContent = `${p + 1} / ${totalPages}`;
    header.appendChild(left);
    header.appendChild(right);

    const grid = document.createElement('div');
    grid.className = 'boards-grid';

    const boards = pages[p] ?? [];
    for (const board of boards) {
      if (board) {
        grid.appendChild(game.renderSVG(board, cfg));
      } else {
        const ph = document.createElement('div');
        ph.className = 'board';
        grid.appendChild(ph);
      }
    }

    page.appendChild(header);
    page.appendChild(grid);
    output.appendChild(page);
  }
}

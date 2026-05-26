/**
 * 游戏注册表。新增游戏 = 在这里追加一项 + 在 vite.config.ts 的 input 加一行。
 *
 * 故意把元信息放在这里而不是从各游戏 game.ts 反向读取——
 * 这样首页打包时不会把游戏的算法 / 渲染代码也拉进来，保持入口最小。
 */

import { createSvg, createSvgElement, createSvgRect } from './core/svg.ts';

export interface GameEntry {
  /** kebab-case 唯一 id，与目录名 / Pages 子路径一致。 */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** 子路径，相对首页。结尾要带 `/`，例如 `queens/`。 */
  readonly route: string;
  /** 卡片缩略图（独立 SVG，调用即新建）。 */
  makeThumbnail(): SVGSVGElement;
}

export const games: readonly GameEntry[] = [
  {
    id: 'queens',
    title: 'Queens 题纸生成器',
    description: 'N×N 棋盘上每行 / 每列 / 每个色块各放且仅放 1 个皇后，唯一解题面随机生成。',
    route: 'queens/',
    makeThumbnail(): SVGSVGElement {
      // 4 × 4 网格的迷你示意，配色取自 Queens 调色板的前几种
      const palette = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#60a5fa', '#c084fc'];
      // 用一个固定的小区域分布作为视觉示意
      const layout = [
        [0, 0, 1, 2],
        [0, 3, 1, 2],
        [4, 4, 5, 2],
        [4, 5, 6, 6],
      ];
      const root = createSvg('0 0 4 4');
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const id = layout[r]![c]!;
          root.appendChild(createSvgRect(c, r, 1, 1, palette[id] ?? '#000'));
        }
      }
      // 浅黑色细网格线
      const grid = createSvgElement('path');
      let d = '';
      for (let i = 1; i < 4; i++) {
        d += `M0 ${i}H4 M${i} 0V4 `;
      }
      grid.setAttribute('d', d);
      grid.setAttribute('fill', 'none');
      grid.setAttribute('stroke', '#111');
      grid.setAttribute('stroke-width', '0.05');
      grid.setAttribute('stroke-linecap', 'square');
      root.appendChild(grid);
      // 外框
      const border = createSvgRect(0, 0, 4, 4, 'none');
      border.setAttribute('stroke', '#111');
      border.setAttribute('stroke-width', '0.08');
      root.appendChild(border);
      return root;
    },
  },
  {
    id: 'one-stroke',
    title: '一笔画题纸生成器',
    description: '从起点出发，不重复地走完所有激活格；4-邻接移动，构造性保证有解。',
    route: 'one-stroke/',
    makeThumbnail(): SVGSVGElement {
      // 4 × 4 网格上的小小一笔画示意（L 型路径），起点用绿色
      const ACTIVE = '#dbeafe';
      const START = '#10b981';
      const BORDER = '#94a3b8';
      const cells: Array<[number, number, boolean]> = [
        [0, 0, true], // start
        [0, 1, false],
        [0, 2, false],
        [1, 0, false],
        [2, 0, false],
        [2, 1, false],
        [2, 2, false],
        [3, 2, false],
      ];
      const root = createSvg('-0.1 -0.1 4.2 4.2');
      const gap = 0.1;
      const inner = 1 - gap;
      const rx = inner * 0.18;
      for (const [r, c, isStart] of cells) {
        root.appendChild(
          createSvgRect(c + gap / 2, r + gap / 2, inner, inner, isStart ? START : ACTIVE, rx),
        );
      }
      const border = createSvgRect(0, 0, 4, 4, 'none', 0.2);
      border.setAttribute('stroke', BORDER);
      border.setAttribute('stroke-width', '0.07');
      root.appendChild(border);
      return root;
    },
  },
];

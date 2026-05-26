# print-generator

可打印的小游戏题纸合集。每个游戏一个独立子页面，导出可打印 / 可下载 PDF 的 A4 题纸。

> 在线访问：[https://sluodev.github.io/print-generator/](https://sluodev.github.io/print-generator/)

## 已收录的游戏

- **Queens 题纸生成器** — `/queens/` ：N×N 棋盘 + 颜色区域，每行 / 每列 / 每色块各放且仅放 1 个皇后；唯一解题面随机生成。
- **一笔画题纸生成器** — `/one-stroke/`：从起点出发，不重复地走完所有激活格；4-邻接移动，构造性保证有解。

后续会持续增加（数独、扫雷、迷宫、贪吃蛇路径……）。

## 本地开发

```bash
pnpm install      # 首次安装依赖
pnpm dev          # 启动 Vite 开发服务器（含 HMR）
pnpm build        # 生产构建到 dist/
pnpm preview      # 本地预览 dist
pnpm test         # 单元测试（Vitest）
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint 全仓
pnpm format       # Prettier 全仓格式化
```

需要 **Node 20+** 与 **pnpm 10+**（仓库根 `.nvmrc` 指定 Node 22）。

## 工程要点

- **Vite + TypeScript（strict + `noUncheckedIndexedAccess`）多页构建**：每个游戏一个独立 HTML，主页是游戏列表。
- **共用层** `src/core/`：UI 外壳（`render-app.ts`）、CSS（`styles/*.css`）、PDF 工具、本地持久化、类型契约，所有游戏共用。
- **每个游戏只写算法 / SVG 渲染 / PDF 渲染 / 配置**，约 5 ~ 10 分钟可加一个新游戏。详见 `src/games/_template/README.md`。
- **jsPDF 懒加载**：约 357KB 的 jspdf 包仅在用户点击"下载 PDF"时才动态 import，首屏零额外开销。
- **CI（GitHub Actions）**自动跑 lint / typecheck / test / build；推到 `main` 分支会自动部署到 GitHub Pages。

> 首次部署：在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，然后向 `main` 推一次 commit 触发 workflow。后续每次 push 到 `main` 都会自动重新部署到 `https://sluodev.github.io/print-generator/`。

## 添加新游戏

参见 `AGENTS.md` 与 `src/games/_template/README.md`。简化流程：

1. 复制 `src/games/_template/` 到 `src/games/<your-id>/`，跟随 `TODO` 注释逐文件替换内容
2. 顶层加 `<your-id>/index.html`（参考 `queens/index.html`）
3. `vite.config.ts` 的 `rollupOptions.input` 注册多页入口
4. `src/games.config.ts` 注册到首页卡片

## 目录速览

```
print-generator/
├─ index.html              # 首页
├─ queens/index.html       # Queens 游戏页
├─ one-stroke/index.html   # 一笔画游戏页
├─ src/
│  ├─ main.ts              # 首页脚本
│  ├─ games.config.ts      # 游戏注册表
│  ├─ landing.css          # 首页样式
│  ├─ core/                # 共用层
│  └─ games/
│     ├─ _template/        # 新游戏脚手架
│     ├─ queens/
│     └─ one-stroke/
├─ vite.config.ts
├─ tsconfig.json
└─ AGENTS.md               # 给 AI 协作 Agent 的工作守则
```

## License

MIT。

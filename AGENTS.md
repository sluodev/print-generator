# AGENTS.md — 给 AI 协作 Agent 的工作守则

这个仓库由一组"可打印小游戏题纸生成器"组成，每个游戏一个独立子页面。本文件是 Codex / Kiro / Claude / Cursor 等 Agent 的入口说明，建议每次接手任务前先读一遍。

## 仓库目标

- 单仓多游戏：每个游戏 = 一个独立 HTML 页面 + 一份 TS 实现 + 单元测试。
- 共用层包揽 UI / 排版 / 持久化 / PDF / 打印；游戏只写"算法 + 渲染 + 配置"。
- 输出静态站点，部署到 GitHub Pages（`https://sluodev.github.io/print-generator/`）。

## 必读的目录结构

```
print-generator/
├─ index.html                    # 首页（游戏列表）
├─ queens/index.html             # Queens 游戏页 - 引入 src/games/queens/entry.ts
├─ one-stroke/index.html         # 一笔画游戏页 - 引入 src/games/one-stroke/entry.ts
├─ src/
│  ├─ main.ts                    # 首页入口
│  ├─ games.config.ts            # 游戏注册表（首页消费）
│  ├─ landing.css                # 首页样式
│  ├─ core/                      # 共用层（不引用任何游戏代码）
│  │  ├─ format.ts               # todayString / sanitizePrefix / hexToRgb / buildFilename
│  │  ├─ rng.ts                  # shuffle / range / mulberry32
│  │  ├─ persistence.ts          # localStorage 包装
│  │  ├─ pdf.ts                  # ensureJsPDF 懒加载 + drawPageHeader 等
│  │  ├─ game.ts                 # Game / ControlSpec 接口
│  │  ├─ render-app.ts           # createApp 通用外壳
│  │  ├─ styles/                 # panel.css / page.css / print.css
│  │  └─ index.ts                # 桶导出
│  └─ games/
│     ├─ _template/              # 新游戏脚手架（不进入生产构建）
│     ├─ queens/                 # types.ts / colors.ts / generator.ts / render.ts / pdf.ts / game.ts / entry.ts / generator.test.ts
│     └─ one-stroke/             # types.ts / style.ts / generator.ts / render.ts / pdf.ts / game.ts / entry.ts / generator.test.ts
├─ vite.config.ts                # 多页入口注册
├─ tsconfig.json                 # strict + noUncheckedIndexedAccess
├─ eslint.config.js / .prettierrc.json
└─ .github/workflows/ci.yml      # CI + Pages 部署
```

## 关键命令

```bash
pnpm install      # 安装依赖（首次或锁文件变化时）
pnpm dev          # Vite dev server（含 HMR）
pnpm build        # 生产构建到 dist/
pnpm preview      # 本地预览 dist
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run（CI 用）
pnpm test:watch   # 本地开发用
pnpm lint         # eslint 全仓
pnpm lint:fix     # eslint 自动修复
pnpm format       # prettier 全仓写
pnpm format:check # prettier 检查
```

**Agent 在提交前请按顺序跑 `pnpm format && pnpm lint && pnpm typecheck && pnpm test`。** 这四步对应 CI 的拦截，提前过一遍能避免 CI 红。

## 添加新游戏（约 5 ~ 10 分钟）

1. 复制 `src/games/_template/` 到 `src/games/<your-id>/`（id 用 kebab-case，与目录同名）。
2. 跟着各文件的 `TODO` 注释依次替换：`types.ts → generator.ts → render.ts → pdf.ts → game.ts`。
3. 在仓库顶层新建 `<your-id>/index.html`（参考 `queens/index.html`，把 `script src` 改成新 entry）。
4. `vite.config.ts` 的 `rollupOptions.input` 加一行：`'<your-id>': '<your-id>/index.html'`。
5. `src/games.config.ts` 的 `games` 数组追加一项（id / title / description / route / makeThumbnail）。
6. 在 `src/games/<your-id>/generator.test.ts` 里写至少 1 个针对算法的单元测试。
7. `pnpm dev` → 访问 `http://localhost:5173/<your-id>/` 验证。

详见 `src/games/_template/README.md`。

## Game 接口契约（核心，只有 4 个方法）

```ts
interface Game<TConfig, TBoardData> extends GameMeta {
  controls: readonly ControlSpec[]; // 控件声明（外壳代渲染）
  readConfig(raw: Record<string, string>): TConfig; // DOM 字符串 → 强类型配置
  build(cfg: TConfig): Array<Array<TBoardData | null>>; // 题面数据：pages × 6
  renderSVG(data: TBoardData, cfg: TConfig): SVGSVGElement; // 单题屏幕渲染
  drawPDF(doc: jsPDF, data: TBoardData, ctx: PDFDrawCtx, cfg: TConfig): void;
  filenameSize(cfg: TConfig): string; // 例如 '6x6'，进 PDF 文件名
}
```

外壳（`render-app.ts`）调用顺序：

1. 渲染 panel + 控件 → 应用本地持久化值
2. 用户改控件 → `triggersRegenerate: true` 控件触发 `generate()`，其它仅 `persist()`
3. `generate()` = `readConfig` → `build` → 逐题 `renderSVG`
4. 下载 PDF = `ensureJsPDF()` → 逐页 `drawPageHeader` + 逐题 `drawPDF` → `doc.save(buildFilename(...))`

## 编码规范（Agent 友好）

- **TypeScript 严格模式**：`strict: true` + `noUncheckedIndexedAccess: true`。`arr[i]` 是 `T | undefined`；用 `arr[i]!` 仅在确保边界后使用，否则 `?? fallback` 或显式判 undefined。
- **`verbatimModuleSyntax: true`**：所有 import 必须带 `.ts` 扩展名（`allowImportingTsExtensions: true` 已配）。`type` 只用于类型的 import 写 `import type { ... }`。
- **算法层纯函数**：`generator.ts` 不引用 `document` / `jspdf`，便于在 Node + Vitest 中单测。
- **随机性**：所有需要随机的函数接收可选 `rand: RandomFn = Math.random`；测试用 `mulberry32(seed)` 注入。
- **不要装 husky**：本仓库故意没有预提交钩子。Agent 在提交前自行跑 lint / typecheck / test。

## 安全边界

以下操作即使在已 trust 的会话中也**必须先获得用户明确确认**：

- 破坏性 git 操作：`git reset --hard`、`git push --force`、`git clean -f` 等
- `rm -rf` / 跨目录批量删除
- 修改 `.github/workflows/`、`pre-commit` 配置
- 全局工具变更：`npm install -g`、改 `PATH`、改 shell rc
- 写入 `~/.kiro`、`~/.aws`、`~/.ssh`、`~/.config/`

## 已知限制 / 设计决策

- **Queens n=8/9 唯一解**：原算法（"按皇后位置 BFS 涂色"）在 n=8/9 上几乎不收敛，由 `buildPuzzles` 的 fallback 路径降级为非唯一解。这是原始 HTML 既有行为，迁移忠实保留。如需提升，可考虑在 `generateRegions` 中引入更随机的 partition 策略（带反抑制采样），后续单独优化。
- **jsPDF 懒加载**：`ensureJsPDF()` 仅在用户点"下载 PDF"时才动态 import jspdf 包（约 357KB），首屏不阻塞。Vite 自动 code-split。
- **持久化**：每个游戏一个 localStorage key（带版本号），存的是控件原始字符串值；`readConfig` 负责解析。这样换接口时 Agent 不需要写迁移代码。

## 提交信息约定

使用 Conventional Commits，描述部分用中文：

```
feat(one-stroke): 增加难度档位下拉
fix(queens): 修复 PDF 颜色与屏幕不一致
refactor(core): 把 PDF 版面参数集中到 PDF_LAYOUT
docs: 补充 AGENTS.md 关于 ESLint 的章节
```

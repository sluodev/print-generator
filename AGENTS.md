# Agent Rules

## 仓库目标

- 单仓多游戏：每个游戏 = 一个独立 HTML + 一份 TS 实现 + 单元测试。
- 共用层包揽 UI / 排版 / 持久化 / PDF / 打印；游戏只写"算法 + 渲染 + 配置"。
- 输出静态站点，部署到 GitHub Pages（`https://sluodev.github.io/print-generator/`）。
- 工具链：Vite 8（Rolldown）+ TypeScript strict + Vitest 4 + happy-dom + ESLint 9 + Prettier。

## 目录结构

```
print-generator/
├─ index.html                  # 首页
├─ <game-id>/index.html        # 游戏页面入口
├─ src/
│  ├─ main.ts                  # 首页入口
│  ├─ games.config.ts          # 游戏注册表
│  ├─ core/                    # 共用层；不得引用游戏代码
│  └─ games/
│     ├─ _template/            # 新游戏脚手架
│     └─ <game-id>/            # 单个游戏实现与测试
├─ vite.config.ts              # 多页入口注册
├─ tsconfig.json
└─ eslint.config.js
```

## 关键命令

```bash
pnpm dev        # 本地开发
pnpm build      # 生产构建
pnpm preview    # 本地预览 dist/
pnpm format     # Prettier 写入
pnpm lint       # ESLint
pnpm lint:fix   # ESLint 自动修复
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest
```

代码变更提交前按顺序跑通：`pnpm format && pnpm lint && pnpm typecheck && pnpm test`。

## 添加新游戏

1. 复制 `src/games/_template/` 到 `src/games/<your-id>/`（id 用 kebab-case，与目录同名）。
2. 跟着各文件的 `TODO` 注释依次替换：`types.ts → generator.ts → render.ts → pdf.ts → game.ts`。
3. 顶层新建 `<your-id>/index.html`（参考 `queens/index.html`，把 `script src` 改成新 entry）。
4. 在 `vite.config.ts` 的 `rollupOptions.input` 注册 `<your-id>/index.html`。
5. `src/games.config.ts` 的 `games` 数组追加一项（`id` / `title` / `description` / `route` / `makeThumbnail`）。
6. 在 `src/games/<your-id>/generator.test.ts` 写至少 1 个针对算法的单元测试。
7. `pnpm dev` → 访问 `http://localhost:5173/<your-id>/` 验证；再 `pnpm test && pnpm build` 确认没破坏其它游戏。

## Game 接口契约

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

外壳 `render-app.ts` 调用顺序：

1. 渲染 panel + 控件 → 应用本地持久化值。
2. 用户改控件 → `triggersRegenerate: true` 触发 `generate()`，其它仅 `persist()`。
3. `generate()` = `readConfig` → `build` → 逐题 `renderSVG`。
4. 下载 PDF = `ensureJsPDF()` → 逐页 `drawPageHeader` + 逐题 `drawPDF` → `doc.save(buildFilename(...))`。

## 编码规范

- **TypeScript strict**：`strict: true` + `noUncheckedIndexedAccess: true`。`arr[i]` 类型是 `T | undefined`；用 `arr[i]!` 仅在确保边界后使用，否则 `?? fallback` 或显式判 undefined。
- **`verbatimModuleSyntax: true`**：所有 import 必须带 `.ts` 扩展名（`allowImportingTsExtensions: true` 已配）。仅类型的 import 写 `import type { ... }`。
- **算法层纯函数**：`generator.ts` 不引用 `document` / `jspdf`，便于在 Node + Vitest 中单测。
- **随机性**：所有需要随机的函数接收可选 `rand: RandomFn = Math.random`；测试用 `mulberry32(seed)` 注入。

## 安全边界

以下操作即使在已 trust 的会话中也**必须先获得用户明确确认**：

- 破坏性 git 操作：`git reset --hard`、`git push --force`、`git clean -f` 等。
- `rm -rf` / 跨目录批量删除。
- 修改 `.github/workflows/`、`pre-commit` 配置。
- 全局工具变更：`npm install -g`、改 `PATH`、改 shell rc。
- 写入 `~/.kiro`、`~/.aws`、`~/.ssh`、`~/.config/`。

## 已知限制 / 设计决策

- **持久化**：每个游戏一个 localStorage key（带版本号），存的是**控件原始字符串值**；`readConfig` 负责解析。换接口时无需写迁移代码——直接 bump 版本号即可让旧值失效。
- **CI 在 Pages 路径下构建**：CI 用 `PAGES_BASE=/print-generator/` 触发 build，本地默认 `/`。改 base 路径前后要同时验证两种环境下的资源加载。

## 提交信息约定

使用 Conventional Commits，描述部分用中文：

```
feat(one-stroke): 增加难度档位下拉
fix(queens): 修复 PDF 颜色与屏幕不一致
```

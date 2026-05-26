# `_template/` — 新游戏脚手架

这是一个**最小可运行**的题纸生成器范例。复制整个目录改名后，跟随各文件里的 `TODO` 注释逐步替换内容即可得到一个新游戏。

## 复制清单（约 5 ~ 10 分钟）

1. 复制本目录到 `src/games/<your-id>/`，把 `<your-id>` 替换为你的游戏 id（kebab-case）。
2. 在每个文件里搜索 `TODO`，依次：
   - `types.ts`：定义 `<Your>Board` 与 `<Your>Config`
   - `generator.ts`：实现题面生成算法
   - `render.ts`：实现屏幕 SVG 渲染
   - `pdf.ts`：实现 PDF 渲染（与屏幕视觉等价）
   - `game.ts`：拼接 `Game<TConfig, TBoard>`，配置 `id / title / description / storageKey / filenameKind / controls`
   - `entry.ts`：通常无需修改（自动从 `game.ts` 引入并 `createApp`）
3. 在仓库顶层创建 `<your-id>/index.html`：复制 `queens/index.html` 改一行 `script src` 指向新 entry。
4. 在 `vite.config.ts` 的 `rollupOptions.input` 追加一行 `'<your-id>': '<your-id>/index.html'`。
5. 在 `src/games.config.ts` 的 `games` 数组里追加一项（id / title / description / route / makeThumbnail）。
6. 在 `src/games/<your-id>/generator.test.ts` 里写至少 1 个对算法的单元测试（参考 queens / one-stroke）。

## 验证

```bash
pnpm dev          # 浏览器访问 http://localhost:5173/<your-id>/
pnpm typecheck
pnpm test
pnpm build        # 检查 dist/<your-id>/index.html 已生成
```

## 给 Agent 的小提示

- 算法层（`generator.ts`）应**尽量纯**：不引用 `document` / `jspdf`，只接收数据返回数据，便于 Vitest 单测。
- 渲染层（`render.ts` / `pdf.ts`）共享视觉常量；在游戏目录单独建一个 `style.ts` 集中管理颜色 / 几何比例。
- 若需要随机性，给生成函数加一个可选 `rand: RandomFn = Math.random` 参数；测试时用 `mulberry32(seed)` 注入固定 seed 取得稳定输出。
- 公开 `Game.controls` 中 `triggersRegenerate: true` 的控件会在 `change` 时自动重新生成；其它控件只持久化。

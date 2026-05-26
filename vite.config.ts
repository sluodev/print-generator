import { defineConfig } from 'vitest/config';

// 部署到 GitHub Pages 时（CI 中会注入 PAGES_BASE=/print-generator/），
// 资源路径需要带仓库名前缀；本地开发与 preview 使用根路径即可。
const base = process.env.PAGES_BASE ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    rollupOptions: {
      // 多页入口：根首页 + 各游戏。
      // HTML 放在仓库顶层（queens/index.html 等），TS 入口与算法在 src/games/<name>/。
      // 新增游戏时：① 顶层加 <name>/index.html；② src/games/<name>/ 加 entry.ts；③ 这里追加一行。
      input: {
        index: 'index.html',
        queens: 'queens/index.html',
        'one-stroke': 'one-stroke/index.html',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});

# print-generator

可打印的小游戏题纸合集。每个游戏一个独立子页面，支持 A4 打印与 PDF 下载。

> 在线访问：[https://sluodev.github.io/print-generator/](https://sluodev.github.io/print-generator/)

## 已收录的游戏

- [**Queens**](./queens/) — N×N 棋盘 + 颜色区域，每行 / 每列 / 每色块各放且仅放 1 个皇后；唯一解题面随机生成。
- [**一笔画**](./one-stroke/) — 从起点出发，不重复地走完所有激活格；4-邻接移动，构造性保证有解。

后续会持续增加（数独、扫雷、迷宫、贪吃蛇路径……）。

## 快速开始

需要 **Node ≥ 20**（推荐 22，见 `.nvmrc`）与 **pnpm ≥ 10**。

```bash
pnpm install
pnpm dev          # 启动 dev server，访问 http://localhost:5173/
```

## 部署

每次推送到 `main` 自动部署到 GitHub Pages。

> **首次启用**：仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**，再向 `main` 推一次 commit 触发 workflow。后续每次 push 都会自动重新部署到 [https://sluodev.github.io/print-generator/](https://sluodev.github.io/print-generator/)。

## License

MIT。

// TODO: 仅在你完成上述 5 个文件 + 创建顶层 <id>/index.html + 在 vite.config.ts 注册 input 之后，
// 这个 entry 才会被 Vite 拉起来。改名前不会被构建。

import { createApp } from '../../core/render-app.ts';

import { templateGame } from './game.ts';

createApp(templateGame);

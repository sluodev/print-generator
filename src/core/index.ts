/**
 * 桶导出：游戏代码统一从 `../../core` 引入需要的工具与类型。
 * 不要把 DOM-only 模块（render-app.ts）从这里再导出，避免被 Node 单测意外引入。
 */

export * from './format.ts';
export * from './rng.ts';
export * from './persistence.ts';
export * from './pdf.ts';
export * from './game.ts';

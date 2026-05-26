// TODO: 改名 → 你的游戏专属类型；这只是占位示例。
// 这里的"游戏"只是把每格染随机色作为最小可运行 demo，没有真实玩法。

/** 单题数据：每个格子一个 hex 颜色串。 */
export type TemplateBoard = string[][];

/** 由控件读入并 clamp 后的强类型配置。 */
export interface TemplateConfig {
  /** 棋盘大小：4 ~ 7。 */
  readonly size: number;
  /** 总页数：1 ~ 50。 */
  readonly pages: number;
  /** PDF 文件名前缀。 */
  readonly prefix: string;
}

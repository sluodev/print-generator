/**
 * 题面：每个格子的"颜色区域 id"，0 ~ n-1。
 * 形状是 n × n 二维数组（行优先），与 SVG 渲染、PDF 渲染共用。
 */
export type QueensBoard = number[][];

/** 由控件读入并 clamp 后的强类型配置。 */
export interface QueensConfig {
  /** 棋盘大小：5 ~ 9。 */
  readonly size: number;
  /** 总页数：1 ~ 50。 */
  readonly pages: number;
  /** PDF 文件名前缀（可为空字符串）。 */
  readonly prefix: string;
}

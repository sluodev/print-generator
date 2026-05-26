/** 一笔画单题数据：n×n 网格上一条哈密顿路径覆盖的子图。 */
export interface OneStrokeBoard {
  /** cells[r][c] 为 true 表示该格被路径覆盖。 */
  readonly cells: boolean[][];
  /** 起点 [row, col]，路径首格。 */
  readonly startRC: readonly [number, number];
  /** 终点 [row, col]，路径末格。 */
  readonly endRC: readonly [number, number];
  /** 完整路径，按访问顺序的 [r, c] 序列。 */
  readonly path: ReadonlyArray<readonly [number, number]>;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

/** 起终点标记模式：仅起点 / 起 + 终 / 都不标。 */
export type MarkMode = 'start' | 'both' | 'none';

export interface OneStrokeConfig {
  /** 棋盘大小 4~7。 */
  readonly size: number;
  /** 难度档位（决定激活格比例）。 */
  readonly difficulty: Difficulty;
  /** 起终点标记模式。 */
  readonly markMode: MarkMode;
  /** 总页数 1~50。 */
  readonly pages: number;
  /** PDF 文件名前缀（可空）。 */
  readonly prefix: string;
}

/** 难度 → 激活格比例。激活格数 = round(ratio × n²)，下限 4。 */
export const DIFFICULTY_RATIO: Readonly<Record<Difficulty, number>> = {
  easy: 0.5,
  medium: 0.7,
  hard: 0.9,
};

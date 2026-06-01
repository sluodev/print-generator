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
  /** 难度档位（决定激活格范围与解空间目标）。 */
  readonly difficulty: Difficulty;
  /** 起终点标记模式。 */
  readonly markMode: MarkMode;
  /** 总页数 1~50。 */
  readonly pages: number;
  /** PDF 文件名前缀（可空）。 */
  readonly prefix: string;
}

export type BoardSize = 4 | 5 | 6 | 7;

export interface DifficultyProfile {
  /** 各棋盘尺寸下候选题的激活格数量范围。 */
  readonly cellCountBySize: Readonly<Record<BoardSize, readonly [number, number]>>;
  /** 玩家视角下的最少可行解数；easy 达到该上限即停止继续计数。 */
  readonly minSolutions: number;
  /** 玩家视角下的最多可行解数；null 表示只要求不少于 minSolutions。 */
  readonly maxSolutions: number | null;
  /** 求解器计数上限，超过即视为“大于目标”。 */
  readonly solveCap: number;
  /** 每题最多抽样候选数量。 */
  readonly candidateAttempts: number;
  /** 生成路径时对非路径相邻捷径的惩罚；负值会主动制造开放区域。 */
  readonly shortcutPenalty: number;
  /** 至少保留的局部分支点，避免题面退化成纯走廊。 */
  readonly minBranchPointsBySize: Readonly<Record<BoardSize, number>>;
  /** 至少保留的非路径干扰边，制造看似可走但会失败的选择。 */
  readonly minExtraEdgesBySize: Readonly<Record<BoardSize, number>>;
  /** 求解器证明题面时至少需要搜索的节点数，近似衡量人类试探成本。 */
  readonly minSearchNodesBySize: Readonly<Record<BoardSize, number>>;
  /** 隐藏解路径中强制步比例上限；越低表示越少“一路推到底”。 */
  readonly maxForcedMoveRatio: number;
}

/** 难度 → 激活格范围 + 玩家视角解空间目标。 */
export const DIFFICULTY_PROFILES: Readonly<Record<Difficulty, DifficultyProfile>> = {
  easy: {
    cellCountBySize: {
      4: [8, 10],
      5: [12, 15],
      6: [17, 21],
      7: [23, 29],
    },
    minSolutions: 6,
    maxSolutions: 24,
    solveCap: 25,
    candidateAttempts: 24,
    shortcutPenalty: -1.8,
    minBranchPointsBySize: { 4: 1, 5: 2, 6: 3, 7: 4 },
    minExtraEdgesBySize: { 4: 1, 5: 2, 6: 3, 7: 4 },
    minSearchNodesBySize: { 4: 12, 5: 28, 6: 50, 7: 80 },
    maxForcedMoveRatio: 0.82,
  },
  medium: {
    cellCountBySize: {
      4: [10, 13],
      5: [16, 20],
      6: [23, 28],
      7: [31, 38],
    },
    minSolutions: 3,
    maxSolutions: 8,
    solveCap: 9,
    candidateAttempts: 48,
    shortcutPenalty: -0.8,
    minBranchPointsBySize: { 4: 2, 5: 3, 6: 4, 7: 5 },
    minExtraEdgesBySize: { 4: 2, 5: 3, 6: 5, 7: 7 },
    minSearchNodesBySize: { 4: 24, 5: 60, 6: 110, 7: 180 },
    maxForcedMoveRatio: 0.72,
  },
  hard: {
    cellCountBySize: {
      4: [12, 13],
      5: [19, 22],
      6: [27, 31],
      7: [37, 43],
    },
    minSolutions: 1,
    maxSolutions: 2,
    solveCap: 3,
    candidateAttempts: 72,
    shortcutPenalty: -0.25,
    minBranchPointsBySize: { 4: 2, 5: 4, 6: 5, 7: 7 },
    minExtraEdgesBySize: { 4: 2, 5: 4, 6: 6, 7: 9 },
    minSearchNodesBySize: { 4: 40, 5: 110, 6: 220, 7: 420 },
    maxForcedMoveRatio: 0.62,
  },
};

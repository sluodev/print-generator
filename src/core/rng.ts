/**
 * 随机数与序列工具。
 * `Math.random` 包装为可重写的接口（默认走 Math.random），方便测试时注入 seeded RNG。
 */

export type RandomFn = () => number;

/** Fisher–Yates 原地洗牌，返回入参（链式方便）。 */
export function shuffle<T>(arr: T[], rand: RandomFn = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}

/** `[0, 1, ..., n-1]`。 */
export function range(n: number): number[] {
  const a = new Array<number>(n);
  for (let i = 0; i < n; i++) a[i] = i;
  return a;
}

/**
 * Mulberry32：32 位状态、单种子的伪随机生成器。
 * 用于测试中固定输出，避免随机抽样导致的 flaky。
 * 不用于生产场景下的"安全"随机。
 */
export function mulberry32(seed: number): RandomFn {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

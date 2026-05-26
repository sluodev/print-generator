/**
 * 简单的 localStorage 包装器，处理 JSON 编解码、存储不可用、配额异常等情况。
 *
 * 使用方式：
 *   const store = createStore<MyState>('queens-print-generator:v3');
 *   const saved = store.load();
 *   store.save({ size: '6', pages: 3 });
 *
 * 升版本时新建一个 key（v3 → v4）；旧 key 由调用方决定是否兜底读取。
 */

export interface PersistenceStore<T> {
  /** 读取整体值；不存在或解析失败返回 null。 */
  load(): T | null;
  /** 整体覆盖写入；失败时静默忽略（不抛）。 */
  save(value: T): void;
  /** 删除当前 key（用于"重置"按钮等场景）。 */
  clear(): void;
}

/** 测试 / Node 环境的内存兜底实现，避免 happy-dom 之外报错。 */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  const fakeStorage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
  return fakeStorage;
}

function getStorage(): Storage {
  // happy-dom / 浏览器都提供 localStorage；
  // 但 typeof 检查在严格模式下访问未定义全局会抛 ReferenceError，所以套 try。
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return (globalThis as { localStorage: Storage }).localStorage;
    }
  } catch {
    /* ignore */
  }
  return memoryStorage();
}

export function createStore<T>(key: string): PersistenceStore<T> {
  return {
    load(): T | null {
      try {
        const raw = getStorage().getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return null;
        return parsed as T;
      } catch {
        return null;
      }
    },
    save(value: T): void {
      try {
        getStorage().setItem(key, JSON.stringify(value));
      } catch {
        /* 存储不可用 / 配额满，静默忽略 */
      }
    },
    clear(): void {
      try {
        getStorage().removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

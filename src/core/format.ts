/**
 * 通用格式化工具：日期串、文件名前缀消毒、十六进制颜色解析、文件名拼装。
 * 与 DOM、jsPDF 完全解耦，可在 Node/浏览器/测试环境复用。
 */

/** 把 Date 渲染为 `YYYY-MM-DD`（本地时区）。默认取当前时间。 */
export function todayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 清理用户输入的文件名前缀：
 *   - 去掉 Windows / Unix 路径中非法的字符
 *   - 去掉首尾空白和连字符（避免出现 `-foo-onestroke...pdf`）
 * 适合直接拼接到 PDF 文件名。
 */
export function sanitizePrefix(prefix: string | null | undefined): string {
  if (!prefix) return '';
  return String(prefix)
    // 控制符与文件系统保留字符
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^[-\s]+|[-\s]+$/g, '');
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * 把 `#rrggbb` / `#rgb` 转成 `{r,g,b}`（0-255）。
 * 输入非法时返回黑色 `{0,0,0}`，调用方不需要再判错（视觉上等价于"画不出来"）。
 */
export function hexToRgb(hex: string): RGB {
  let h = String(hex).replace('#', '');
  if (h.length === 3) {
    // #abc → #aabbcc
    h = h.replace(/(.)(.)(.)/, '$1$1$2$2$3$3');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * 拼装 PDF 文件名：`[prefix-]<kind>-<size>-<pages>p-<date>.pdf`。
 * - `kind`：游戏标识，例如 'queens' / 'onestroke'
 * - `size`：棋盘大小描述，例如 '6x6'
 * - `pages`：页数
 * - `prefix`：可选用户前缀（自动消毒）
 * - `date`：可选；默认 today
 */
export function buildFilename(opts: {
  kind: string;
  size: string;
  pages: number;
  prefix?: string | null;
  date?: string;
}): string {
  const date = opts.date ?? todayString();
  const base = `${opts.kind}-${opts.size}-${opts.pages}p-${date}.pdf`;
  const clean = sanitizePrefix(opts.prefix);
  return clean ? `${clean}-${base}` : base;
}

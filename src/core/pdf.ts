/**
 * jsPDF 集成的"懒加载 + 缓存"封装。
 *
 * - 真正需要导出 PDF 时才下载 jspdf 包（Vite 自动 code-split）
 * - 页面初始化时调用 `prefetchJsPDF()` 后台预热，使「下载 PDF」按钮尽快可用
 * - `isJsPDFReady()` 同步查询，用于按钮 disabled 状态
 * - `ensureJsPDF()` 异步确保已加载，给真正的下载流程使用
 *
 * 这样可以避免页面首屏多 ~700KB 阻塞，又保留与 Queens / One-Stroke 原版一致的"加载完才能下载"语义。
 */

import type { jsPDF as JsPDFType } from 'jspdf';

import type { RGB } from './format.ts';

type JsPDFCtor = typeof JsPDFType;

let cached: JsPDFCtor | null = null;
let loading: Promise<JsPDFCtor> | null = null;

/** 同步：当前 jsPDF 是否已加载完成。用于按钮 disabled 控制。 */
export function isJsPDFReady(): boolean {
  return cached !== null;
}

/** 异步：确保 jsPDF 已加载并返回构造函数。多次调用复用同一份 promise。 */
export async function ensureJsPDF(): Promise<JsPDFCtor> {
  if (cached) return cached;
  if (!loading) {
    loading = import('jspdf').then((mod) => {
      cached = mod.jsPDF;
      return cached;
    });
  }
  return loading;
}

/** 后台预热（不等待完成），通常在页面初始化时调用。 */
export function prefetchJsPDF(): void {
  void ensureJsPDF();
}

/** 给 jsPDF 设置填色，参数用 RGB 对象（更易组合）。 */
export function setFill(doc: JsPDFType, rgb: RGB): void {
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
}

/** 给 jsPDF 设置描边色。 */
export function setStroke(doc: JsPDFType, rgb: RGB): void {
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
}

/**
 * 在 PDF 当前页绘制题纸顶部页眉（左日期、右页码）。
 * 与屏幕预览的 `.page-header` 视觉一致。
 *
 * - `pageW` 单位 mm（A4 = 210）
 * - `pad` 单位 mm（默认 12，与多数游戏一致）
 * - `headerY` 文本基线 y（mm），默认 `pad + 5`
 */
export function drawPageHeader(
  doc: JsPDFType,
  opts: {
    pageW?: number;
    pad?: number;
    headerY?: number;
    date: string;
    pageIndex: number;
    totalPages: number;
  },
): void {
  const pageW = opts.pageW ?? 210;
  const pad = opts.pad ?? 12;
  const headerY = opts.headerY ?? pad + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(75, 85, 99); // #4b5563
  doc.text(opts.date, pad, headerY);
  const pageStr = `${opts.pageIndex + 1} / ${opts.totalPages}`;
  const tw = doc.getTextWidth(pageStr);
  doc.text(pageStr, pageW - pad - tw, headerY);
}

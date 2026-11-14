// 今日运势卡片：直接用 Canvas 2D 绘制 1080×1350（4:5），避免 DOM 转图在 iOS 上字型跑掉。
// 版式与 App 一致：白底、靠左、系统字体，只用墨色、灰色和一个强调色。
import type { DailyGua } from './dailyGua';
import type { DailyFortune } from './fortune';
import type { DayInfo } from './lunar';

const W = 1080;
const H = 1350;
const M = 96; // 左右边距
const SANS = '-apple-system, "SF Pro Text", "PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';

const C = {
  bg: '#ffffff',
  ink: '#1f1e1c',
  ink2: '#6f6b66',
  ink3: '#8f8a83',
  accent: '#c8402f',
  line: '#e9e8e4',
};

/** 字距：较新的浏览器才支持，不支持就照常绘制。 */
function tracking(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      // 避免标点落在行首
      if (/[，。、；：！？”’）]/.test(ch)) {
        lines.push(cur + ch);
        cur = '';
        continue;
      }
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 尽量放入一行，放不下时以“等”收尾。 */
function fitWords(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number): string {
  let out = '';
  for (let i = 0; i < words.length; i++) {
    const next = out ? `${out}　${words[i]}` : words[i];
    const rest = i < words.length - 1 ? '　等' : '';
    if (ctx.measureText(next + rest).width > maxWidth) return out ? `${out}　等` : words[i];
    out = next;
  }
  return out;
}

export interface CardInput {
  nickname: string;
  day: DayInfo;
  fortune: DailyFortune;
  gua: DailyGua;
}

export async function renderFortuneCard(input: CardInput): Promise<Blob> {
  const { nickname, day, fortune: f, gua } = input;
  try {
    await document.fonts?.ready;
  } catch {
    /* 忽略 */
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const rule = (y: number) => {
    ctx.fillStyle = C.line;
    ctx.fillRect(M, y, W - M * 2, 2);
  };

  // 封面：星期、日期、农历
  ctx.fillStyle = C.accent;
  ctx.font = `500 34px ${SANS}`;
  tracking(ctx, 7);
  ctx.fillText(day.jieqi ? `${day.weekday}・${day.jieqi}` : day.weekday, M, 156);
  ctx.fillStyle = C.ink;
  ctx.font = `300 124px ${SANS}`;
  tracking(ctx, 0);
  ctx.fillText(day.solarText.replace(/^\d+年/, ''), M - 6, 288);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 34px ${SANS}`;
  tracking(ctx, 3);
  ctx.fillText(`农历${day.lunarText}・${day.lunarYearGz}${day.lunarYearSx}年・${day.dayGz}日`, M, 354);
  rule(410);

  // 十神主题与运势句
  ctx.fillStyle = C.accent;
  ctx.font = `500 30px ${SANS}`;
  tracking(ctx, 6);
  ctx.fillText(`${f.god}日`, M, 488);
  ctx.fillStyle = C.ink;
  ctx.font = `500 64px ${SANS}`;
  tracking(ctx, 4);
  ctx.fillText(f.theme, M - 2, 572);
  ctx.font = `400 38px ${SANS}`;
  tracking(ctx, 1);
  let y = 588;
  for (const l of wrap(ctx, f.line, W - M * 2).slice(0, 2)) {
    y += 60;
    ctx.fillText(l, M, y);
  }

  // 今日一卦：左边画六爻（动爻用强调色），右边卦名与主题
  const top = y + 64;
  const figW = 108;
  const barH = 8;
  const barGap = 15;
  const bar = (x: number, by: number, w: number) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, by, w, barH, barH / 2);
    else ctx.rect(x, by, w, barH);
    ctx.fill();
  };
  gua.lines.forEach((yang, i) => {
    const by = top + i * (barH + barGap) + (i >= 3 ? 14 : 0);
    ctx.fillStyle = gua.moving === 6 - i ? C.accent : C.ink;
    if (yang) bar(M, by, figW);
    else {
      bar(M, by, figW * 0.41);
      bar(M + figW * 0.59, by, figW * 0.41);
    }
  });
  const figH = 6 * barH + 5 * barGap + 14;
  ctx.fillStyle = C.ink;
  ctx.font = `500 60px ${SANS}`;
  tracking(ctx, 4);
  ctx.fillText(gua.full, M + figW + 44, top + 62);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 34px ${SANS}`;
  tracking(ctx, 6);
  ctx.fillText(gua.theme, M + figW + 44, top + 120);
  y = top + figH + 56;
  rule(y);

  // 宜忌：各一行，放不下的以“等”结尾
  y += 74;
  tracking(ctx, 2);
  for (const [label, words] of [['宜', day.yi], ['忌', day.ji]] as const) {
    ctx.fillStyle = label === '宜' ? C.accent : C.ink;
    ctx.font = `500 38px ${SANS}`;
    ctx.fillText(label, M, y);
    ctx.fillStyle = C.ink2;
    ctx.font = `400 34px ${SANS}`;
    ctx.fillText(fitWords(ctx, words, W - M * 2 - 80), M + 80, y);
    y += 68;
  }

  // 冲生肖提醒
  if (f.chong) {
    ctx.fillStyle = C.accent;
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText(`${f.chong.title}，凡事宜缓`, M, y);
  }

  // 页尾
  ctx.fillStyle = C.ink3;
  ctx.font = `400 26px ${SANS}`;
  tracking(ctx, 4);
  ctx.fillText(`${nickname}的今日运势`, M, H - 88);
  ctx.textAlign = 'right';
  ctx.fillText('结果仅供参考', W - M, H - 88);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('卡片产生失败'))), 'image/png'),
  );
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

export function canShareFiles(): boolean {
  if (import.meta.env.MODE === 'artifact') return false;
  try {
    const f = new File([new Blob()], 'x.png', { type: 'image/png' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] });
  } catch {
    return false;
  }
}

export async function shareImage(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '清吉' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

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
  ink: '#1d1d1f',
  ink2: '#6e6e73',
  ink3: '#86868b',
  accent: '#e1251b',
  line: '#e5e5ea',
};

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
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(day.jieqi ? `${day.weekday}・${day.jieqi}` : day.weekday, M, 160);
  ctx.fillStyle = C.ink;
  ctx.font = `700 116px ${SANS}`;
  ctx.fillText(day.solarText.replace(/^\d+年/, ''), M - 4, 282);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 38px ${SANS}`;
  ctx.fillText(`农历${day.lunarText}・${day.lunarYearGz}${day.lunarYearSx}年・${day.dayGz}日`, M, 346);
  rule(396);

  // 十神主题与运势句
  ctx.fillStyle = C.accent;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(`${f.god}日`, M, 470);
  ctx.fillStyle = C.ink;
  ctx.font = `700 68px ${SANS}`;
  ctx.fillText(f.theme, M - 2, 556);
  ctx.font = `400 40px ${SANS}`;
  let y = 568;
  for (const l of wrap(ctx, f.line, W - M * 2).slice(0, 2)) {
    y += 58;
    ctx.fillText(l, M, y);
  }

  // 今日一卦：左边画六爻（动爻用强调色），右边卦名与主题
  const top = y + 56;
  const figW = 120;
  const barH = 13;
  const barGap = 11;
  gua.lines.forEach((yang, i) => {
    const by = top + i * (barH + barGap) + (i >= 3 ? 12 : 0);
    ctx.fillStyle = gua.moving === 6 - i ? C.accent : C.ink;
    if (yang) ctx.fillRect(M, by, figW, barH);
    else {
      ctx.fillRect(M, by, figW * 0.42, barH);
      ctx.fillRect(M + figW * 0.58, by, figW * 0.42, barH);
    }
  });
  const figH = 6 * barH + 5 * barGap + 12;
  ctx.fillStyle = C.ink;
  ctx.font = `700 64px ${SANS}`;
  ctx.fillText(gua.full, M + figW + 40, top + 64);
  ctx.fillStyle = C.ink2;
  ctx.font = `400 38px ${SANS}`;
  ctx.fillText(gua.theme, M + figW + 40, top + 122);
  y = top + figH + 50;
  rule(y);

  // 宜忌：各一行，放不下的以“等”结尾
  y += 70;
  for (const [label, words] of [['宜', day.yi], ['忌', day.ji]] as const) {
    ctx.fillStyle = C.ink;
    ctx.font = `700 38px ${SANS}`;
    ctx.fillText(label, M, y);
    ctx.fillStyle = C.ink2;
    ctx.font = `400 36px ${SANS}`;
    ctx.fillText(fitWords(ctx, words, W - M * 2 - 76), M + 76, y);
    y += 66;
  }

  // 冲生肖提醒
  if (f.chong) {
    ctx.fillStyle = C.accent;
    ctx.font = `600 34px ${SANS}`;
    ctx.fillText(`${f.chong.title}，凡事宜缓`, M, y);
  }

  // 页尾
  ctx.fillStyle = C.ink3;
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText(`${nickname}的今日运势`, M, H - 88);
  ctx.textAlign = 'right';
  ctx.fillText('本结果仅供参考', W - M, H - 88);

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
      await navigator.share({ files: [file], title: '今日一签' });
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

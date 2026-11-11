import { describe, expect, it } from 'vitest';
import rules from '../src/data/qian-rules.json';
import { dailyFortune } from '../src/lib/fortune';
import { computeBazi, getDayInfo, nextSeasonStart } from '../src/lib/lunar';
import { personalReading, seasonRelation } from '../src/lib/personal';
import { getQian } from '../src/lib/qian';
import { CATEGORIES } from '../src/lib/storage';

const GROUPS = ['比劫', '食伤', '财', '官杀', '印'] as const;

describe('此签与你：规则表完整', () => {
  it('五行关系 5 类 × 所问 6 类都有文字', () => {
    for (const g of GROUPS) {
      expect(rules.element.relation[g]).toBeTruthy();
      for (const c of CATEGORIES) expect(rules.element.text[g][c.id], `${g} ${c.id}`).toBeTruthy();
    }
  });
  it('时令 5 种、今日 3 × 5 种都有文字', () => {
    for (const k of ['当令', '将至', '已过', '相对', '四季'] as const) expect(rules.season[k]).toBeTruthy();
    for (const tone of ['good', 'mid', 'bad'] as const) for (const g of GROUPS) expect(rules.today[tone][g]).toBeTruthy();
  });
});

describe('季节（以立春、立夏、立秋、立冬为界）', () => {
  it('立冬当天起算冬季，前一天仍是秋季', () => {
    expect(getDayInfo(new Date(2026, 10, 6)).season).toBe('秋');
    expect(getDayInfo(new Date(2026, 10, 7)).season).toBe('冬');
    expect(getDayInfo(new Date(2027, 1, 3)).season).toBe('冬');
    expect(getDayInfo(new Date(2027, 1, 4)).season).toBe('春');
  });
  it('下一次换季的日期不含当天', () => {
    expect(nextSeasonStart('2026-11-10', '春')).toEqual({ text: '2027年2月4日', jieqi: '立春' });
    expect(nextSeasonStart('2026-11-10', '秋')).toEqual({ text: '2027年8月8日', jieqi: '立秋' });
    expect(nextSeasonStart('2026-11-07', '冬')).toEqual({ text: '2027年11月7日', jieqi: '立冬' });
    expect(nextSeasonStart('2026-01-15', '春')).toEqual({ text: '2026年2月4日', jieqi: '立春' });
  });
  it('签的季节与当下的关系', () => {
    const winter = getDayInfo(new Date(2026, 10, 10));
    // 第 2 签利冬、第 27 签利春、第 3 签利夏、第 1 签利秋、第 15 签利年
    expect([2, 27, 3, 1, 15].map((n) => seasonRelation(getQian(n), winter)))
      .toEqual(['当令', '将至', '相对', '已过', '四季']);
  });
});

describe('personalReading', () => {
  const day = getDayInfo(new Date(2026, 10, 10)); // 戊子日，冬季
  const bazi = computeBazi({ y: 1990, m: 3, d: 8, hour: null });
  const f = dailyFortune(bazi, day, 'x');

  it('三行：五行、时令、今日，且没有未代入的大括号', () => {
    for (let n = 1; n <= 60; n++) {
      for (const c of CATEGORIES) {
        const lines = personalReading(getQian(n), bazi, day, f, c.id);
        expect(lines.map((l) => l.label)).toEqual(['五行', '时令', '今日']);
        for (const l of lines) expect(l.text, `第 ${n} 签 ${c.id}`).not.toMatch(/[{}]|undefined/);
      }
    }
  });

  it('内容随签、随人、随所问而变', () => {
    const a = personalReading(getQian(1), bazi, day, f, 'career');
    const b = personalReading(getQian(2), bazi, day, f, 'career');
    const c = personalReading(getQian(1), bazi, day, f, 'love');
    const other = computeBazi({ y: 1985, m: 7, d: 20, hour: null });
    const d = personalReading(getQian(1), other, day, dailyFortune(other, day, 'x'), 'career');
    expect(a[0].text).not.toBe(b[0].text);
    expect(a[0].text).not.toBe(c[0].text);
    expect(a[1].text).not.toBe(b[1].text);
    expect(other.element).not.toBe(bazi.element);
    expect(a[0].text).not.toBe(d[0].text);
  });

  it('时令一行带出实际的节气日期', () => {
    const q = getQian(1); // 利秋，当下为冬 → 已过
    const text = personalReading(q, bazi, day, f, 'other')[1].text;
    expect(text).toContain('2027年8月8日（立秋）');
    const cur = personalReading(getQian(2), bazi, day, f, 'other')[1].text; // 利冬，当令
    expect(cur).toContain('2027年2月4日（立春）');
  });

  it('不再出现固定的幸运色与幸运数字', () => {
    const all = personalReading(getQian(5), bazi, day, f, 'wealth').map((l) => l.text).join('');
    expect(all).not.toMatch(/幸运色|幸运数字/);
  });
});

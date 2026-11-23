import { describe, expect, it } from 'vitest';
import { addDays, getDayInfo, getHours, parseKey } from '../src/lib/lunar';
import { ACTIVITIES, pickDays, suits } from '../src/lib/zeri';

describe('择日', () => {
  const from = '2026-11-23';

  it('每件事对应的黄历用词，一年里都出现过（没有选了永远挑不到的事）', () => {
    const yi = new Set<string>();
    for (let i = 0; i < 366; i++) for (const t of getDayInfo(parseKey(addDays(from, i))).yi) yi.add(t);
    for (const a of ACTIVITIES) for (const t of a.terms) expect(yi.has(t), `${a.label}：${t}`).toBe(true);
    expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
  });

  it('挑出来的日子：宜里有、忌里没有、不冲生肖；没挑出来的至少有一条不合', () => {
    const days = Array.from({ length: 90 }, (_, i) => getDayInfo(parseKey(addDays(from, i))));
    for (const sx of ['马', '鼠', '龙']) {
      for (const a of ACTIVITIES) {
        const picked = new Set(pickDays(from, 90, a, sx).map((g) => g.day.key));
        for (const day of days) {
          const ok = a.terms.some((t) => day.yi.includes(t)) && !a.terms.some((t) => day.ji.includes(t)) && day.chongSx !== sx;
          expect(picked.has(day.key), `${a.label} ${day.key} 属${sx}`).toBe(ok);
          expect(suits(day, a, sx)).toBe(ok);
        }
      }
    }
  }, 30_000);

  it('日期由近到远，从今天算起；吉时都是不冲生肖的黄道时辰', () => {
    const list = pickDays(from, 60, ACTIVITIES[0], '马');
    expect(list.length).toBeGreaterThan(0);
    list.forEach((g, i) => i && expect(g.day.key > list[i - 1].day.key).toBe(true));
    expect(list[0].day.key >= from).toBe(true);
    for (const g of list) {
      expect(g.day.chongSx).not.toBe('马');
      const hours = getHours(parseKey(g.day.key));
      for (const z of g.hours) {
        const h = hours.find((x) => x.zhi === z)!;
        expect(h.lucky, `${g.day.key} ${z}时`).toBe(true);
        expect(h.chongSx).not.toBe('马');
      }
      expect(g.hours).not.toContain('子'); // 子时冲马
    }
  });

  it('多数的事三个月内挑得到日子', () => {
    const found = ACTIVITIES.filter((a) => pickDays(from, 90, a, '马').length > 0);
    expect(found.length).toBe(ACTIVITIES.length);
  });

  it('黄道日取自值日天神', () => {
    const d = getDayInfo(new Date(2026, 10, 23));
    expect(d.tianShen).toBe('玉堂');
    expect(d.huangdao).toBe(true);
  });
});

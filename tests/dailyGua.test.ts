import { describe, expect, it } from 'vitest';
import data from '../src/data/daily-gua.json';
import guaData from '../src/data/gua.json';
import { dailyGua } from '../src/lib/dailyGua';
import { guaOf, guaOfLines } from '../src/lib/gua';
import { type Birth, dateKey, lunarNumbers } from '../src/lib/lunar';

const A: Birth = { y: 1990, m: 3, d: 8, hour: null };
const B: Birth = { y: 1985, m: 7, d: 20, hour: null };

describe('今日一卦：文字表完整', () => {
  it('六十四卦都有四字左右的主题与解读', () => {
    for (let n = 1; n <= 64; n++) {
      const h = (data.hexagrams as Record<string, { theme: string; text: string }>)[n];
      expect(h, `第 ${n} 卦`).toBeTruthy();
      expect(h.theme.length).toBeGreaterThanOrEqual(4);
      expect(h.text.length).toBeGreaterThan(20);
    }
  });
  it('六个爻位、五种体用关系都有文字', () => {
    for (let n = 1; n <= 6; n++) expect((data.lines as Record<string, string>)[n]).toBeTruthy();
    for (const k of ['用生体', '比和', '体克用', '体生用', '用克体'] as const) expect(data.tiyong[k]).toBeTruthy();
  });
});

describe('起卦', () => {
  it('起卦用的数取自农历：2026-11-11 为午年十月初三、己丑日；闰月按本月计', () => {
    expect(lunarNumbers(2026, 11, 11)).toEqual({ yearZhi: 7, month: 10, day: 3, dayGan: 6, dayZhi: 2 });
    expect(lunarNumbers(2025, 7, 25)).toMatchObject({ yearZhi: 6, month: 6, day: 1 }); // 闰六月初一
  });

  it('按公式算出本卦、动爻、体用与变卦', () => {
    // 生日 1990-03-08 为午年二月十二 → 生日数 7+2+12=21；今天己（6）丑（2）日，午年（7）十月初三
    const g = dailyGua(A, '2026-11-11');
    // 上卦 (6+21)÷8 余 3 → 离；下卦 (2+10+21)÷8 余 1 → 乾；动爻 (7+10+3+21)÷6 余 5 → 五爻
    expect(g.upper.name).toBe('离');
    expect(g.lower.name).toBe('乾');
    expect(g.full).toBe('火天大有');
    expect(g.moving).toBe(5);
    // 动爻在上卦：上卦离（火）为用，下卦乾（金）为体；火克金＝用克体
    expect([g.ti.name, g.yong.name, g.relation]).toEqual(['乾', '离', '用克体']);
    // 五爻由阴变阳：火天大有 → 乾为天
    expect(g.changed.full).toBe('乾为天');
  });

  it('同一人同一天固定；换一天或换一个人就不同', () => {
    expect(dailyGua(A, '2026-11-11')).toEqual(dailyGua(A, '2026-11-11'));
    const days = Array.from({ length: 30 }, (_, i) => dateKey(new Date(2026, 10, 1 + i)));
    const mine = days.map((k) => dailyGua(A, k));
    const theirs = days.map((k) => dailyGua(B, k));
    expect(new Set(mine.map((g) => g.full)).size).toBeGreaterThan(20); // 30 天里有二十几个不同的卦
    // 一周之内不会重复同一卦
    mine.forEach((g, i) => mine.slice(i + 1, i + 7).forEach((h) => expect(h.full).not.toBe(g.full)));
    expect(mine.filter((g, i) => g.full === theirs[i].full && g.moving === theirs[i].moving).length).toBeLessThan(5);
  });

  it('一整年每天都起得出卦，变卦与本卦只差动爻一爻，文字没有未代入的大括号', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 366; i++) {
      const g = dailyGua(A, dateKey(new Date(2026, 0, 1 + i)));
      seen.add(g.no);
      expect(g.moving).toBeGreaterThanOrEqual(1);
      expect(g.moving).toBeLessThanOrEqual(6);
      const diff = g.lines.map((v, k) => (v !== g.changed.lines[k] ? 6 - k : 0)).filter(Boolean);
      expect(diff).toEqual([g.moving]);
      for (const t of [g.theme, g.text, g.lineText, g.tiyongText, g.changeText]) expect(t).not.toMatch(/[{}]|undefined/);
    }
    expect(seen.size).toBe(64); // 一年内走遍六十四卦
  });
});

describe('卦的查表', () => {
  it('由六爻找回卦，与对照表互逆', () => {
    for (const key of Object.keys(guaData.hexagrams)) expect(guaOfLines(guaOf(key).lines).key).toBe(key);
  });
});

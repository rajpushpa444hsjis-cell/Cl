import { describe, expect, it } from 'vitest';
import data from '../src/data/daily-gua.json';
import guaData from '../src/data/gua.json';
import yaoData from '../src/data/yao.json';
import { dailyGua } from '../src/lib/dailyGua';
import { elementGroup } from '../src/lib/fortune';
import { guaOf, guaOfLines } from '../src/lib/gua';
import { type Birth, type Element, dateKey, lunarNumbers } from '../src/lib/lunar';

const A: Birth = { y: 1990, m: 3, d: 8, hour: null };
const B: Birth = { y: 1985, m: 7, d: 20, hour: null };

type Hex = { theme: string; text: string; to: string; yao: string[] };
const HEX = data.hexagrams as Record<string, Hex>;
const YAO = yaoData.hexagrams as Record<string, { judgment: string; lines: { label: string; text: string }[] }>;
const byNo = Object.fromEntries(Object.keys(guaData.hexagrams).map((key) => [guaOf(key).no, guaOf(key)]));
const POS = ['初', '二', '三', '四', '五', '上'];
/** 第 n 爻（由下往上，1 起）应有的爻题：阳爻称九、阴爻称六。 */
function labelOf(lines: number[], n: number) {
  const nine = lines[6 - n] === 1 ? '九' : '六';
  return n === 1 ? `初${nine}` : n === 6 ? `上${nine}` : `${nine}${POS[n - 1]}`;
}

describe('今日一卦：文字表完整', () => {
  it('六十四卦都有主题、解读、变卦走向与六爻白话', () => {
    for (let n = 1; n <= 64; n++) {
      const h = HEX[n];
      expect(h, `第 ${n} 卦`).toBeTruthy();
      expect(h.theme.length).toBeGreaterThanOrEqual(4);
      expect(h.text.length).toBeGreaterThan(20);
      expect(h.to.length).toBeGreaterThan(8);
      expect(h.yao).toHaveLength(6);
      for (const t of h.yao) expect(t.length, `第 ${n} 卦：${t}`).toBeGreaterThan(14);
    }
  });

  it('《周易》原文：六十四卦各六爻，爻题的九、六与卦画逐爻相符', () => {
    for (let n = 1; n <= 64; n++) {
      const y = YAO[n];
      expect(y.judgment.length, `第 ${n} 卦卦辞`).toBeGreaterThan(1);
      expect(y.lines.map((l) => l.label), `第 ${n} 卦`).toEqual([1, 2, 3, 4, 5, 6].map((k) => labelOf(byNo[n].lines, k)));
      for (const l of y.lines) {
        expect(l.text.length).toBeGreaterThan(1);
        expect(l.text, `第 ${n} 卦 ${l.label}`).not.toMatch(/[{}|<>[\]A-Za-z]/);
      }
    }
    // 抽几句对一对
    expect(YAO[1].lines[0]).toEqual({ label: '初九', text: '潜龙勿用。' });
    expect(YAO[2].lines[0].text).toBe('履霜，坚冰至。');
    expect(YAO[21].lines[3].text).toContain('噬干胏'); // 乾（干肉）不是卦名的乾
    expect(YAO[1].lines[2].text).toContain('终日乾乾');
  });

  it('体用六十四组：开头写明两卦所象，五行生克写对', () => {
    const tri = Object.values(guaData.trigrams);
    expect(Object.keys(data.tiyong)).toHaveLength(64);
    for (const ti of tri) for (const yong of tri) {
      const t = (data.tiyong as Record<string, string>)[ti.name + yong.name];
      expect(t, ti.name + yong.name).toMatch(new RegExp(`^${ti.image}为体，${yong.image}为用，`));
      const g = elementGroup(ti.element as Element, yong.element as Element);
      const fact = {
        比劫: `同属${ti.element}`,
        印: `${yong.element}生${ti.element}`,
        食伤: `${ti.element}生${yong.element}`,
        财: `${ti.element}克${yong.element}`,
        官杀: `${yong.element}克${ti.element}`,
      }[g];
      expect(t, ti.name + yong.name).toContain(`，${fact}：`);
    }
  });

  it('所有句子没有一句重复', () => {
    const all = [
      ...Object.values(HEX).flatMap((h) => [h.text, h.to, ...h.yao]),
      ...Object.values(data.tiyong as Record<string, string>),
    ];
    expect(all).toHaveLength(64 * 8 + 64);
    expect(new Set(all).size).toBe(all.length);
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
    // 动爻取大有卦六五的爻辞原文
    expect(g.yao.label).toBe('六五');
    expect(g.yao.text).toBe('厥孚交如，威如；吉。');
    expect(g.yao.reading).toBe(HEX[14].yao[4]);
    expect(g.tiyongText).toMatch(/^天为体，火为用，火克金：/);
    // 五爻由阴变阳：火天大有 → 乾为天
    expect(g.changed.full).toBe('乾为天');
    expect(g.changeText).toBe(`变卦乾为天：${HEX[1].to}`);
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

  it('一整年每天都起得出卦，变卦与本卦只差动爻一爻，爻题与动爻相符', () => {
    const seen = new Set<number>();
    const readings = new Set<string>();
    for (let i = 0; i < 366; i++) {
      const g = dailyGua(A, dateKey(new Date(2026, 0, 1 + i)));
      seen.add(g.no);
      expect(g.moving).toBeGreaterThanOrEqual(1);
      expect(g.moving).toBeLessThanOrEqual(6);
      const diff = g.lines.map((v, k) => (v !== g.changed.lines[k] ? 6 - k : 0)).filter(Boolean);
      expect(diff).toEqual([g.moving]);
      expect(g.yao.label).toBe(labelOf(g.lines, g.moving));
      readings.add(g.yao.reading);
      for (const t of [g.theme, g.text, g.yao.text, g.yao.reading, g.tiyongText, g.changeText]) {
        expect(t.length).toBeGreaterThan(1);
        expect(t).not.toMatch(/[{}]|undefined/);
      }
    }
    expect(seen.size).toBe(64); // 一年内走遍六十四卦
    expect(readings.size).toBeGreaterThan(150); // 动爻的白话一年里有一百多种，不再是六句轮流
  });
});

describe('卦的查表', () => {
  it('由六爻找回卦，与对照表互逆', () => {
    for (const key of Object.keys(guaData.hexagrams)) expect(guaOfLines(guaOf(key).lines).key).toBe(key);
  });
});

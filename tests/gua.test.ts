import { describe, expect, it } from 'vitest';
import guaData from '../src/data/gua.json';
import poemsHant from '../src/data/qian-poems.json';
import poems from '../src/data/qian-poems-hans.json';
import { getQian } from '../src/lib/qian';

describe('卦象数据', () => {
  it('八卦与六十四卦对照表完整，卦序 1–64 各一', () => {
    expect(Object.keys(guaData.trigrams)).toHaveLength(8);
    const nos = Object.values(guaData.hexagrams).map((h) => h.no).sort((a, b) => a - b);
    expect(nos).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });

  it('60 支签各配一卦，互不重复，简繁两份数据一致', () => {
    const keys = poems.poems.map((p) => p.gua);
    expect(new Set(keys).size).toBe(60);
    expect(keys).toEqual(poemsHant.poems.map((p) => p.gua));
    for (const k of keys) expect(guaData.hexagrams).toHaveProperty(k);
  });

  it('有旁证的四支签：甲子乾为天、甲寅水山蹇、甲辰天水讼、乙酉雷水解、己丑水火既济', () => {
    expect([1, 2, 3, 11, 31].map((n) => getQian(n).gua.full))
      .toEqual(['乾为天', '水山蹇', '天水讼', '雷水解', '水火既济']);
  });

  it('六爻由上到下：水山蹇＝坎（阴阳阴）在上、艮（阳阴阴）在下', () => {
    const g = getQian(2).gua;
    expect(g.upper).toEqual({ name: '坎', image: '水', element: '水' });
    expect(g.lower).toEqual({ name: '艮', image: '山', element: '土' });
    expect(g.lines).toEqual([0, 1, 0, 1, 0, 0]);
  });

  it('每支签的卦象解读都提到卦名', () => {
    for (let i = 1; i <= 60; i++) {
      const g = getQian(i).gua;
      expect(g.note.length, `第 ${i} 签`).toBeGreaterThan(40);
      expect(g.note, `第 ${i} 签`).toContain(g.name);
    }
  });

  it('签头的五行与季节可解析', () => {
    for (let i = 1; i <= 60; i++) {
      const q = getQian(i);
      expect(['木', '火', '土', '金', '水']).toContain(q.element);
      expect(['春', '夏', '秋', '冬', '年']).toContain(q.season);
      // 五行与季节相应：木春、火夏、金秋、水冬、土四季
      expect({ 木: '春', 火: '夏', 金: '秋', 水: '冬', 土: '年' }[q.element]).toBe(q.season);
    }
  });
});

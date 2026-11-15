import { describe, expect, it } from 'vitest';
import poems from '../src/data/qian-poems-hans.json';
import poemsHant from '../src/data/qian-poems.json';
import readings from '../src/data/qian-readings.json';
import { cnNumber, getQian } from '../src/lib/qian';
import { CATEGORIES } from '../src/lib/storage';
import { GANS, ZHIS } from '../src/lib/lunar';

describe('六十甲子签资料', () => {
  it('60 首、每首四句七言', () => {
    expect(poems.poems).toHaveLength(60);
    for (const p of poems.poems) {
      expect(p.lines).toHaveLength(4);
      for (const l of p.lines) expect([...l]).toHaveLength(7);
    }
  });

  it('签头依天干分组排列：甲子、甲寅、甲辰…癸亥', () => {
    const expected: string[] = [];
    for (let g = 0; g < 10; g++) {
      // 阳干配阳支、阴干配阴支，各取 6 个
      const start = g % 2;
      for (let z = start; z < 12; z += 2) expected.push(GANS[g] + ZHIS[z]);
    }
    expect(poems.poems.map((p) => p.ganzhi)).toEqual(expected);
  });

  it('每首都有吉凶、签意、白话、逐句解读与十二类建议（现况／建议／留意）', () => {
    for (let i = 1; i <= 60; i++) {
      const q = getQian(i);
      expect(readings.grades).toContain(q.grade);
      expect(q.plain.length).toBeGreaterThan(30);
      expect(q.key.length).toBeGreaterThan(3);
      expect(q.lineNotes).toHaveLength(4);
      for (const n of q.lineNotes) expect(n.length).toBeGreaterThan(4);
      for (const c of CATEGORIES) {
        const a = q.advice[c.id];
        expect(a?.now && a?.do && a?.note, `${i} ${c.id}`).toBeTruthy();
      }
    }
  });

  it('“此签与你”：五种五行关系各有一段，而且写的生克与这支签的五行相符', () => {
    const ORDER = ['木', '火', '土', '金', '水'];
    const at = (el: string, step: number) => ORDER[(ORDER.indexOf(el) + step) % 5];
    for (let i = 1; i <= 60; i++) {
      const q = getQian(i);
      const el = q.element;
      const fact = {
        比劫: `属${el}`,
        印: `${el}生${at(el, 1)}`,
        食伤: `${at(el, 4)}生${el}`,
        官杀: `${el}克${at(el, 2)}`,
        财: `${at(el, 3)}克${el}`,
      };
      expect(Object.keys(q.you).sort()).toEqual(Object.keys(fact).sort());
      for (const [k, f] of Object.entries(fact)) expect(q.you[k as keyof typeof fact], `第 ${i} 签 ${k}`).toContain(f);
    }
  });

  it('“此签与你”：时令三段（利年的签一段），日期用大括号代入', () => {
    for (let i = 1; i <= 60; i++) {
      const q = getQian(i);
      if (q.season === '年') {
        expect(Object.keys(q.when)).toEqual(['四季']);
        continue;
      }
      const w = q.when as { 当令: string; 未到: string; 已过: string };
      expect(Object.keys(w).sort()).toEqual(['当令', '未到', '已过'].sort());
      expect(w.当令).toContain('{end}（{endJq}）');
      expect(w.未到).toContain('{start}（{startJq}）');
      expect(w.已过).toContain('{start}（{startJq}）');
      expect(w.当令, `第 ${i} 签`).toContain(q.season);
      expect(w.未到, `第 ${i} 签`).toContain(q.season);
    }
  });

  it('60 支签的建议与“此签与你”没有一句是重复的，也没有过短的套话', () => {
    const seen = new Map<string, number>();
    for (let i = 1; i <= 60; i++) {
      const q = getQian(i);
      const advice = CATEGORIES.flatMap((c) => Object.values(q.advice[c.id]));
      for (const t of advice) expect(t.length, `第 ${i} 签：${t}`).toBeGreaterThanOrEqual(9);
      for (const t of [...advice, ...Object.values(q.you), ...Object.values(q.when)]) {
        expect(seen.get(t), `第 ${i} 签与第 ${seen.get(t)} 签重复：${t}`).toBeUndefined();
        seen.set(t, i);
      }
    }
    expect(CATEGORIES).toHaveLength(12);
    expect(seen.size).toBe(60 * 36 + 60 * 5 + 47 * 3 + 13);
  });

  it('简体版与繁体核对定稿逐首对应', () => {
    expect(poems.poems).toHaveLength(poemsHant.poems.length);
    poems.poems.forEach((p, i) => {
      const t = poemsHant.poems[i];
      expect(p.no).toBe(t.no);
      expect(p.ganzhi).toBe(t.ganzhi); // 干支字简繁相同
      p.lines.forEach((l, j) => expect([...l]).toHaveLength([...t.lines[j]].length));
    });
  });

  it('中文数字', () => {
    expect([1, 10, 11, 20, 45, 60].map(cnNumber)).toEqual(['一', '十', '十一', '二十', '四十五', '六十']);
  });
});

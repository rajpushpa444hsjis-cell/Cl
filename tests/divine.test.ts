import { describe, expect, it } from 'vitest';
import data from '../src/data/divine.json';
import yaoData from '../src/data/yao.json';
import { type LineValue, castTitle, coinsValue, divine, guaGist, guaImage, guaXiang, isMoving, isYang, lineXiang, positionText, tossCoins } from '../src/lib/divine';
import { dailyGua } from '../src/lib/dailyGua';
import { dateKey } from '../src/lib/lunar';
import terms from '../src/data/terms.json';
import { CATEGORIES } from '../src/lib/storage';
import { cryptoRng } from '../src/lib/random';

const YAO = yaoData.hexagrams as Record<string, { lines: { label: string }[]; extra?: { label: string } }>;

describe('掷钱', () => {
  it('背三字二：三背九、三字六、一背七、两背八', () => {
    expect(coinsValue([1, 1, 1])).toBe(9);
    expect(coinsValue([0, 0, 0])).toBe(6);
    expect(coinsValue([1, 0, 0])).toBe(7);
    expect(coinsValue([0, 1, 1])).toBe(8);
  });
  it('机率约为 六 1/8、七 3/8、八 3/8、九 1/8', () => {
    const n = 80000;
    const count: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    for (let i = 0; i < n; i++) count[coinsValue(tossCoins(cryptoRng))]++;
    expect(count[6] / n).toBeCloseTo(1 / 8, 1);
    expect(count[7] / n).toBeCloseTo(3 / 8, 1);
    expect(count[8] / n).toBeCloseTo(3 / 8, 1);
    expect(count[9] / n).toBeCloseTo(1 / 8, 1);
  });
});

describe('起卦与看哪几句（朱熹《易学启蒙·考变占》）', () => {
  const v = (...xs: number[]) => xs as LineValue[];

  it('六爻都不动：乾为天，看本卦卦辞', () => {
    const d = divine(v(7, 7, 7, 7, 7, 7));
    expect(d.base.full).toBe('乾为天');
    expect(d.changed).toBeNull();
    expect(d.focus).toMatchObject([{ label: '本卦卦辞', text: '元亨。利贞。', main: true }]);
  });

  it('一爻动：看本卦那一爻；九三动，乾变履', () => {
    const d = divine(v(7, 7, 9, 7, 7, 7));
    expect([d.base.full, d.changed?.full]).toEqual(['乾为天', '天泽履']);
    expect(d.moving).toEqual([3]);
    expect(d.focus).toHaveLength(1);
    expect(d.focus[0]).toMatchObject({ label: '本卦・九三', main: true });
    expect(d.focus[0].text).toContain('君子终日乾乾');
  });

  it('两爻动：看本卦两爻，以上面一爻为主', () => {
    const d = divine(v(9, 7, 7, 7, 9, 7));
    expect(d.focus.map((f) => [f.label, f.main])).toEqual([['本卦・九五', true], ['本卦・初九', false]]);
  });

  it('三爻动：看本卦与变卦的卦辞，以本卦为主', () => {
    const d = divine(v(9, 9, 9, 7, 7, 7)); // 下三爻变：乾 → 天地否（天仍在上，下卦成地）
    expect(d.changed?.full).toBe('天地否');
    expect(d.focus.map((f) => [f.label, f.main])).toEqual([['本卦卦辞', true], ['变卦卦辞', false]]);
    expect(d.focus[1].text).toBe('否之匪人，不利君子贞，大往小来。');
  });

  it('四爻动：看变卦里没动的两爻，以下面一爻为主', () => {
    const d = divine(v(9, 9, 7, 9, 8, 9)); // 动 1 2 4 6，不动 3 5
    expect(d.focus.map((f) => [f.from, f.pos, f.main])).toEqual([['changed', 3, true], ['changed', 5, false]]);
    expect(d.focus[0].label).toBe(`变卦・${YAO[d.changed!.no].lines[2].label}`);
    expect(d.focus[0].label).toBe('变卦・九三'); // 不动的爻阴阳不变：第三爻仍是阳
    expect(d.focus[1].label).toBe('变卦・六五');
  });

  it('五爻动：看变卦里唯一没动的那一爻', () => {
    const d = divine(v(9, 9, 9, 9, 8, 9));
    expect(d.focus).toHaveLength(1);
    expect(d.focus[0]).toMatchObject({ from: 'changed', pos: 5, main: true });
  });

  it('六爻全动：乾看用九、坤看用六，其余看变卦卦辞', () => {
    expect(divine(v(9, 9, 9, 9, 9, 9)).focus).toMatchObject([{ label: '用九', text: '见群龙无首，吉。' }]);
    expect(divine(v(6, 6, 6, 6, 6, 6)).focus).toMatchObject([{ label: '用六', text: '利永贞。' }]);
    const d = divine(v(9, 6, 9, 6, 9, 6)); // 水火既济 → 火水未济
    expect([d.base.full, d.changed?.full]).toEqual(['水火既济', '火水未济']);
    expect(d.focus).toMatchObject([{ label: '变卦卦辞', main: true }]);
  });

  it('4096 种结果全部走一遍：变卦只差动爻，恰好一句为主，原文与白话都有', () => {
    const vals: LineValue[] = [6, 7, 8, 9];
    const seen = new Set<string>();
    for (let k = 0; k < 4096; k++) {
      const values = Array.from({ length: 6 }, (_, i) => vals[(k >> (i * 2)) & 3]);
      const d = divine(values);
      seen.add(d.base.full);
      d.base.lines.forEach((l, i) => expect(l).toBe(isYang(values[5 - i]) ? 1 : 0));
      if (d.changed) {
        d.changed.lines.forEach((l, i) => expect(l !== d.base.lines[i]).toBe(isMoving(values[5 - i])));
        expect(d.changed.to.length).toBeGreaterThan(5);
      } else expect(d.moving).toEqual([]);
      expect(d.focus.filter((f) => f.main)).toHaveLength(1);
      expect(d.focus[0].main).toBe(true);
      expect(d.rule).toBe((data.rules as Record<string, string>)[d.moving.length]);
      for (const f of d.focus) {
        expect(f.text.length).toBeGreaterThan(1);
        expect(f.reading.length).toBeGreaterThan(10);
        if (f.kind === 'line') {
          // 爻题的九、六要与那一卦那一爻的阴阳相符
          const g = f.from === 'base' ? d.base : d.changed!;
          expect(f.label.endsWith(YAO[g.no].lines[f.pos! - 1].label)).toBe(true);
          expect(YAO[g.no].lines[f.pos! - 1].label.includes(g.lines[6 - f.pos!] ? '九' : '六')).toBe(true);
        }
      }
    }
    expect(seen.size).toBe(64);
  });

  it('标题：有变卦时接上变卦', () => {
    expect(castTitle(v(7, 7, 7, 7, 7, 7))).toBe('乾为天');
    expect(castTitle(v(7, 7, 9, 7, 7, 7))).toBe('乾为天 → 天泽履');
  });
});

describe('起卦的文字', () => {
  it('六十四卦卦辞白话、用九用六、七条规则都有，且不重复', () => {
    const j = Object.values(data.judgment);
    expect(j).toHaveLength(64);
    expect(new Set(j).size).toBe(64);
    expect(Object.keys(data.rules)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(Object.keys(data.extra)).toEqual(['用九', '用六']);
    expect(YAO[1].extra?.label).toBe('用九');
    expect(YAO[2].extra?.label).toBe('用六');
  });
});

describe('讲得白话一点', () => {
  it('六十四卦各有一句“这一卦的样子”，互不相同', () => {
    const all = Array.from({ length: 64 }, (_, i) => guaImage(i + 1));
    for (const t of all) expect(t).toMatch(/象征/);
    expect(new Set(all).size).toBe(64);
  });

  it('六十四卦在十二个方面各有一句八字以内的话，同一个方面里互不相同', () => {
    for (const c of CATEGORIES) {
      const list = Array.from({ length: 64 }, (_, i) => guaGist(i + 1, c.id));
      for (const t of list) {
        expect(t.length, `${c.label}：${t}`).toBeGreaterThanOrEqual(2);
        expect(t.length, `${c.label}：${t}`).toBeLessThanOrEqual(8);
        expect(t).not.toMatch(/[，。！？\s]/);
      }
      expect(new Set(list).size, c.label).toBe(64);
    }
  });

  it('六个爻位、七条规则都有白话；规则不再用“爻辞”“卦辞”这种词', () => {
    for (let p = 1; p <= 6; p++) expect(positionText(p).length).toBeGreaterThan(8);
    for (const r of Object.values(data.rules)) expect(r).not.toMatch(/爻辞|卦辞/);
  });

  it('看不懂的词：四组都有，起卦那一组讲到本卦、变卦、动爻和怎么算', () => {
    for (const g of ['divine', 'daily', 'zeri', 'qian'] as const) expect((terms[g] as string[][]).length).toBeGreaterThan(3);
    const words = (terms.divine as string[][]).map((t) => t[0]).join('');
    for (const w of ['本卦', '变卦', '动爻', '掷钱怎么算']) expect(words).toContain(w);
  });

  it('今日一卦的“你和外界”拆成白话与术语两段，拼回去就是原句', () => {
    for (let i = 0; i < 40; i++) {
      const g = dailyGua({ y: 1990, m: 3, d: 8, hour: null }, dateKey(new Date(2026, 10, 1 + i)));
      expect(g.tiyongTech).toMatch(/^.为体，.为用，/);
      expect(g.tiyongPlain).not.toMatch(/为体|为用/);
      expect(`${g.tiyongTech}：${g.tiyongPlain}`).toBe(g.tiyongText);
      expect(g.changeText).toBe(`变卦${g.changed.full}：${g.changeTo}`);
    }
  });
});

describe('借鉴《易经・象传》', () => {
  it('六十四卦都有大象原文、白话与放到今天；乾坤的大象是那两句名句', () => {
    expect(guaXiang(1).text).toBe('天行健，君子以自强不息。');
    expect(guaXiang(2).text).toBe('地势坤，君子以厚德载物。');
    const plains = new Set<string>();
    for (let n = 1; n <= 64; n++) {
      const x = guaXiang(n);
      expect(x.text, `第 ${n} 卦`).toMatch(/(君子|先王|后|上|大人)以/);
      expect(x.plain.length).toBeGreaterThan(10);
      expect(x.today.length).toBeGreaterThan(5);
      plains.add(x.plain);
    }
    expect(plains.size).toBe(64);
  });
  it('小象：每卦六句（乾坤多一句讲用九、用六）', () => {
    for (let n = 1; n <= 64; n++) for (let p = 1; p <= 6; p++) expect(lineXiang(n, p).length, `第 ${n} 卦第 ${p} 爻`).toBeGreaterThan(2);
    expect(lineXiang(1, 1)).toBe('潜龙勿用，阳在下也。');
    expect(lineXiang(1, 7)).toBe('用九，天德不可为首也。');
    expect(lineXiang(2, 7)).toBe('用六永贞，以大终也。');
  });
});

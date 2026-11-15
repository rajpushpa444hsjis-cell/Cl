import { describe, expect, it } from 'vitest';
import { LunarUtil } from 'lunar-javascript';
import rules from '../src/data/fortune-rules.json';
import { dailyFortune, elementGroup, tenGod } from '../src/lib/fortune';
import { GANS, computeBazi, getDayInfo } from '../src/lib/lunar';

describe('十神', () => {
  it('100 种组合都与 lunar-javascript 的十神对照表一致', () => {
    for (const a of GANS) for (const b of GANS) {
      expect(tenGod(a, b), `${a}${b}`).toBe(LunarUtil.SHI_SHEN[a + b]);
    }
  });
});

describe('五行关系', () => {
  it('以木为我：木比劫、火食伤、土财、金官杀、水印', () => {
    expect((['木', '火', '土', '金', '水'] as const).map((e) => elementGroup('木', e)))
      .toEqual(['比劫', '食伤', '财', '官杀', '印']);
  });
});

describe('规则表完整性', () => {
  it('十个十神都有主题与八句运势，八十句没有重复', () => {
    const gods = Object.keys(rules.tenGods);
    expect(gods).toHaveLength(10);
    for (const g of Object.values(rules.tenGods)) {
      expect(g.theme).toBeTruthy();
      expect(g.lines).toHaveLength(8);
    }
    const all = Object.values(rules.tenGods).flatMap((g) => g.lines);
    expect(new Set(all).size).toBe(80);
  });
});

describe('dailyFortune', () => {
  const day = getDayInfo(new Date(2026, 10, 7)); // 乙酉日，冲卯（兔）
  it('同一天同一人结果固定', () => {
    const bz = computeBazi({ y: 1990, m: 6, d: 15, hour: null });
    expect(dailyFortune(bz, day, 'a').line).toBe(dailyFortune(bz, day, 'a').line);
  });
  it('同一个十神每十天轮到一次，八十天内的运势句不重复', () => {
    const bz = computeBazi({ y: 1990, m: 6, d: 15, hour: null });
    const seen = new Map<string, string[]>();
    for (let i = 0; i < 80; i++) {
      const f = dailyFortune(bz, getDayInfo(new Date(2026, 10, 7 + i)), '小安|1990615');
      seen.set(f.god, [...(seen.get(f.god) ?? []), f.line]);
    }
    expect(seen.size).toBe(10);
    for (const [god, lines] of seen) {
      expect(lines, god).toHaveLength(8);
      expect(new Set(lines).size, god).toBe(8);
    }
  });
  it('日支冲生肖时显示提醒', () => {
    const rabbit = computeBazi({ y: 1999, m: 6, d: 1, hour: null }); // 己卯年
    expect(rabbit.shengxiao).toBe('兔');
    const f = dailyFortune(rabbit, day, 'x');
    expect(f.chong?.title).toBe('今日冲兔');
    const horse = computeBazi({ y: 1990, m: 6, d: 1, hour: null });
    expect(dailyFortune(horse, day, 'x').chong).toBeNull();
  });
});

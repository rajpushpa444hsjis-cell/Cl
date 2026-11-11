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
  it('十个十神都有主题与至少一句运势', () => {
    const gods = Object.keys(rules.tenGods);
    expect(gods).toHaveLength(10);
    for (const g of Object.values(rules.tenGods)) {
      expect(g.theme).toBeTruthy();
      expect(g.lines.length).toBeGreaterThan(0);
    }
  });
});

describe('dailyFortune', () => {
  const day = getDayInfo(new Date(2026, 10, 7)); // 乙酉日，冲卯（兔）
  it('同一天同一人结果固定', () => {
    const bz = computeBazi({ y: 1990, m: 6, d: 15, hour: null });
    expect(dailyFortune(bz, day, 'a').line).toBe(dailyFortune(bz, day, 'a').line);
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

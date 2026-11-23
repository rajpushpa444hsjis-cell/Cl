import { describe, expect, it } from 'vitest';
import { SHENGXIAO, ZHIS, addDays, getHours, hourIndex } from '../src/lib/lunar';

describe('十二时辰', () => {
  const day = new Date(2026, 10, 17);
  const hours = getHours(day);

  it('依序为子到亥十二格，时段首尾相接', () => {
    expect(hours.map((h) => h.zhi)).toEqual([...ZHIS]);
    expect(hours[0].range).toBe('00:00–00:59');
    expect(hours[1].range).toBe('01:00–02:59');
    expect(hours[11].range).toBe('21:00–22:59');
  });

  it('吉凶取值时天神：黄道为吉、黑道为凶，一天里各六个', () => {
    for (const h of hours) {
      expect(['黄道', '黑道']).toContain(h.type);
      expect(h.lucky).toBe(h.type === '黄道');
      expect(h.god.length).toBeGreaterThan(1);
      expect(h.gz).toHaveLength(2);
      expect(h.gz[1]).toBe(h.zhi);
    }
    expect(hours.filter((h) => h.lucky)).toHaveLength(6);
  });

  it('每个时辰冲的是对面的地支所属的生肖（子冲午＝马）', () => {
    hours.forEach((h, i) => expect(h.chongSx).toBe(SHENGXIAO[ZHIS[(i + 6) % 12]]));
  });

  it('宜忌里不留“无”这个占位', () => {
    for (const h of hours) for (const w of [...h.yi, ...h.ji]) expect(w).not.toBe('无');
  });

  it('过了 23 点，第一格换成当晚的晚子时（干支已属隔天）', () => {
    const late = getHours(day, true);
    expect(late[0].zhi).toBe('子');
    expect(late[0].range).toBe('23:00–23:59');
    expect(late[0].gz).not.toBe(hours[0].gz);
    expect(late[0].gz).toBe(getHours(new Date(2026, 10, 18))[0].gz); // 与隔天的早子时同一柱
    expect(late.slice(1)).toEqual(hours.slice(1));
  });

  it('现在是哪个时辰：23 点后与 0 点都算子时', () => {
    const at = (h: number, m = 0) => hourIndex(new Date(2026, 10, 17, h, m));
    expect([at(23, 30), at(0, 10), at(1), at(2, 59), at(11), at(13), at(21), at(22, 59)]).toEqual([0, 0, 1, 1, 6, 7, 11, 11]);
  });

  it('日期加减天数会跨月跨年', () => {
    expect(addDays('2026-11-17', 7)).toBe('2026-11-24');
    expect(addDays('2026-11-17', 30)).toBe('2026-12-17');
    expect(addDays('2026-12-25', 90)).toBe('2027-03-25');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
});

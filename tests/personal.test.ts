import { describe, expect, it } from 'vitest';
import { dailyFortune } from '../src/lib/fortune';
import { computeBazi, getDayInfo, nextSeasonStart } from '../src/lib/lunar';
import { personalReading, seasonRelation } from '../src/lib/personal';
import { getQian } from '../src/lib/qian';

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

describe('personalReading（此签与你）', () => {
  const day = getDayInfo(new Date(2026, 10, 10)); // 戊子日，冬季
  const bazi = computeBazi({ y: 1990, m: 3, d: 8, hour: null });
  const f = dailyFortune(bazi, day, 'x');
  // 日干每天换一个，隔两天取一位，正好五行各一
  const people = [8, 10, 12, 14, 16].map((d) => computeBazi({ y: 1990, m: 3, d, hour: null }));

  it('平常两行（五行、时令），今天冲生肖才多一行；没有未代入的大括号', () => {
    for (const d of [day, getDayInfo(new Date(2026, 4, 20)), getDayInfo(new Date(2026, 7, 20)), getDayInfo(new Date(2027, 2, 1))]) {
      const fd = dailyFortune(bazi, d, 'x');
      for (let n = 1; n <= 60; n++) {
        const lines = personalReading(getQian(n), bazi, d, fd);
        expect(lines.map((l) => l.label)).toEqual(fd.chong ? ['五行', '时令', '今日'] : ['五行', '时令']);
        for (const l of lines) expect(l.text, `第 ${n} 签`).not.toMatch(/[{}]|undefined/);
      }
    }
  });

  it('今天冲生肖时多出提醒', () => {
    // 找一天日支冲这个人的生肖
    let hit = null;
    for (let i = 0; i < 12 && !hit; i++) {
      const d = getDayInfo(new Date(2026, 10, 10 + i));
      const fd = dailyFortune(bazi, d, 'x');
      if (fd.chong) hit = personalReading(getQian(1), bazi, d, fd);
    }
    expect(hit?.[2].text).toContain(`今日冲${bazi.shengxiao}`);
  });

  it('同一天、同一个人，60 支签的每一行都不相同', () => {
    for (const k of [0, 1]) {
      const texts = Array.from({ length: 60 }, (_, i) => personalReading(getQian(i + 1), bazi, day, f)[k].text);
      expect(new Set(texts).size, k === 0 ? '五行' : '时令').toBe(60);
    }
  });

  it('同一支签，日主五行不同的人看到不同的一段', () => {
    expect(new Set(people.map((p) => p.element)).size).toBe(5);
    for (const n of [1, 15, 28, 42, 60]) {
      const texts = people.map((p) => personalReading(getQian(n), p, day, dailyFortune(p, day, 'x'))[0].text);
      expect(new Set(texts).size).toBe(5);
    }
  });

  it('同一支签，当令、未到、已过各是不同的一段（利年的签只有一段）', () => {
    const days = [new Date(2026, 1, 20), new Date(2026, 4, 20), new Date(2026, 7, 20), new Date(2026, 10, 20)].map(getDayInfo);
    expect(days.map((d) => d.season)).toEqual(['春', '夏', '秋', '冬']);
    for (let n = 1; n <= 60; n++) {
      const q = getQian(n);
      const texts = days.map((d) => personalReading(q, bazi, d, dailyFortune(bazi, d, 'x'))[1].text);
      // 还没到的两季（将至、相对）共用“未到”一段，去掉日期后一年里是三种
      const shapes = new Set(texts.map((t) => t.replace(/\d+年\d+月\d+日/g, '')));
      expect(shapes.size, `第 ${n} 签`).toBe(q.season === '年' ? 1 : 3);
    }
  });

  it('时令一行带出实际的节气日期', () => {
    // 第 1 签利秋，当下为冬 → 已过，指向下一个立秋
    expect(personalReading(getQian(1), bazi, day, f)[1].text).toContain('2027年8月8日（立秋）');
    // 第 2 签利冬，当令 → 这一季到立春为止
    expect(personalReading(getQian(2), bazi, day, f)[1].text).toContain('2027年2月4日（立春）');
    // 第 27 签利春，将至 → 指向立春
    expect(personalReading(getQian(27), bazi, day, f)[1].text).toContain('2027年2月4日（立春）');
  });
});

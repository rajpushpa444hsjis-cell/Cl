// 解签页的“此签与你”：把这支签和求签的人、当下的时令合起来看。
// 两段文字都是每支签各自写的（src/data/qian-readings.json 的 you 与 when），这里只负责判断该取哪一段、代入日期。
import rules from '../data/qian-rules.json';
import { type DailyFortune, elementGroup, fill } from './fortune';
import { type Bazi, type DayInfo, SEASONS, nextSeasonStart } from './lunar';
import type { Qian } from './qian';

export interface PersonalLine {
  label: string;
  text: string;
}

export type SeasonRelation = '当令' | '将至' | '已过' | '相对' | '四季';

/** 签所利的季节与现在的季节是什么关系。 */
export function seasonRelation(q: Qian, day: DayInfo): SeasonRelation {
  if (q.season === '年') return '四季';
  const diff = (SEASONS.indexOf(q.season) - SEASONS.indexOf(day.season) + 4) % 4;
  return (['当令', '将至', '相对', '已过'] as const)[diff];
}

function seasonLine(q: Qian, day: DayInfo): string {
  if (q.season === '年' || '四季' in q.when) return (q.when as { 四季: string }).四季;
  const rel = seasonRelation(q, day);
  if (rel === '当令') {
    // 这一季到下一个换季的节气为止
    const end = nextSeasonStart(day.key, SEASONS[(SEASONS.indexOf(day.season) + 1) % 4]);
    return fill(q.when.当令, { end: end.text, endJq: end.jieqi });
  }
  const start = nextSeasonStart(day.key, q.season);
  return fill(rel === '已过' ? q.when.已过 : q.when.未到, { start: start.text, startJq: start.jieqi });
}

/**
 * 五行：这支签的五行对你的日主是哪种关系（同、生你、你生、克你、你克），取这支签为该关系写的一段。
 * 时令：这支签所利的季节对照当下，带出实际的换季日期。
 * 今日：只在今天的日支冲你的生肖时才多一行提醒。
 */
export function personalReading(q: Qian, bazi: Bazi, day: DayInfo, f: DailyFortune): PersonalLine[] {
  const lines: PersonalLine[] = [
    { label: '五行', text: q.you[elementGroup(bazi.element, q.element)] },
    { label: '时令', text: seasonLine(q, day) },
  ];
  if (f.chong) lines.push({ label: '今日', text: fill(rules.chong, f.vars) });
  return lines;
}

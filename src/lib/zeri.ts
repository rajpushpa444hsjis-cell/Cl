// 择日：挑一件事，列出接下来哪几天适合。
// 一天合适的条件，全部取自黄历（lunar-javascript）：
//   1. 当天的“宜”里有这件事对应的词（例如搬家看“移徙”，签约看“立券”或“交易”）；
//   2. 当天的“忌”里没有这些词；
//   3. 当天的日支不冲这个人的生肖。
// 另外标出黄道日，并列出当天的吉时：黄道时辰、不冲生肖、而且这个时辰不忌这件事。
import { type DayInfo, addDays, getDayInfo, getHours, parseKey } from './lunar';

export interface Activity {
  id: string;
  label: string;
  terms: string[]; // 黄历里对应的词
}

export const ACTIVITIES: Activity[] = [
  { id: 'move', label: '搬家', terms: ['移徙'] },
  { id: 'house', label: '入宅', terms: ['入宅'] },
  { id: 'wed', label: '结婚', terms: ['嫁娶'] },
  { id: 'engage', label: '订婚', terms: ['纳采', '订盟'] },
  { id: 'open', label: '开业', terms: ['开市'] },
  { id: 'deal', label: '签约', terms: ['立券', '交易'] },
  { id: 'travel', label: '出行', terms: ['出行'] },
  { id: 'build', label: '装修', terms: ['修造'] },
  { id: 'ground', label: '动土', terms: ['动土'] },
  { id: 'doctor', label: '求医', terms: ['求医', '治病'] },
  { id: 'money', label: '求财', terms: ['纳财'] },
  { id: 'pray', label: '祈福', terms: ['祈福'] },
];

const has = (list: string[], terms: string[]) => terms.some((t) => list.includes(t));

/** 这一天适不适合这件事（对这个生肖的人）。 */
export function suits(day: DayInfo, act: Activity, shengxiao: string): boolean {
  return has(day.yi, act.terms) && !has(day.ji, act.terms) && day.chongSx !== shengxiao;
}

export interface GoodDay {
  day: DayInfo;
  /** 当天适合办这件事的吉时（地支）。 */
  hours: string[];
}

/** 从 fromKey 起（含当天）往后 days 天里，适合这件事的日子，依日期排列。 */
export function pickDays(fromKey: string, days: number, act: Activity, shengxiao: string): GoodDay[] {
  const out: GoodDay[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDays(fromKey, i);
    const day = getDayInfo(parseKey(key));
    if (!suits(day, act, shengxiao)) continue;
    const hours = getHours(parseKey(key))
      .filter((h) => h.lucky && h.chongSx !== shengxiao && !has(h.ji, act.terms))
      .map((h) => h.zhi);
    out.push({ day, hours });
  }
  return out;
}

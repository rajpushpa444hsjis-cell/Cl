// 解签页的“此签与你”：把这支签和求签的人、当下的时令、今天的日辰合起来看。
// 文字全部来自 src/data/qian-rules.json，这里只负责判断该取哪一句。
import rules from '../data/qian-rules.json';
import { type DailyFortune, type GodGroup, elementGroup, fill } from './fortune';
import { type Bazi, type DayInfo, SEASONS, nextSeasonStart } from './lunar';
import { type Qian, gradeTone } from './qian';
import type { CategoryId } from './storage';

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
  const rel = seasonRelation(q, day);
  if (q.season === '年') return rules.season.四季;
  const vars: Record<string, string> = { s: q.season, now: day.season };
  if (rel === '当令') {
    const next = SEASONS[(SEASONS.indexOf(day.season) + 1) % 4];
    const end = nextSeasonStart(day.key, next);
    vars.end = end.text;
    vars.endJq = end.jieqi;
  } else {
    const start = nextSeasonStart(day.key, q.season);
    vars.start = start.text;
    vars.startJq = start.jieqi;
  }
  return fill(rules.season[rel], vars);
}

function elementLine(q: Qian, bazi: Bazi, category: CategoryId): string {
  const group = elementGroup(bazi.element, q.element);
  const vars = { qianEl: q.element, meEl: bazi.element };
  const relation = fill((rules.element.relation as Record<GodGroup, string>)[group], vars);
  const head = fill(rules.element.head, { ...vars, relation });
  const text = (rules.element.text as Record<GodGroup, Record<CategoryId, string>>)[group][category];
  return head + text;
}

function todayLine(q: Qian, f: DailyFortune): string {
  const tone = gradeTone(q.grade);
  let s = fill(rules.today.head, f.vars) + (rules.today[tone] as Record<GodGroup, string>)[f.group];
  if (f.chong) s += fill(rules.today.chong, f.vars);
  return s;
}

/** 三行：五行（签与你的日主）、时令（签所利的季节与现在）、今日（签的吉凶与今天的十神）。 */
export function personalReading(q: Qian, bazi: Bazi, day: DayInfo, f: DailyFortune, category: CategoryId): PersonalLine[] {
  return [
    { label: '五行', text: elementLine(q, bazi, category) },
    { label: '时令', text: seasonLine(q, day) },
    { label: '今日', text: todayLine(q, f) },
  ];
}

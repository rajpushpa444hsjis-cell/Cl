import rules from '../data/fortune-rules.json';
import { type Bazi, type DayInfo, type Element, ganElement, isYangGan } from './lunar';

export type TenGod =
  | '比肩' | '劫财' | '食神' | '伤官' | '偏财'
  | '正财' | '七杀' | '正官' | '偏印' | '正印';
export type GodGroup = '比劫' | '食伤' | '财' | '官杀' | '印';

const ORDER: Element[] = ['木', '火', '土', '金', '水'];
/** a 生 b */
export const generates = (a: Element): Element => ORDER[(ORDER.indexOf(a) + 1) % 5];
/** a 克 b */
export const controls = (a: Element): Element => ORDER[(ORDER.indexOf(a) + 2) % 5];

/** 以日主为我，求其他天干对我的十神。 */
export function tenGod(dayMaster: string, other: string): TenGod {
  const me = ganElement(dayMaster);
  const it = ganElement(other);
  const same = isYangGan(dayMaster) === isYangGan(other);
  if (it === me) return same ? '比肩' : '劫财';
  if (generates(me) === it) return same ? '食神' : '伤官';
  if (controls(me) === it) return same ? '偏财' : '正财';
  if (controls(it) === me) return same ? '七杀' : '正官';
  return same ? '偏印' : '正印'; // generates(it) === me
}

export function groupOf(god: TenGod): GodGroup {
  switch (god) {
    case '比肩': case '劫财': return '比劫';
    case '食神': case '伤官': return '食伤';
    case '偏财': case '正财': return '财';
    case '七杀': case '正官': return '官杀';
    default: return '印';
  }
}

/** 另一个五行对“我”是哪一类关系（比劫＝相同，食伤＝我生，财＝我克，官杀＝克我，印＝生我）。 */
export function elementGroup(me: Element, other: Element): GodGroup {
  if (other === me) return '比劫';
  if (generates(me) === other) return '食伤';
  if (controls(me) === other) return '财';
  if (controls(other) === me) return '官杀';
  return '印';
}

/** 字串杂凑（FNV-1a），让同一天、同一人看到的运势句固定。 */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export interface DailyFortune {
  god: TenGod;
  group: GodGroup;
  theme: string;
  summary: string;
  line: string;
  chong: null | { title: string; text: string };
  vars: Record<string, string>;
}

export function dailyFortune(bazi: Bazi, day: DayInfo, seed: string): DailyFortune {
  const god = tenGod(bazi.dayMaster, day.dayGan);
  const g = (rules.tenGods as Record<TenGod, { theme: string; summary: string; lines: string[] }>)[god];
  const line = g.lines[hash(`${day.key}|${seed}`) % g.lines.length];
  const vars: Record<string, string> = {
    dayGz: day.dayGz,
    god,
    theme: g.theme,
    shengxiao: bazi.shengxiao,
    chongDesc: day.chongDesc,
  };
  const clashed = day.chongZhi === bazi.yearZhi;
  return {
    god,
    group: groupOf(god),
    theme: g.theme,
    summary: g.summary,
    line,
    chong: clashed ? { title: fill(rules.chong.title, vars), text: fill(rules.chong.text, vars) } : null,
    vars,
  };
}

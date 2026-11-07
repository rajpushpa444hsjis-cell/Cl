import poems from '../data/qian-poems-hans.json';
import readings from '../data/qian-readings.json';
import type { CategoryId } from './storage';

export type Grade = '大吉' | '吉' | '中平' | '小凶' | '凶';
export const QIAN_COUNT = 60;
export const GRADE_NOTE: string = readings.gradeNote;

/** 分类建议：现况、建议、留意（时机或注意事项）。 */
export interface Advice {
  now: string;
  do: string;
  note: string;
}

export interface Qian {
  no: number;
  ganzhi: string;
  attr: string;
  lines: string[]; // 签诗原文四句
  variants: { line: number; others: Record<string, string> }[];
  grade: Grade;
  key: string; // 签意重点
  plain: string; // 白话解说
  lineNotes: string[]; // 逐句诗意，与 lines 一一对应
  advice: Record<CategoryId, Advice>;
}

type Reading = { grade: Grade; key: string; plain: string; lines: string[]; advice: Record<CategoryId, Advice> };

export function getQian(no: number): Qian {
  const p = poems.poems[no - 1];
  const r = (readings.readings as Record<string, Reading>)[String(no)];
  if (!p || p.no !== no || !r) throw new Error(`没有第 ${no} 签`);
  return {
    no,
    ganzhi: p.ganzhi,
    attr: p.attr,
    lines: p.lines,
    variants: (p as { variants?: Qian['variants'] }).variants ?? [],
    grade: r.grade,
    key: r.key,
    plain: r.plain,
    lineNotes: r.lines,
    advice: r.advice,
  };
}

const NUM = '〇一二三四五六七八九';
/** 1 → 一、15 → 十五、60 → 六十 */
export function cnNumber(n: number): string {
  if (n < 10) return NUM[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return (t === 1 ? '' : NUM[t]) + '十' + (u ? NUM[u] : '');
}

export const gradeTone = (g: Grade): 'good' | 'mid' | 'bad' =>
  g === '大吉' || g === '吉' ? 'good' : g === '中平' ? 'mid' : 'bad';

export const SOURCES = poems.sources;

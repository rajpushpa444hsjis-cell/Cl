// 签本的回看与统计。
// 回看：求签时定一个日子，到了那天首页提醒回来标记有没有应验。
// 统计：已标记的签里应验占多少、最常问哪几类。系在签架上的凶签不计入。
import { addDays } from './lunar';
import type { CategoryId, JournalEntry } from './storage';

export const REVIEW_CHOICES = [
  { days: 7, label: '一周后' },
  { days: 30, label: '一个月后' },
  { days: 90, label: '三个月后' },
] as const;

/** 从某一天起算几天后的回看日。 */
export const reviewDate = (fromKey: string, days: number): string => addDays(fromKey, days);

/** 今天该回看的签：已到日子、还没标记、没系在架上；最早到期的排前面。 */
export function dueReviews(journal: JournalEntry[], todayKey: string): JournalEntry[] {
  return journal
    .filter((e) => !e.tied && e.outcome === 'pending' && !!e.reviewAt && e.reviewAt <= todayKey)
    .sort((a, b) => (a.reviewAt! < b.reviewAt! ? -1 : a.reviewAt! > b.reviewAt! ? 1 : a.ts - b.ts));
}

export interface JournalStats {
  total: number; // 签本里的签数（不含签架）
  yes: number;
  no: number;
  /** 已标记的签里应验的比例，0–100 的整数；还没有标记过则为 null。 */
  rate: number | null;
  /** 最常问的类别，最多三个，次数多的在前。 */
  top: { id: CategoryId; n: number }[];
}

export function journalStats(journal: JournalEntry[]): JournalStats {
  const list = journal.filter((e) => !e.tied);
  const yes = list.filter((e) => e.outcome === 'yes').length;
  const no = list.filter((e) => e.outcome === 'no').length;
  const count = new Map<CategoryId, number>();
  for (const e of list) count.set(e.category, (count.get(e.category) ?? 0) + 1);
  const top = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => ({ id, n }));
  return { total: list.length, yes, no, rate: yes + no ? Math.round((yes / (yes + no)) * 100) : null, top };
}

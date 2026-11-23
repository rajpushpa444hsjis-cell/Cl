import { describe, expect, it } from 'vitest';
import { dueReviews, journalStats, reviewDate } from '../src/lib/review';
import type { JournalEntry } from '../src/lib/storage';

const entry = (over: Partial<JournalEntry>): JournalEntry => ({
  id: Math.random().toString(36).slice(2),
  ts: 1,
  dateKey: '2026-11-01',
  solarText: '2026年11月1日',
  lunarText: '丙午年九月廿三',
  dayGz: '己卯',
  category: 'career',
  question: '',
  qianNo: 1,
  qianGz: '甲子',
  grade: '大吉',
  outcome: 'pending',
  note: '',
  ...over,
});

describe('回看', () => {
  it('回看日从求签那天起算', () => {
    expect(reviewDate('2026-11-17', 7)).toBe('2026-11-24');
    expect(reviewDate('2026-11-17', 90)).toBe('2027-02-15');
  });

  it('只提醒：到了日子、还没标记、没系在架上的签；最早到期的在前', () => {
    const j = [
      entry({ id: 'a', reviewAt: '2026-11-20' }),
      entry({ id: 'b', reviewAt: '2026-11-10' }),
      entry({ id: 'c', reviewAt: '2026-11-30' }), // 还没到
      entry({ id: 'd', reviewAt: '2026-11-05', outcome: 'yes' }), // 已标记
      entry({ id: 'e', reviewAt: '2026-11-05', tied: true }), // 系在架上
      entry({ id: 'f' }), // 没定回看
    ];
    expect(dueReviews(j, '2026-11-20').map((e) => e.id)).toEqual(['b', 'a']);
    expect(dueReviews(j, '2026-11-09')).toEqual([]);
  });
});

describe('签本统计', () => {
  it('应验比例只算已标记的；常问的类别取前三；签架上的不计', () => {
    const j = [
      entry({ category: 'love', outcome: 'yes' }),
      entry({ category: 'love', outcome: 'yes' }),
      entry({ category: 'love', outcome: 'no' }),
      entry({ category: 'career' }),
      entry({ category: 'career' }),
      entry({ category: 'wealth' }),
      entry({ category: 'lost' }),
      entry({ category: 'health', tied: true, outcome: 'no' }),
    ];
    const s = journalStats(j);
    expect(s).toMatchObject({ total: 7, yes: 2, no: 1, rate: 67 });
    expect(s.top.map((t) => [t.id, t.n])).toEqual([['love', 3], ['career', 2], ['wealth', 1]]);
  });
  it('还没有标记过任何一支时，比例为空', () => {
    expect(journalStats([entry({})]).rate).toBeNull();
    expect(journalStats([]).top).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/lib/storage';

describe('问事的类别', () => {
  it('十二个类别，各有几个现成的问法，没有重复', () => {
    expect(CATEGORIES).toHaveLength(12);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(12);
    const all = CATEGORIES.flatMap((c) => c.asks);
    for (const c of CATEGORIES) {
      expect(c.asks.length, c.label).toBeGreaterThanOrEqual(5);
      for (const a of c.asks) {
        expect(a, c.label).toMatch(/？$/);
        expect(a.length, a).toBeLessThanOrEqual(17); // 一行放得下
      }
    }
    expect(new Set(all).size).toBe(all.length);
  });
});

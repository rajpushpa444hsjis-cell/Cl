// 八卦与六十四卦的查表（数据见 src/data/gua.json，由 scripts/gen-gua.mjs 产生）。
import guaData from '../data/gua.json';
import type { Element } from './lunar';

/** 八卦之一：卦名、所象、五行。 */
export interface Trigram {
  name: string; // 坎
  image: string; // 水
  element: Element;
}

export interface GuaBase {
  key: string; // 上卦+下卦，如 ☵☶
  full: string; // 水山蹇
  name: string; // 蹇
  no: number; // 六十四卦序
  upper: Trigram;
  lower: Trigram;
  lines: number[]; // 六爻，由上到下，1 阳 0 阴
}

type TrigramData = Trigram & { lines: number[] };
const TRIGRAMS = guaData.trigrams as Record<string, TrigramData>;
const HEXAGRAMS = guaData.hexagrams as Record<string, { no: number; name: string; full: string }>;

/** 先天八卦数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八。 */
export const XIANTIAN = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'] as const;

const pick = (t: TrigramData): Trigram => ({ name: t.name, image: t.image, element: t.element });

export function guaOf(key: string): GuaBase {
  const [up, low] = [...key];
  const h = HEXAGRAMS[key];
  if (!h || !TRIGRAMS[up] || !TRIGRAMS[low]) throw new Error(`未知的卦：${key}`);
  return {
    key,
    full: h.full,
    name: h.name,
    no: h.no,
    upper: pick(TRIGRAMS[up]),
    lower: pick(TRIGRAMS[low]),
    lines: [...TRIGRAMS[up].lines, ...TRIGRAMS[low].lines],
  };
}

/** 由六爻（上到下）找回是哪一卦。 */
export function guaOfLines(lines: number[]): GuaBase {
  const find = (three: number[]) => {
    const hit = Object.entries(TRIGRAMS).find(([, t]) => t.lines.join('') === three.join(''));
    if (!hit) throw new Error(`不是三爻：${three}`);
    return hit[0];
  };
  return guaOf(find(lines.slice(0, 3)) + find(lines.slice(3, 6)));
}

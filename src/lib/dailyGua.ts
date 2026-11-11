// 首页“今日一卦”：依今天的日辰、农历日期与使用者的农历生日起卦，所以每人每天不同。
// 起卦方式参考梅花易数“以数起卦”（数除以八取上下卦、除以六取动爻，卦数用先天八卦数），取数如下：
//   生日数 ＝ 出生的 年支序数（子一…亥十二）＋ 农历月 ＋ 农历日
//   上卦 ＝（今日天干序数 ＋ 生日数）÷ 8 的余数
//   下卦 ＝（今日地支序数 ＋ 农历月 ＋ 生日数）÷ 8 的余数
//   动爻 ＝（今年年支序数 ＋ 农历月 ＋ 农历日 ＋ 生日数）÷ 6 的余数（由下往上数）
//   余数为 0 时，上下卦作 8、动爻作 6。
// 上下卦分别跟着天干、地支走，两者步调不同，所以同一个人一年会走遍六十四卦，一周内不重复。
// 动爻所在的一卦为“用”，另一卦为“体”，再看体用的五行生克。文字全部在 src/data/daily-gua.json。
import data from '../data/daily-gua.json';
import { elementGroup, fill } from './fortune';
import { type GuaBase, type Trigram, XIANTIAN, guaOf, guaOfLines } from './gua';
import { type Birth, lunarNumbers } from './lunar';

export type TiYong = '用生体' | '比和' | '体克用' | '体生用' | '用克体';

export interface DailyGua extends GuaBase {
  theme: string;
  text: string;
  moving: number; // 动爻，1–6，由下往上
  lineText: string;
  ti: Trigram;
  yong: Trigram;
  relation: TiYong;
  tiyongText: string;
  changed: GuaBase & { theme: string };
  changeText: string;
}

const HEX = data.hexagrams as Record<string, { theme: string; text: string }>;
const mod = (n: number, m: number) => n % m || m;

export function dailyGua(birth: Birth, dayKey: string): DailyGua {
  const [y, m, d] = dayKey.split('-').map(Number);
  const today = lunarNumbers(y, m, d);
  const born = lunarNumbers(birth.y, birth.m, birth.d);
  const self = born.yearZhi + born.month + born.day; // 生日数

  const upper = XIANTIAN[mod(today.dayGan + self, 8) - 1];
  const lower = XIANTIAN[mod(today.dayZhi + today.month + self, 8) - 1];
  const base = guaOf(upper + lower);
  const moving = mod(today.yearZhi + today.month + today.day + self, 6);

  // 动爻在下卦（初、二、三爻）则下卦为用、上卦为体；反之亦然
  const [ti, yong] = moving <= 3 ? [base.upper, base.lower] : [base.lower, base.upper];
  const relation = ({ 印: '用生体', 比劫: '比和', 财: '体克用', 食伤: '体生用', 官杀: '用克体' } as const)[
    elementGroup(ti.element, yong.element)
  ];

  // 变卦：把动爻阴阳互换（lines 由上到下，动爻由下往上数）
  const flipped = [...base.lines];
  flipped[6 - moving] ^= 1;
  const changed = guaOfLines(flipped);
  const changedTheme = HEX[changed.no].theme;

  const vars = { ti: ti.name, tiEl: ti.element, yong: yong.name, yongEl: yong.element };
  return {
    ...base,
    theme: HEX[base.no].theme,
    text: HEX[base.no].text,
    moving,
    lineText: (data.lines as Record<string, string>)[moving],
    ti,
    yong,
    relation,
    tiyongText: fill(data.tiyong.head + data.tiyong[relation], vars),
    changed: { ...changed, theme: changedTheme },
    changeText: fill(data.change, { full: changed.full, theme: changedTheme }),
  };
}

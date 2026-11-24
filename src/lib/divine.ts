// 问事起卦：金钱卦。三枚钱掷六次，由初爻（最下）往上到上爻。
// 每枚钱背为三、字为二（《火珠林》：“一背为单，二背为拆，三背为重，三字为交”），三枚相加：
//   六＝老阴（交，动）、七＝少阳（单）、八＝少阴（拆）、九＝老阳（重，动）。
// 动爻阴阳互换得变卦。看哪几句，依动爻的多少，取朱熹《易学启蒙·考变占》的规则：
//   不动看本卦卦辞；一爻动看本卦该爻；两爻动看本卦两爻、以上爻为主；三爻动看本卦与变卦卦辞、以本卦为主；
//   四爻动看变卦两个不动的爻、以下爻为主；五爻动看变卦那个不动的爻；六爻全动，乾看用九、坤看用六，其余看变卦卦辞。
// 原文在 yao.json（脚本自维基文库取出），白话在 divine.json（卦辞）与 daily-gua.json（爻辞）。
import daily from '../data/daily-gua.json';
import data from '../data/divine.json';
import yaoData from '../data/yao.json';
import { type GuaBase, guaOfLines } from './gua';
import { type Rng, cryptoRng, randInt } from './random';
import type { CategoryId } from './storage';

export type LineValue = 6 | 7 | 8 | 9;
/** 一枚钱：1 为背、0 为字。 */
export type Coin = 0 | 1;

type Hex = { judgment: string; lines: { label: string; text: string }[]; extra?: { label: string; text: string } };
const YAO = yaoData.hexagrams as Record<string, Hex>;
const DAILY = daily.hexagrams as Record<string, { theme: string; to: string; yao: string[] }>;
const JUDGMENT = data.judgment as Record<string, string>;
const EXTRA = data.extra as Record<string, string>;
const RULES = data.rules as Record<string, string>;
const VALUES = data.values as Record<string, { name: string; coins: string; mark: string }>;
const IMAGE = data.image as Record<string, string>;
const GIST = data.gist as Record<string, Record<CategoryId, string>>;
const POSITIONS = data.positions as Record<string, string>;

/** 这一卦的样子（卦象）的白话。 */
export const guaImage = (no: number) => IMAGE[no];
/** 这一卦在某个方面的一句话。 */
export const guaGist = (no: number, cat: CategoryId) => GIST[no][cat];
/** 第几爻（1–6，由下往上）代表什么。 */
export const positionText = (pos: number) => POSITIONS[pos];
/** 卦辞的白话（针对所问之事）。 */
export const judgmentReading = (no: number) => JUDGMENT[no];

/** 掷一次：三枚钱。 */
export function tossCoins(rng: Rng = cryptoRng): Coin[] {
  return [randInt(2, rng), randInt(2, rng), randInt(2, rng)] as Coin[];
}
/** 三枚钱的得数：背三、字二相加。 */
export const coinsValue = (coins: Coin[]): LineValue => (6 + coins.reduce<number>((a, b) => a + b, 0)) as LineValue;

export const isYang = (v: LineValue) => v === 7 || v === 9;
export const isMoving = (v: LineValue) => v === 6 || v === 9;
export const valueName = (v: LineValue) => VALUES[v].name;
export const valueCoins = (v: LineValue) => VALUES[v].coins;
export const valueMark = (v: LineValue) => VALUES[v].mark;

export interface Focus {
  from: 'base' | 'changed';
  kind: 'judgment' | 'line' | 'extra';
  pos?: number; // 第几爻，1–6 由下往上
  label: string; // 本卦卦辞／本卦・九三／变卦・六二／用九
  tag?: string; // 爻题，如 九三（只有爻才有）
  text: string; // 原文
  reading: string; // 白话
  main: boolean; // 以这一句为主
}

export interface Divination {
  values: LineValue[]; // 初爻到上爻
  base: GuaBase & { theme: string };
  changed: (GuaBase & { theme: string; to: string }) | null;
  moving: number[]; // 动爻的位置，1–6 由下往上
  rule: string;
  focus: Focus[];
}

export function divine(values: LineValue[]): Divination {
  if (values.length !== 6 || values.some((v) => ![6, 7, 8, 9].includes(v))) throw new Error('要六个 6–9 的数');
  // GuaBase.lines 由上到下；values 由下到上
  const base = guaOfLines(values.map((v) => (isYang(v) ? 1 : 0)).reverse());
  const moving = values.flatMap((v, i) => (isMoving(v) ? [i + 1] : []));
  const still = values.flatMap((v, i) => (isMoving(v) ? [] : [i + 1]));
  const changed = moving.length ? guaOfLines(values.map((v) => (isYang(v) !== isMoving(v) ? 1 : 0)).reverse()) : null;

  const judgment = (g: GuaBase, from: Focus['from'], main: boolean): Focus => ({
    from,
    kind: 'judgment',
    label: from === 'base' ? '本卦卦辞' : '变卦卦辞',
    text: YAO[g.no].judgment,
    reading: JUDGMENT[g.no],
    main,
  });
  const line = (g: GuaBase, from: Focus['from'], pos: number, main: boolean): Focus => {
    const l = YAO[g.no].lines[pos - 1];
    return { from, kind: 'line', pos, label: `${from === 'base' ? '本卦' : '变卦'}・${l.label}`, tag: l.label, text: l.text, reading: DAILY[g.no].yao[pos - 1], main };
  };

  let focus: Focus[];
  switch (moving.length) {
    case 0:
      focus = [judgment(base, 'base', true)];
      break;
    case 1:
      focus = [line(base, 'base', moving[0], true)];
      break;
    case 2: // 以上爻为主
      focus = [line(base, 'base', moving[1], true), line(base, 'base', moving[0], false)];
      break;
    case 3: // 本卦为主
      focus = [judgment(base, 'base', true), judgment(changed!, 'changed', false)];
      break;
    case 4: // 变卦两个不动的爻，以下爻为主
      focus = [line(changed!, 'changed', still[0], true), line(changed!, 'changed', still[1], false)];
      break;
    case 5:
      focus = [line(changed!, 'changed', still[0], true)];
      break;
    default: {
      const extra = YAO[base.no].extra;
      focus = extra
        ? [{ from: 'base', kind: 'extra', label: extra.label, text: extra.text, reading: EXTRA[extra.label], main: true }]
        : [judgment(changed!, 'changed', true)];
    }
  }

  return {
    values,
    base: { ...base, theme: DAILY[base.no].theme },
    changed: changed ? { ...changed, theme: DAILY[changed.no].theme, to: DAILY[changed.no].to } : null,
    moving,
    rule: RULES[moving.length],
    focus,
  };
}

/** 签本里的一行标题：本卦，有变卦时接上变卦。 */
export function castTitle(values: LineValue[]): string {
  const d = divine(values);
  return d.changed ? `${d.base.full} → ${d.changed.full}` : d.base.full;
}

// 产生八卦与六十四卦对照表 src/data/gua.json。
// 卦序、卦名、上下卦取自 npm 包 i-ching，卦名以 OpenCC 转成简体；八卦的象与五行为通行说法。
// 用法：node scripts/gen-gua.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as OpenCC from 'opencc-js';

const iching = createRequire(import.meta.url)('i-ching');
const opencc = OpenCC.Converter({ from: 'tw', to: 'cn' });
// 单独一个“乾”字会被 OpenCC 转成“干”，需保留；“遯”用简体通行的“遁”
const conv = (s) => opencc(s.replace(/乾/g, '\u0000')).replace(/\u0000/g, '乾').replace(/遯/g, '遁');

// 八卦：卦名、所象、五行
const TRIGRAMS = {
  '☰': ['乾', '天', '金'], '☱': ['兑', '泽', '金'], '☲': ['离', '火', '火'], '☳': ['震', '雷', '木'],
  '☴': ['巽', '风', '木'], '☵': ['坎', '水', '水'], '☶': ['艮', '山', '土'], '☷': ['坤', '地', '土'],
};

const trigrams = {};
for (let n = 1; n <= 8; n++) {
  const t = iching.trigram(n);
  const [name, image, element] = TRIGRAMS[t.character];
  if (conv(t.chineseName) !== name) throw new Error(`八卦名不符：${t.character} ${t.chineseName} / ${name}`);
  // lines：由上爻到下爻，1 阳 0 阴
  trigrams[t.character] = { name, image, element, lines: [...t.binary].map(Number) };
}

const hexagrams = {};
for (let n = 1; n <= 64; n++) {
  const h = iching.hexagram(n);
  const up = h.topTrigram.character;
  const low = h.bottomTrigram.character;
  const name = conv(h.chineseName);
  const full = up === low ? `${trigrams[up].name}为${trigrams[up].image}` : `${trigrams[up].image}${trigrams[low].image}${name}`;
  hexagrams[up + low] = { no: n, name, full, char: h.character };
}
if (Object.keys(hexagrams).length !== 64) throw new Error('六十四卦不齐');

const out = {
  _说明: '由 scripts/gen-gua.mjs 产生，请勿手改。键为“上卦+下卦”；lines 由上爻到下爻，1 为阳爻、0 为阴爻。',
  trigrams,
  hexagrams,
};
writeFileSync(new URL('../src/data/gua.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log('trigrams:', Object.keys(trigrams).length, 'hexagrams:', Object.keys(hexagrams).length);

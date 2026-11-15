// 由中文维基文库《周易》各卦页面（scripts/yijing/fetch.sh 下载的 wikitext）取出卦辞与爻辞原文，
// 逐卦检查后转成简体，写入 src/data/yao.json，并把繁体原文留在 docs/周易卦爻辭原文.txt 备查。
//
// 检查项目：六十四卦齐全且卦序不重复；每卦恰好六爻，爻题依序为 初、二、三、四、五、上；
// 爻题的“九／六”必须与 src/data/gua.json 里该卦的卦画（阳／阴）逐爻相符。任何一项不符就中止。
//
// 用法：bash scripts/yijing/fetch.sh && node scripts/yijing/build.mjs
import fs from 'node:fs';
import * as OpenCC from 'opencc-js';

const SRC = '.cache/yijing-sources';
const gua = JSON.parse(fs.readFileSync('src/data/gua.json', 'utf8'));

const pages = [];
for (const f of ['zhouyi-1.json', 'zhouyi-2.json']) {
  const d = JSON.parse(fs.readFileSync(`${SRC}/${f}`, 'utf8'));
  for (const p of Object.values(d.query.pages)) {
    if (p.missing !== undefined) continue;
    pages.push({ title: p.title, text: p.revisions[0].slots.main['*'] });
  }
}

const DIGIT = '一二三四五六七八九';
function cnToInt(s) {
  // 一 … 六十四
  const m = /^(?:([一二三四五六七八九])?十)?([一二三四五六七八九])?$/.exec(s);
  if (!m) throw new Error(`看不懂的数字：${s}`);
  const tens = s.includes('十') ? (m[1] ? DIGIT.indexOf(m[1]) + 1 : 1) : 0;
  return tens * 10 + (m[2] ? DIGIT.indexOf(m[2]) + 1 : 0);
}

/** 去掉 wikitext 标记，只留文字。 */
function clean(s) {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/-\{([^}|]*)\}-/g, '$1') // -{无}- 是“不要做繁简转换”的记号
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/\s+/g, '')
    .trim();
}

// 维基文库的经文在有异文处用 {{另|甲|乙}} 标出两种读法。这里逐条写明取哪一种（1＝甲，2＝乙，或直接给字），
// 原则是取通行本（《周易正义》一系）的读法；表里没有的异文会让脚本中止，不会被悄悄略过。
const VARIANTS = {
  '屯:磐|盤': 1, '蒙:取|娶': 1, '訟:褫|拕': 1, '比:敺|驅': 2,
  '小畜:車|輿': 2, '小畜:輹|輻': 2, '小畜:得|德': 2,
  '否:包|苞': 2, '同人:庸|墉': 2,
  '大有:轝|車': 2, '大有:尫|彭': 2, '大有:佑|右': 1,
  '豫:戠|簪': 2, '噬嗑:昔|臘': '腊', '剝:德車|得輿': 2,
  '大畜:輹|腹': 1, '大畜:告|牿': 2,
  '坎:尊酒簋，貳用缶。内約自牖|樽酒簋貳，用缶，納約自牖': 2, '坎:禔|祗': 2,
  '離:差|嗟': 2, '咸:拇|母': 1, '恒:震|振': 2,
  '大壯:轝|輿': 2, '大壯:腹|輹': 2,
  '晉:鼫|碩': 1, '晉:矢|失': 2, '睽:𧤊|掣': 2,
  '解:惟|維': 2, '解:墉|庸': 1, '損:祀|已': 2, '益:國|邦': 1,
  '姤:蹢躅|𨅙𨄃': 1, '姤:包|苞': 1, '萃:資|咨': 2, '升:享|亨': 2,
  '困:蔾|藜': 2, '困:荼荼|徐徐': 2, '困:轝|車': 2,
  '鼎:刑|形': 2, '艮:裂|列': 2, '艮:閽|薰': 2, '艮:孚|序': 2,
  '歸妹:能|而': 1, '旅:僮|童': 2,
  '中孚:它|他': 1, '中孚:既|几、幾': '幾', '未濟:國|邦': 1,
};
const chosen = [];
function resolveVariants(name, text) {
  return text.replace(/\{\{另\|([^|}]*)\|([^}]*)\}\}/g, (_, a, b) => {
    const pick = VARIANTS[`${name}:${a}|${b}`];
    if (pick === undefined) throw new Error(`${name}：未决定的异文 ${a}｜${b}`);
    const v = pick === 1 ? a : pick === 2 ? b : pick;
    chosen.push(`${name}：${a}／${b} → 取「${v}」`);
    return v;
  });
}

const POS = ['初', '二', '三', '四', '五', '上'];
const hant = {};
for (const { title, text } of pages) {
  const body = text.replace(/<span\s+/g, '<span ').replace(/-\{T\|[^}]*\}-/g, '');
  const no = cnToInt(/第([一二三四五六七八九十]+)卦/.exec(body)[1]);
  const start = body.indexOf('易經：');
  const end = body.indexOf('彖曰');
  if (start < 0 || end < start) throw new Error(`${title}：找不到经文段落`);
  const judgment = [];
  const lines = [];
  let extra = null;
  const scripture = resolveVariants(title.replace('周易/', ''), body.slice(start, end));
  if (/\{\{/.test(scripture)) throw new Error(`${title}：经文里还有没处理的模板`);
  for (const raw of scripture.split('\n')) {
    const m = /^(\*+#?)(.*)$/.exec(raw.trim());
    if (!m) continue;
    const t = clean(m[2]);
    if (!t) continue;
    if (m[1].endsWith('#')) {
      // 爻题后多半是全角冒号，个别页面写成逗号
      const lm = /^(初[九六]|[九六][二三四五]|上[九六]|用[九六])[：，:](.+)$/.exec(t);
      if (!lm) throw new Error(`${title}：看不懂的爻辞：${t}`);
      if (lm[1].startsWith('用')) extra = { label: lm[1], text: lm[2] };
      else lines.push({ label: lm[1], text: lm[2] });
    } else if (m[1].length >= 2) {
      judgment.push(t.replace(/^[^：]{1,3}：/, '')); // 去掉开头的“坤：”
    }
  }
  if (hant[no]) throw new Error(`第 ${no} 卦重复：${title}`);
  hant[no] = { title: title.replace('周易/', ''), judgment: judgment.join(''), lines, extra };
}

// —— 检查 ——
const byNo = Object.fromEntries(Object.entries(gua.hexagrams).map(([key, h]) => [h.no, { key, ...h }]));
for (let no = 1; no <= 64; no++) {
  const h = hant[no];
  if (!h) throw new Error(`缺第 ${no} 卦`);
  if (h.lines.length !== 6) throw new Error(`第 ${no} 卦 ${h.title} 不是六爻：${h.lines.length}`);
  if (!h.judgment) throw new Error(`第 ${no} 卦缺卦辞`);
  const [up, low] = [...byNo[no].key];
  const topDown = [...gua.trigrams[up].lines, ...gua.trigrams[low].lines];
  h.lines.forEach((l, i) => {
    const yang = topDown[5 - i] === 1; // 第 i+1 爻由下往上数
    const want = i === 0 ? `初${yang ? '九' : '六'}` : i === 5 ? `上${yang ? '九' : '六'}` : `${yang ? '九' : '六'}${POS[i]}`;
    if (l.label !== want) throw new Error(`第 ${no} 卦 ${h.title} 第 ${i + 1} 爻应为 ${want}，原文作 ${l.label}`);
  });
}

// —— 转简体 ——
const conv = OpenCC.Converter({ from: 'tw', to: 'cn' });
// OpenCC 会把“乾”转成“干”（乾燥的乾），卦名与“乾乾”都要保留；另有几个字照通行的简体本处理
const KEEP = '';
const toHans = (s) =>
  conv(s.replace(/噬乾/g, '噬干').replace(/乾/g, KEEP)) // 噬嗑的“乾胏”“乾肉”是干肉，其余的乾是卦名
    .replace(new RegExp(KEEP, 'g'), '乾')
    .replace(/於/g, '于')
    .replace(/遯/g, '遁') // 与卦名“遁”一致
    // 以下几个字的简化字在手机字体里常常显示不出来，保留原字
    .replace(/𬙊/g, '纆')
    .replace(/𫗧/g, '餗')
    .replace(/𦈡/g, '繻')
    .replace(/㧑/g, '撝');

const out = {
  _说明:
    '《周易》六十四卦的卦辞与爻辞原文（简体）。由 scripts/yijing/build.mjs 自中文维基文库《周易》各卦页面取出并检查后产生，请勿手改；繁体原文在 docs/周易卦爻辭原文.txt。lines 由初爻到上爻。',
  source: '中文维基文库《周易》（zh.wikisource.org/wiki/周易）',
  hexagrams: {},
};
const report = ['# 周易卦爻辭原文（繁體，取自中文維基文庫《周易》各卦頁面）', ''];
for (let no = 1; no <= 64; no++) {
  const h = hant[no];
  out.hexagrams[no] = {
    judgment: toHans(h.judgment),
    lines: h.lines.map((l) => ({ label: l.label, text: toHans(l.text) })),
  };
  report.push(`## ${no} ${h.title}`, `卦辭：${h.judgment}`, ...h.lines.map((l) => `${l.label}：${l.text}`), ...(h.extra ? [`${h.extra.label}：${h.extra.text}`] : []), '');
}
report.push('## 異文取捨（原文標出兩種讀法之處，取通行本）', ...chosen, '');
// 转完之后不该留下基本多文种平面以外的罕用字（手机上多半显示成方块）
for (const [no, h] of Object.entries(out.hexagrams)) {
  const all = h.judgment + h.lines.map((l) => l.text).join('');
  const rare = [...all].filter((ch) => ch.codePointAt(0) > 0xffff || /[\u3400-\u4dbf]/.test(ch));
  if (rare.length) throw new Error(`第 ${no} 卦有罕用字：${rare.join('')}`);
  if (/[{}|\[\]<>]/.test(all)) throw new Error(`第 ${no} 卦有残留的标记：${all}`);
}
fs.writeFileSync('src/data/yao.json', JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync('docs/周易卦爻辭原文.txt', report.join('\n'));
console.log('64 卦、384 爻检查通过，已写入 src/data/yao.json');

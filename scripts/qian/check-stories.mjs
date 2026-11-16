// 核对每支签的“典故”题目确实出自来源：台东东海龙门天圣宫的签解在每支签下列有五个故事题目，
// src/data/qian-readings.json 里各签 story.title 必须是其中之一（来源为繁体，这里转成简体再比对）。
// 用法：bash scripts/qian/fetch.sh && node scripts/qian/check-stories.mjs
import fs from 'node:fs';
import * as OpenCC from 'opencc-js';

const dir = '.cache/qian-sources/donghai';
const readings = JSON.parse(fs.readFileSync('src/data/qian-readings.json', 'utf8')).readings;
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });
// 来源页面上的错字，显示时改正
const FIX = { 刘备请孔明三顾茅芦: '刘备请孔明三顾茅庐', 吕仙枕黄梁未熟: '吕仙枕黄粱未熟' };

let bad = 0;
for (let n = 1; n <= 60; n++) {
  const html = fs.readFileSync(`${dir}/${n}.html`, 'utf8');
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  const m = /((?:[一二三四五六七八九十]、[^。]{2,30}。\s*)+)\s*籤詩故事/.exec(text);
  const titles = m ? [...m[1].matchAll(/[一二三四五六七八九十]、([^。]{2,30})。/g)].map((x) => t2s(x[1].trim())).map((t) => FIX[t] ?? t) : [];
  const mine = readings[n].story?.title;
  if (!titles.includes(mine)) {
    bad++;
    console.log(`第 ${n} 签：“${mine}”不在来源所列的题目里：${titles.join('／')}`);
  }
}
if (bad) process.exit(1);
console.log('60 支签的典故题目都出自来源所列');

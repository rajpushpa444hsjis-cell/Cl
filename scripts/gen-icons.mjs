// 以内建 Chromium 将 scripts/icon.svg 转成 PWA 图示。用法：node scripts/gen-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
// Playwright 为环境预装（全局），以 require 加载
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');
const out = (p) => new URL(`../public/${p}`, import.meta.url);
mkdirSync(out('icons'), { recursive: true });

// 一般图示：圆角，加一圈极淡的描边（白底图示在白色背景上才看得出轮廓）；maskable：满版底色、图案缩进安全区
const PLATE = '<rect id="plate" width="512" height="512" fill="#ffffff"/>';
if (!svg.includes(PLATE)) throw new Error('icon.svg 的底板写法变了，请同步更新这里');
const rounded = svg.replace(PLATE,
  '<rect id="plate" x="4" y="4" width="504" height="504" rx="112" fill="#ffffff" stroke="#d2d2d7" stroke-width="4"/>');
const maskable = svg.replace('<g id="art">', '<g id="art" transform="translate(256 256) scale(.78) translate(-256 -256)">');
const apple = svg.replace('<g id="art">', '<g id="art" transform="translate(256 256) scale(.9) translate(-256 -256)">');

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(markup, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(out(file), await page.screenshot({ omitBackground: true }));
}
await render(rounded, 192, 'icons/icon-192.png');
await render(rounded, 512, 'icons/icon-512.png');
await render(maskable, 512, 'icons/icon-maskable-512.png');
await render(apple, 180, 'apple-touch-icon.png');
await browser.close();
writeFileSync(out('favicon.svg'), rounded);
console.log('icons done');

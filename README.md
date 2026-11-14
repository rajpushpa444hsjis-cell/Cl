# 清吉

手机优先的网页 App（PWA），结合**每日运势**与**掷筊求签**。不需要后端或账号，所有数据只保存在本机浏览器（localStorage）。

> 本 App 内容仅供娱乐参考，请勿作为重大决定之依据。

## 功能

- **首次设置**：昵称、出生年月日（时辰可选）→ 算出日主（日干）与生肖，之后可在“设置”修改。
  - 生肖以**立春**换年（与八字年柱一致）。
  - **晚子时**（23:00 后）出生，日柱依子初换日算到隔天。
- **今日运势**：公历、农历、日干支、节气、黄历宜忌、冲煞；依今日日干与日主的十神关系给出今日主题与运势句；**今日一卦**（依当天日辰、农历日期与你的生日起卦，给出卦义、动爻、体用生克与变卦）；今日日支冲生肖时显示提醒；可产生 1080×1350 运势卡片分享或保存图片。
- **掷筊求签**：问事 → 禀告 → 掷筊请示 → 摇签（摇手机或按住按钮）→ 掷筊确认（一个或连续三个圣筊，可设置）→ 解签。
  - 筊杯每片正反各 50%：圣筊 50%、笑筊 25%、阴筊 25%（`src/lib/jiao.ts`，以 `crypto.getRandomValues` 取乱数）。
  - 解签内容：签意、签诗、**卦象**（每支签所配的易经卦与解读）、逐句解读、白话解说、所问类别的建议，以及**此签与你**。
  - “此签与你”不是固定的句子，而是三项组合：签的五行对照你的日主（再依所问类别取句）、签所利的季节对照当下节气（带出实际的换季日期）、签的吉凶对照今天的十神。
- **签本**：每次求签自动存档（日期、问题、签号、当日干支），可标记应验与否、加备注；可导出／导入 JSON 备份。
- 动画（签筒摇晃、竹签掉出、筊杯 3D 翻转落地）、Web Audio 合成音效、Android 震动反馈、深色模式。

## 开发

```bash
npm install
npm run dev        # 开发伺服器
npm test           # 单元测试（历法、十神、今日一卦的起卦、筊杯机率、签诗与卦象资料、此签与你的规则）
npm run build      # 产生 dist/（静态档，可放到任何 HTTPS 主机）
npm run preview    # 预览 build 结果
npm run build:artifact -- 输出.html   # 产生单一 HTML 预览版（JS／CSS 内嵌，无 Service Worker、无摇动侦测）
```

技术：Vite + Preact + TypeScript、`vite-plugin-pwa`、[`lunar-javascript`](https://github.com/6tail/lunar-javascript)（干支、农历、宜忌、冲煞、八字一律由它计算）。

## 想调整内容？

| 想改的东西 | 文件 |
|---|---|
| 十神主题、运势句、冲生肖提醒文字 | `src/data/fortune-rules.json` |
| 今日一卦：六十四卦的主题与解读、六个爻位、体用生克的文字 | `src/data/daily-gua.json` |
| 签诗的白话解说、逐句解读、卦象解读、六类建议、吉凶等级 | `src/data/qian-readings.json` |
| 解签页“此签与你”的规则与文字（五行、时令、今日） | `src/data/qian-rules.json` |
| 签诗原文、各签所配的卦 | `src/data/qian-poems.json`（繁体核对定稿）与 `qian-poems-hans.json`（App 显示用的简体版），皆由脚本产生，请勿手改，见下方 |
| 八卦与六十四卦对照表 | `src/data/gua.json`（由脚本产生，请勿手改） |

`fortune-rules.json`、`daily-gua.json`、`qian-rules.json` 的文字可自由修改，`{dayGz}`、`{shengxiao}` 等大括号会自动代入。改完执行 `npm test` 可检查格式。

## 今日一卦怎么起

参考梅花易数“以数起卦”（数除以八取上下卦、除以六取动爻，卦数用先天八卦数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八），取数方式是本 App 自定的：

- 生日数 ＝ 出生的年支序数（子一…亥十二）＋ 农历月 ＋ 农历日
- 上卦 ＝（今日天干序数 ＋ 生日数）÷ 8 的余数
- 下卦 ＝（今日地支序数 ＋ 农历月 ＋ 生日数）÷ 8 的余数
- 动爻 ＝（今年年支序数 ＋ 农历月 ＋ 农历日 ＋ 生日数）÷ 6 的余数，由下往上数

动爻所在的一卦为“用”，另一卦为“体”，依两卦的五行看生克；动爻阴阳互换得到变卦。上下卦分别跟着天干、地支走，步调不同，所以同一个人一年会走遍六十四卦，一周之内不会重复（见 `tests/dailyGua.test.ts`）。逻辑在 `src/lib/dailyGua.ts`。

## 签诗原文的来源与核对

传统六十甲子签原文**不是凭记忆产生**，而是从三个来源下载后逐字比对：

1. 高雄三凤宫（庙方官网）
2. 台湾好庙网・签卦结缘赞
3. 台东东海龙门天圣宫（庙方官网）

规则：每一栏（干支、属性、四句诗）两家以上相同即采用；三家皆异者人工裁定并写明理由。360 栏中 336 栏三家完全一致，24 栏有差异，逐笔列在 **[docs/籤詩核對報告.md](docs/籤詩核對報告.md)**；差异也会在 App 解签页的“版本异文”中显示。

**卦象**：传统六十甲子签每一签都配有一个卦。各签的卦以柿子文化《天上聖母感應靈籤：六十甲子吉祥籤詩卡》目录所印为准，并与两个网站在签头印的卦象逐签比对：60 签中 54 签三者相同；其余 6 签两个网站与书不同，而网站的版本正好都与另一签重复（书上 60 签互不重复），故采用书的版本。读法（上卦在前）另有旁证。细节同样写在核对报告里。

重新核对：

```bash
bash scripts/qian/fetch.sh                 # 下载三个来源与签诗书目录到 .cache/qian-sources
python3 -I scripts/qian/build.py           # 比对并重新产生 qian-poems.json（原文与卦象）与核对报告
node scripts/gen-poems-hans.mjs            # 由繁体定稿转出简体版 qian-poems-hans.json
```

白话解说、逐句解读、卦象解读、分类建议与吉凶等级皆为本 App 原创撰写；吉凶等级依诗意与传统签解综合评定，各庙版本不一。

## 其他脚本

- `node scripts/gen-poems-hans.mjs`：以 OpenCC 把繁体核对定稿的签诗转成简体（核对时以三个台湾来源的繁体原文逐字比对，因此定稿保留繁体）。
- `node scripts/gen-gua.mjs`：由 npm 包 `i-ching` 的卦序、卦名与上下卦产生 `src/data/gua.json`。
- `node scripts/gen-icons.mjs`：由 `scripts/icon.svg` 产生 PWA 图示（需 Playwright）。

## 部署（GitHub Pages）

`.github/workflows/deploy.yml` 会在合并到 `main` 时自动测试、建置并部署，网址为：

**https://rajpushpa444hsjis-cell.github.io/Cl/**

第一次部署前要在 GitHub 上设置两件事：

1. **仓库改为公开**（免费方案的 GitHub Pages 只支持公开仓库；GitHub Pro 可跳过）：Settings → General → 最下方 Danger Zone → Change visibility → Public。
2. **启用 Pages**：Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。

之后合并到 `main` 就会自动部署；也可以在 Actions 页选“部署到 GitHub Pages” → Run workflow 手动执行。

摇动侦测（DeviceMotion）必须在 HTTPS 下使用，GitHub Pages 本身就是 HTTPS。`vite.config.ts` 设置了 `base: './'`，放在子路径 `/Cl/` 也能正常运作；`dist/` 也可以上传到任何其他静态网站主机。

## 加到手机主屏幕

**iPhone（Safari）**
1. 用 Safari 开启网址（其他浏览器在 iOS 上可能没有此选项）。
2. 点下方工具列的“分享”按钮（方框加向上箭头）。
3. 往下滑，点“添加到主屏幕”。
4. 名称保留“清吉”，点右上角“加入”。
5. 从主屏幕图标打开，就是全屏 App。第一次摇签时点“启用摇一摇”，并允许访问“运动与方向”。

**Android（Chrome）**
1. 用 Chrome 开启网址。
2. 点右上角“⋮”选单。
3. 点“安装应用”或“添加到主屏幕”。
4. 确认“安装／新增”，主屏幕就会出现图标。

> 数据保存在该浏览器的本地存储里：从主屏幕开启的 App 与在浏览器分页开启的网站，在 iPhone 上可能是**两份不同的数据**。建议固定从主屏幕图标打开，并定期在“设置 → 导出备份”。

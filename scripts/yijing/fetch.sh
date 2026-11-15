#!/usr/bin/env bash
# 下载《周易》六十四卦的卦辞、爻辞原文（中文维基文库“周易/卦名”各页的 wikitext）到 .cache/yijing-sources。
# 一次请求取多页，遇到限流（429）会等一会再试。之后执行 node scripts/yijing/build.mjs。
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=.cache/yijing-sources
mkdir -p "$OUT"
UA='static-site-build-script/1.0 (curl)'
API='https://zh.wikisource.org/w/api.php'

# 卦名用维基文库的页名（繁体）；写法不确定的两种都列，不存在的页面会被略过
A='乾|坤|屯|蒙|需|訟|師|比|小畜|履|泰|否|同人|大有|謙|豫|隨|蠱|臨|觀|噬嗑|賁|剝|復|無妄|无妄|大畜|頤|大過|坎|離|習坎'
B='咸|恆|恒|遯|遁|大壯|晉|明夷|家人|睽|蹇|解|損|益|夬|姤|萃|升|困|井|革|鼎|震|艮|漸|歸妹|豐|旅|巽|兌|兑|渙|節|中孚|小過|既濟|未濟'

get() { # $1 文件名  $2 以 | 分隔的卦名
  local titles
  if [ -s "$OUT/$1" ]; then echo "已有 $1"; return 0; fi
  titles=$(printf '%s' "$2" | sed 's/[^|]*/周易\/&/g')
  for wait in 0 60 180 300 600 900; do
    sleep "$wait"
    code=$(curl -sS -m 60 -A "$UA" -o "$OUT/$1.tmp" -w '%{http_code}' -G "$API" \
      --data-urlencode action=query --data-urlencode prop=revisions --data-urlencode rvprop=content \
      --data-urlencode rvslots=main --data-urlencode redirects=1 --data-urlencode format=json \
      --data-urlencode "titles=$titles") || code=000
    if [ "$code" = 200 ]; then mv "$OUT/$1.tmp" "$OUT/$1"; echo "ok $1"; return 0; fi
    echo "HTTP $code，稍后重试 $1" >&2
  done
  echo "下载失败：$1" >&2; return 1
}

get zhouyi-1.json "$A"
sleep 20
get zhouyi-2.json "$B"

/* =============================================================================
 * 字体子集化 —— 25MB 的 LXGW WenKai 变成一页专用的 woff2。
 *
 * ## 字符集按 GB 标准切，不按页面扫
 *
 * 早先这个脚本是从 `index.html` / `landing.js` / `landing.css` 里**扫**出可见字符
 * 再切的。实测那是对的——当时官网用到的 601 字里有 155 字不在游戏那份子集里，
 * 掉到宋体回退就成了豆腐块——但它是**错的方向**：字集跟着文案走，等于每改一句
 * 宣传语就得重切一次字体，把工具的负担转嫁给了写文案的人。
 *
 * 所以底座换成 **GB2312 全集**：区 1–9 的符号区（常用标点、全角符号）+ 区 16–55 的
 * 一级汉字 3755 + 区 56–87 的二级汉字 3008，合计 6763 字。这一套覆盖日常中文的
 * 99.9% 以上，于是**改文案不需要碰字体**。
 *
 * 再并上页面扫出来的字符作为兜底：万一有人写了个 GB2312 之外的真生僻字，
 * 页面本身仍然完整——那种情况由 `font:check` 报出来，而不是默默缺字。
 *
 * ## 为什么不用现成的 GB2312 码表遍历写法
 *
 * 游戏那份 `tools/subset-font.mjs` 用 `String.fromCharCode(code)` 遍历
 * 0xB0A1–0xD7F9。那条路走不通：`0xB0A1` 是 **GB2312 的双字节编码**，
 * 不是 Unicode 码位，`String.fromCharCode(0xB0A1)` 拿到的是 U+00B0U+00A1
 * 两个拉丁字符，既切不进真实汉字（3755 个常用字一个都没进去），
 * 又白白往字体里塞了几千个垃圾字形。这里用 `TextDecoder('gbk')` 真正解码。
 *
 * ## 用法
 *
 *   npm run font          # 重新切，写入 fonts/ui.woff2
 *   npm run font:check    # 只校验已提交的字体够不够用
 *
 * 源字体默认 `D:\LXGWWenKai-Regular.ttf`，可用环境变量覆盖：
 *   GIFT188_SRC_FONT=/path/to/LXGWWenKai-Regular.ttf npm run font
 *
 * 切出来的字体直接提交。**部署不需要这一步**——Pages 只是把仓库里的文件
 * 原样发出去，字体早就在仓库里了；这个脚本只在**改了字集定义**之后才需要跑。
 * ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_FONT = process.env.GIFT188_SRC_FONT || 'D:/LXGWWenKai-Regular.ttf';
const OUT = join(ROOT, 'fonts', 'ui.woff2');
const MANIFEST = join(ROOT, 'fonts', 'charset.json');

/**
 * GB2312 全集。
 *
 * GB2312 是双字节编码：首字节 0xA1–0xF7，次字节 0xA1–0xFE，首字节落在
 * 0xAA–0xAF 的六个区在标准里没定义（留给用户自定义区），跳过。
 *
 * 区号 → 内容：
 *   区  1– 9  (0xA1–0xA9) 符号区：汉字常用标点、俄文、希腊文、制表符……
 *   区 10–15 (0xAA–0xAF) 未定义
 *   区 16–55 (0xB0–0xD7) 一级汉字 3755（按拼音）
 *   区 56–87 (0xD8–0xF7) 二级汉字 3008（按笔画）
 *
 * 用 `gbk` 解码器而不是 `gb2312`：WHATWG Encoding Standard 把 `gb2312`
 * 这个标签映射到 GBK，而 GBK 完全包含 GB2312，字节流上的结果一致。
 * 未分配的码位解码成 U+FFFD，过滤掉。
 *
 * `level` 控制切到哪一级：1 = 符号区 + 一级汉字（3755，覆盖日常 99.7%，
 * 体积约省一半），2 = 再加二级汉字（合计 6763）。
 */
function gb2312(level = 2) {
  const bytes = new Uint8Array(2);
  const out = [];
  let hanzi = 0;
  for (let hi = 0xa1; hi <= 0xf7; hi++) {
    if (hi >= 0xaa && hi <= 0xaf) continue;   // 未定义的用户自定义区
    if (level === 1 && hi >= 0xd8) break;    // 二级汉字（按笔画排的那 3008）
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      bytes[0] = hi;
      bytes[1] = lo;
      const ch = new TextDecoder('gbk').decode(bytes);
      if (ch === '\uFFFD' || ch.length === 0) continue;
      if (ch.charCodeAt(0) > 0x2e80) hanzi++;   // CJK 统一表意文字 + CJK 标点
      out.push(ch);
    }
  }
  return { chars: out, hanzi };
}

/**
 * GB2312 装不下的、页面确实在用的那些。
 *
 * ASCII 与拉丁字母：GB2312 区 2 只收了部分大写拉丁，全角数字与标点也在符号区，
 * 但半角那一套不在，所以这里显式补齐。
 */
const EXTRAS = [
  '0123456789',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  ' .,:;!?/\\|-_=+*()[]{}<>\'"%&#@$€£¥~^`',
  '←→↑↓↔·—–…“”‘’《》「」【】（）〔〕×÷°±≈≤≥≠∑',
  '¥€™®©™№§¶†‡•‰′″',
];

/** 页面真正会渲染的部分：去掉注释、script/style、标签。 */
function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')   // 注释不渲染，但里面常有中文，别混进来
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

/** JS / CSS 里的引号字符串。JS 生成的字、CSS content 里的字都在这里。 */
function quoted(src) {
  return [...src.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)]
    .map((m) => m[1] ?? m[2] ?? '')
    .join(' ');
}

/** HTML 实体——页面里的 &amp; 之类解码后才是真正的字符。 */
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', times: '×', middot: '·',
  laquo: '«', raquo: '»', copy: '©', reg: '®', deg: '°',
  rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔',
};
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, g) => {
    if (g[0] === '#') {
      const cp = g[1] === 'x' || g[1] === 'X'
        ? parseInt(g.slice(2), 16)
        : parseInt(g.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return ENTITIES[g] ?? m;
  });
}

/** 页面自身用到的字——兜底，不是底座。 */
function pageCharset() {
  const read = (f) => readFileSync(join(ROOT, f), 'utf8');
  const raw = [
    decodeEntities(visibleText(read('index.html'))),
    quoted(read('landing.js')),
    quoted(read('landing.css')),
  ].join(' ');
  return [...new Set([...raw])].filter((c) => {
    const cp = c.codePointAt(0);
    return cp > 0x1f && cp !== 0x7f;
  });
}

const gb = gb2312(Number(process.env.GIFT188_GB_LEVEL || 2));
const page = pageCharset();
const gbSet = new Set(gb.chars);
const extrasSet = new Set(EXTRAS.join(''));
// EXTRAS 是几条字符串，**必须摊平成单字**再并进来——直接 `...EXTRAS` 会把
// '0123456789' 整条当成一个元素，字数统计和诊断都会跟着错（字体本身倒是
// 无恙：最后 join('') 又拼回去了）。
const all = [...new Set([...gb.chars, ...EXTRAS.join(''), ...page])]
  .filter((c) => c.codePointAt(0) > 0x1f && c.codePointAt(0) !== 0x7f)
  .sort();

// 页面用到、而 GB2312 与符号补充都没覆盖的——真正需要盯的那几个
const extraOnly = all.filter((c) => !gbSet.has(c) && !extrasSet.has(c));
console.log(`[font] GB2312 ${gb.chars.length} 字（其中汉字 ${gb.hanzi}）+ 符号补充 + 页面兜底 ${page.length}`);
console.log(`[font] 合计 ${all.length} 字；页面用到但 GB2312 与符号补充之外的：${extraOnly.length} 个`
  + (extraOnly.length
    ? ` —— ${extraOnly.map((c) => `${c}(U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(' ')}`
    : ''));

const check = process.argv.includes('--check');

if (!existsSync(SRC_FONT)) {
  console.error(`[font] 找不到源字体：${SRC_FONT}`);
  console.error('        用 GIFT188_SRC_FONT=<路径> 指定。');
  process.exit(1);
}

// ---- 校验模式 ---------------------------------------------------------------
//
// 两条：
//   ① 已提交的字体是否盖住了页面**此刻**用到的每一个字（漏字会当场暴露）
//   ② 字体与 `fonts/charset.json` 记的规模是否一致（说明字集定义改了却没重切）
//
// ① 只探页面那几百个字。GB2312 全集有七千多个，逐个单独子集化要好几分钟，
// 而它是从码表**推导**出来的，不是从字体里查出来的——真要验它该验的是「字集
// 定义有没有变」，那是 ② 的事。
if (check) {
  const fontverter = (await import('fontverter')).default;
  const ttf = await fontverter.convert(readFileSync(OUT), 'truetype');
  const probe = (s) => subsetFont(ttf, s, { targetFormat: 'truetype' }).then((b) => b.length);

  const base = await probe('');
  const missing = [];
  for (const ch of page) {
    if ((await probe(ch)) <= base * 1.02) missing.push(ch);
  }
  if (missing.length) {
    console.error(`[font] fonts/ui.woff2 缺 ${missing.length} 个字符：${missing.join('')}`);
    console.error('       跑 `npm run font` 重新切。');
    process.exit(1);
  }

  const man = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
  const bytes = readFileSync(OUT).length;
  if (!man || man.count !== all.length) {
    console.error(`[font] 字集定义已变（现在 ${all.length} 字，manifest 记着 ${man ? man.count : '无'}）`);
    console.error('       跑 `npm run font` 重新切。');
    process.exit(1);
  }
  if (man.bytes !== bytes) {
    console.error(`[font] 字体大小 ${bytes} 与 manifest 记的 ${man.bytes} 不符`);
    console.error('       跑 `npm run font` 重新切。');
    process.exit(1);
  }
  console.log(`[font] OK —— 页面 ${page.length} 字全覆盖，字集 ${all.length} 字与 manifest 一致`);
  process.exit(0);
}

// ---- 切字体 ----------------------------------------------------------------
mkdirSync(dirname(OUT), { recursive: true });
const src = readFileSync(SRC_FONT);
console.log(`[font] 源字库 ${(src.length / 1048576).toFixed(1)}MB  ${SRC_FONT}`);

const woff2 = await subsetFont(src, all.join(''), { targetFormat: 'woff2' });
writeFileSync(OUT, woff2);
console.log(`  ✓ fonts/ui.woff2  ${(woff2.length / 1024).toFixed(0)} KB` +
  `（省掉 ${((1 - woff2.length / src.length) * 100).toFixed(1)}%）`);

writeFileSync(
  MANIFEST,
  JSON.stringify(
    { gb2312: gb.chars.length, gb2312Hanzi: gb.hanzi, pageFallback: page.length, count: all.length, bytes: woff2.length, source: SRC_FONT },
    null, 2
  ) + '\n',
  'utf8',
);
console.log('  ✓ fonts/charset.json');
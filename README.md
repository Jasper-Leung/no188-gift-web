# no188-gift-web

[188号礼物](https://jasper-leung.github.io/no188-gift-web/) 的**官网仓库**：根目录就是官网介绍页本身，GitHub Pages 原样发出去。

游戏本体不在这里，在 [`Jasper-Leung/188js`](https://github.com/Jasper-Leung/188js)（源码 + 构建产物），线上试玩走 https://jasper-leung.github.io/188js/ 。本仓库没有构建步骤，`push` 即部署。

## 这里有什么

```
index.html      介绍页（站点根路径）
landing.css     介绍页样式
landing.js      语言切换 + 复制按钮
media/          hero.jpg / poster.jpg / demo.mp4（录屏）+ 英配字幕 .srt / .ass
fonts/ui.woff2  子集化字体，介绍页在用
tools/          subset-font.mjs（只在改文案后需要跑，见下）
submission/     只有一个跳转页，把旧地址引回根路径
```

页面里所有引用都是相对的，所以站点跑在 `/no188-gift-web/` 子路径下而不是域名根——这是刻意的。

## 试玩地址

页面（`index.html`）上挂了两个镜像：

- https://jasper-leung.github.io/188js/ （GitHub Pages，主按钮）
- https://gift-no188.jasperaptx4868.workers.dev/ （Cloudflare，备用）

主按钮用 GitHub Pages 是因为实测 `workers.dev` 在本机 DNS 被劫持到无关 IP、连不上；GitHub Pages 返回 200。两者内容相同。

## 字体

`fonts/ui.woff2` 是 LXGW WenKai 按 **GB2312 全集**切的子集：区 1–9 的符号区 +
一级汉字 3755 + 二级汉字 3008，共 7614 字，再并上拉丁/符号补充与页面兜底，
合计 **7722 字 / 1.55 MB**（源字库 24.4 MB，省掉 93.7%）。

**按 GB 标准切，是为了改文案不用碰字体。** 最早那版是从 `index.html`、
`landing.js`、`landing.css` 里扫出可见字符再切的——那修好了一个真问题（见下），
但方向是错的：字集跟着文案走，等于每改一句宣传语就得重切一次字体。
GB2312 覆盖日常中文的 99.9% 以上，改文案永远碰不到它。

那次真问题是这样的：`fonts/ui.woff2` 曾直接用游戏仓库那份子集（切的是**游戏 UI** 的
880 字 / 185 KB），而官网的中文跟游戏里的不是同一批字——实测官网用到的 601 个可见字符里
**155 个不在那份子集里**（153 个汉字，外加 `–` 和 `↔`）。缺的那些字会掉到 CSS 的
回退栈（宋体 / Noto Serif CJK），于是没装这些字体的机器上就是豆腐块。
「同一款字体」不等于「同一个子集」。

```bash
npm install            # 只装 subset-font / fontverter，产物已入库，部署不需要
npm run font           # 重新切，写入 fonts/ui.woff2
npm run font:check     # 只校验已提交的字体够不够用
```

**改文案不需要跑 `npm run font`**。只有改了**字集定义**（也就是改了下面那段 GB2312
的取字范围）才需要重切。要换一级/全集：

```bash
GIFT188_GB_LEVEL=1 npm run font   # 只切一级汉字，4695 字 / 924 KB
GIFT188_GB_LEVEL=2 npm run font   # 默认，全集 7722 字 / 1.55 MB
```

`font:check` 查两件事：已提交的字体是否盖住页面**此刻**用到的每一个字；以及字体与
`fonts/charset.json` 记的规模是否一致（说明字集定义改了却没重切）。它**不**逐字验
GB2312 全集——那七千多字逐个单独子集化要好几分钟，而字集是从码表推导出来的，
真要验它该验的是「定义有没有变」，也就是第二条。

页面用到的、国标与符号补充都没覆盖的字目前只有一个：`個`(U+500B)，来自正文引的
碑文「半個 188」。它由页面兜底那一步并进去，所以切字体时不会漏。

## 更新录屏

`media/demo.mp4` 直接换掉再提交即可，注意别让 `.gitattributes` 之外的环节碰它（见下）。

母版在游戏仓库的 `promo/footage/07-walkthrough.mp4`（1920×1080 / 60fps，`promo/` 整条被
gitignore，只存在于本机）。烧录用的字幕**在本仓库入库**：`media/walkthrough-vo.en.srt` 与
`media/walkthrough-vo.ass`——烧进去的片子要有可复现的依据，不能只剩一个 mp4。

出片是两步：

```bash
# 1) 混旁白：视频零重编码，只加一条音轨
ffmpeg -i 07-walkthrough.mp4 -i vo-track.wav \
       -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -ar 48000 -ac 2 \
       -movflags +faststart -shortest 07-walkthrough-vo.mp4

# 2) 烧字幕 + 压到 web 规格，一步做完
ffmpeg -i 07-walkthrough-vo.mp4 -vf "ass=walkthrough-vo.ass,scale=1280:720" \
       -c:v libx264 -preset medium -crf 27 -pix_fmt yuv420p -profile:v high -level 4.2 \
       -r 30 -c:a copy -movflags +faststart media/demo.mp4
```

**长编码前先抽帧看一眼**，`-vf` 的样式写错时 ffmpeg 退出码照样是 0：

```bash
ffmpeg -ss 20 -copyts -i 07-walkthrough-vo.mp4 -vf "ass=walkthrough-vo.ass" -frames:v 1 chk.png
```

`-ss` 作为**输入选项**时 ffmpeg 会把输出时间戳归零，`ass` 滤镜按 PTS 匹配，于是全片没有一帧
命中——`-copyts` 是必须的。加了它才能确认字幕既没跑到画面中央（PlayRes 被写成 384×288 时会那样），
也没压到道具栏上。

查某几秒有没有声音要用 `-t` 限住窗口，否则 `-ss` 之后 `volumedetect` 统计的是**剩余全程**：

```bash
ffmpeg -ss 36 -t 2 -i media/demo.mp4 -af volumedetect -f null NUL
```

## 旁白是怎么排的

20 句英配，196 词，纯朗读 83.9 秒，铺在 109.4 秒里（77% 覆盖率），0 处碰撞。

时间轴**不是**按字数估的：每句都按新画面上的实际节拍定位，第 8 句落在打卡那一下之前，
第 9 句落在小游戏之后，中间 `35–40 秒`是刻意的留白——小鸟问答的两张卡让给游戏自己说，
那一段实测 `-91 dB`（纯静默）。

上一版是 42 句 / 232 秒。之所以整条推倒重排：车速从约 8.3 m/s 提到了 15 m/s，整圈从
232 秒缩到 109 秒，**解说比片子还长**，照搬旧时间轴必然整段错位。改稿时凡是对着画面写的话
（骑什么车、走什么景、顶栏写着什么）都要重新核一遍——上一版写的「全程徒步」在新片里已经不成立了。

## 部署

`.github/workflows/pages.yml` 在 `main` 每次 push 后把站点文件交给 `actions/deploy-pages`。工作流刻意**不写死文件清单**——只排除仓库自身的东西，新增的资源目录不用改工作流就会自动上线。

`.nojekyll` 用来阻止 Pages 把下划线开头的路径交给 Jekyll 处理。

## 体积

约 23.6MB，其中录屏 `media/demo.mp4` 占了 21.8MB，字体 1.55MB。
`.gitattributes` 把二进制标成 `binary`，防止自动探测误判成文本、一次误判就让仓库膨胀数倍。
mp4 那一条要写在通配符**下面**：通配符里的 `-text` 会被后面的 `* text=auto` 盖掉，
对 mp4 真正生效的只有 `-diff`，22MB 的片子一旦被误判成文本、重新编码，就是一份几十 MB 的假 diff。
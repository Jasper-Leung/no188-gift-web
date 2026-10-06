# no188-gift-web

[188号礼物](https://jasper-leung.github.io/no188-gift-web/) 的**官网仓库**：根目录就是官网介绍页本身，GitHub Pages 原样发出去。

游戏本体不在这里，在 [`Jasper-Leung/188js`](https://github.com/Jasper-Leung/188js)（源码 + 构建产物），线上试玩走 https://jasper-leung.github.io/188js/ 。本仓库没有构建步骤，`push` 即部署。

## 这里有什么

```
index.html      介绍页（站点根路径）
landing.css     介绍页样式
landing.js      语言切换 + 复制按钮
media/          hero.jpg / poster.jpg / demo.mp4（录屏 23MB）
fonts/ui.woff2  子集化字体，介绍页在用
submission/     只有一个跳转页，把旧地址引回根路径
```

页面里所有引用都是相对的，所以站点跑在 `/no188-gift-web/` 子路径下而不是域名根——这是刻意的。

## 试玩地址

页面（`index.html`）上挂了两个镜像：

- https://jasper-leung.github.io/188js/ （GitHub Pages，主按钮）
- https://gift-no188.jasperaptx4868.workers.dev/ （Cloudflare，备用）

主按钮用 GitHub Pages 是因为实测 `workers.dev` 在本机 DNS 被劫持到无关 IP、连不上；GitHub Pages 返回 200。两者内容相同。

## 更新录屏

`media/demo.mp4` 直接换掉再提交即可，注意别让 `.gitattributes` 之外的环节碰它（见下）。

## 部署

`.github/workflows/pages.yml` 在 `main` 每次 push 后把站点文件交给 `actions/deploy-pages`。工作流刻意**不写死文件清单**——只排除仓库自身的东西，新增的资源目录不用改工作流就会自动上线。

`.nojekyll` 用来阻止 Pages 把下划线开头的路径交给 Jekyll 处理。

## 体积

约 24MB，其中录屏 `media/demo.mp4` 占了 23MB。`.gitattributes` 把二进制标成 `binary`，防止自动探测误判成文本、一次误判就让仓库膨胀数倍。mp4 那一条要写在通配符**下面**：通配符里的 `-text` 会被后面的 `* text=auto` 盖掉，对 mp4 真正生效的只有 `-diff`，23MB 的片子一旦被误判成文本、重新编码，就是一份几十 MB 的假 diff。
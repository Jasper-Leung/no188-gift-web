# no188-gift-web

[188号礼物](https://jasper-leung.github.io/no188-gift-web/) 的**部署仓库**：仓库根目录就是可直接托管的静态产物，GitHub Pages 原样发出去。

## 这里为什么没有源码

源码在 [`Jasper-Leung/188js`](https://github.com/Jasper-Leung/188js)，那边自带完整 CI（typecheck / verify / build）。本仓库是它的**发布产物**——只有 `index.html` 和 `assets/ audio/ fonts/ models/`，没有构建步骤，`push` 即部署。

## 更新线上版本

在源码仓库构建，再把产物同步过来：

```bash
cd ../188threejs
npm run build
rsync -a --delete --exclude '.git' --exclude '.github' \
      --exclude 'README.md' --exclude '.gitattributes' \
      --exclude '.gitignore' dist/ ../no188-gift-web/
cd ../no188-gift-web && git add -A && git commit -m "更新构建产物" && git push
```

Windows 上没有 rsync 时用等价的复制（先删掉会残留的旧哈希文件）：

```powershell
robocopy dist ..\no188-gift-web /MIR /XD .git .github /XF README.md .gitattributes .gitignore
git add -A; git commit -m "更新构建产物"; git push
```

`.gitattributes` 与 `.gitignore` 需要保留在仓库里，所以用 `/XF` 排除掉复制、再单独提交这两者的变更。

## 部署

`.github/workflows/pages.yml` 在 `main` 每次 push 后把站点文件交给 `actions/deploy-pages`。

产物里所有引用都是相对的（`vite.config.ts` 里 `base: './'`），所以站点跑在 `/no188-gift-web/` 子路径下而不是域名根——这是刻意的，别在发布时把 `base` 改成 `'/'`，症状很安静：本地一切正常，线上白屏 404。

`.nojekyll` 用来阻止 Pages 把下划线开头的路径交给 Jekyll 处理。

## 体积

约 21MB，其中模型（`models/*.glb`）和音乐（`audio/bgm.ogg`）占绝大多数。`.gitattributes` 把它们标成 binary，防止自动探测误判成文本、一次误判就让仓库膨胀数倍。

/* =============================================================================
 * 官网介绍页 · 脚本
 * =============================================================================
 * 这一页的全部内容都在 HTML 里，**没有一行字是 JS 生成的**。
 * 所以这个文件只做锦上添花的事，脚本不跑也只是少几个功能，页面不会缺块：
 *
 *   1. 语言切换（默认中文，切过一次就记住）
 *   2. 复制按钮（把 demo 链接 / 命令行粘走）
 *   3. 系统要求「减少动态效果」时，把宣传氛围片停在封面帧上
 *   4. 导航：首屏透明、滚动后上纸色；底边一条阅读进度；高亮当前所在的一节；
 *      窄屏菜单点完自动收起
 *   5. 入场：各块滚进视口时淡入；路线图进视口时把路画出来；首屏那幅画轻微视差
 *
 * 第 5 条的分寸：只有脚本会给元素挂 .reveal，所以脚本没跑时什么都不藏；
 * 元素一露头就开始淡入，时长压在一秒上下，读者不用停下来等它。
 * 刻意不做的事：视频播放器接管、滚动劫持、任何懒加载框架。系统要求减少动态时，
 * 第 5 条整条不做。
 * 评委的时间很短，这一页必须在 3 秒内把三件东西指出来。
 * ============================================================================= */
(function () {
  'use strict';

  var LANG_KEY = 'gift188.submission.lang';
  var root = document.documentElement;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /** localStorage 在 file:// 与隐私模式下都可能抛，所以每处都包起来。 */
  function readLang() {
    try {
      return window.localStorage.getItem(LANG_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeLang(lang) {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      /* 无痕模式之类：这次不记住，下次再说 */
    }
  }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    // 让读屏与复制粘贴拿到正确语言的文本
    root.setAttribute('lang', lang === 'zh' ? 'zh-Hans' : 'en');
  }

  // ---- 语言 -----------------------------------------------------------------

  // 默认**中文**，而且不猜浏览器语言。
  // 这不是省事：HTML 里的 `data-lang="zh"`、`<html lang="zh-Hans">`、正文全是中文，
  // 脚本再按 navigator 改一次，就等于「同一份页面对不同人长得不一样」——
  // 提交页要的是所有人看到同一张脸。想看英文点右上角那一个按钮，记住选择。
  applyLang(readLang() === 'en' ? 'en' : 'zh');

  Array.prototype.forEach.call(document.querySelectorAll('[data-lang-toggle]'), function (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-lang') === 'zh' ? 'en' : 'zh';
      applyLang(next);
      writeLang(next);
    });
  });

  // ---- 复制 -----------------------------------------------------------------

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // 回退：http 页面里 clipboard API 不可用时的老办法（file:// 下尤其需要）
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    var src = document.querySelector(btn.getAttribute('data-copy'));
    if (!src) return;
    // 地址还是待填的时候没有可复制的东西，按钮自己藏掉。
    // CSS 也能做，但那时按钮会先闪一下再消失。
    if (src.hasAttribute('data-todo')) {
      btn.hidden = true;
      return;
    }
    var timer = 0;

    // 「已复制」两种语言都预先写在按钮里（.copy-done），这里只翻 data-done。
    // 早先是直接改 btn.textContent，复原时把中英两半拼成一句「复制Copy」写回去——
    // 复制过一次，按钮就再也分不清语言了。
    btn.addEventListener('click', function () {
      copyText(src.textContent.trim())
        .then(function () {
          btn.setAttribute('data-done', '1');
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            btn.removeAttribute('data-done');
          }, 1600);
        })
        .catch(function () {
          // 复制不了就把内容选上，让人自己 Ctrl+C
          var range = document.createRange();
          range.selectNodeContents(src);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
    });
  });

  // ---- 宣传氛围片 -----------------------------------------------------------
  /**
   * 「宣传物料」里那支静音循环的氛围片会自己播。系统说了
   * prefers-reduced-motion 就别让它转：摘掉 autoplay、再暂停一次
   * （脚本有可能跑在自动播放已经开始之后），封面帧会留在那儿。
   *
   * 注意这里**没有**接管播放器——控件还是浏览器自己那套。用户想放，
   * 随时按一下就行；我们只是不主动替他决定「要动」。
   */
  var promo = document.getElementById('promo-video');
  if (promo && reduceMotion) {
    promo.removeAttribute('autoplay');
    promo.autoplay = false;
    try {
      promo.pause();
    } catch (e) {
      /* 元数据还没到时个别浏览器会抛，忽略：反正它也没在播 */
    }
  }

  // ---- 导航 · 阅读进度 · 主视觉视差 ---------------------------------------
  //
  // 三件事挂在同一个 rAF 里：导航在首屏透明、滚下去上纸色；导航底边那条朱线
  // 按全页进度伸长；主视觉那幅画以三分之一的速度往下沉（只在首屏范围内算）。
  // 视差在「减少动态」下不做。

  var nav = document.querySelector('[data-nav]');
  var progress = document.querySelector('[data-progress]');
  var heroImg = reduceMotion ? null : document.querySelector('[data-parallax]');
  var ticking = false;
  function onFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset || 0;
    if (nav) nav.classList.toggle('at-top', y < 24);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
    if (heroImg && y < window.innerHeight * 1.2) {
      heroImg.style.transform = 'translate3d(0,' + (y * 0.32).toFixed(1) + 'px,0)';
    }
  }
  onFrame();
  window.addEventListener(
    'scroll',
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onFrame);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', onFrame, { passive: true });

  // 窄屏菜单（<details>）：点了链接就收起，点菜单外面也收起
  var menu = document.querySelector('[data-nav-menu]');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) menu.open = false;
    });
    document.addEventListener('click', function (e) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  // ---- 路线图 ---------------------------------------------------------------
  //
  // 路上那个骑车的人是 SMIL（<animateMotion>），CSS 的 prefers-reduced-motion
  // 管不到它，只能在这里停：pauseAnimations() 之后它停在起点。
  var route = document.querySelector('[data-route]');
  var routeSvg = route && route.querySelector('[data-route-svg]');
  if (routeSvg && reduceMotion && routeSvg.pauseAnimations) {
    routeSvg.pauseAnimations();
  }

  if (!('IntersectionObserver' in window)) return;

  // 当前所在的一节：取视口中线附近的那一节
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll('.nav-links a[href^="#"]'), function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var spy = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var a = links[entry.target.id];
        if (!a) return;
        if (entry.isIntersecting) {
          Object.keys(links).forEach(function (k) {
            links[k].classList.remove('is-active');
          });
          a.classList.add('is-active');
        } else {
          a.classList.remove('is-active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  Object.keys(links).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  if (reduceMotion) return;

  // 路自己画出来：先把路面收成一截空线，进视口再放开；驿站一个个点亮
  if (route && route.getBoundingClientRect().top > window.innerHeight * 0.6) {
    route.classList.add('will-draw');
    Array.prototype.forEach.call(route.querySelectorAll('.route-stations g'), function (g, i) {
      g.style.transitionDelay = 0.9 + i * 0.09 + 's';
    });
    var drawIo = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        drawIo.disconnect();
        route.classList.add('is-drawn');
      },
      { threshold: 0.25 }
    );
    drawIo.observe(route);
  }

  // ---- 入场 -----------------------------------------------------------------

  var targets = document.querySelectorAll(
    '.chapter-rule, .chapter-num, .chapter-body, .statement, .stats li, .toc li, .reel-head, .video-frame,' +
      ' .slate-strip, .notes-grid, .deliv-head, .ticket, .mirror, .deliv-notes, .dl-row, .prose, .stele,' +
      ' .joys li, .promo, .promo-notes, .promo-stills figure, .spec, .stack, .cols .col, .postcard, .foot-top'
  );
  var pending = [];

  function show(el) {
    el.classList.add('is-in');
    // 出场结束后把类和延迟都摘掉，元素回到自己的过渡（卡片的悬停上浮之类）。
    // 用定时器而不是 transitionend：有的元素自己的 transition 优先级更高、
    // 盖掉了 opacity 那一条，transitionend 就永远等不来。
    window.setTimeout(function () {
      el.classList.remove('reveal', 'is-in');
      el.style.transitionDelay = '';
    }, 1600);
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        show(entry.target);
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
  );

  Array.prototype.forEach.call(targets, function (el) {
    // 已经在首屏里的不动它：读者打开页面时看到的那一屏不该再「出场」一次
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    // 同一排的兄弟依次错开一点，一排卡片像被一张张放下
    var parent = el.parentNode;
    var i = Array.prototype.indexOf.call(parent.children, el);
    if (/^(LI|FIGURE)$/.test(el.tagName) || /\b(cols|chapter-grid)\b/.test(parent.className)) {
      el.style.transitionDelay = Math.min(i, 5) * 80 + 'ms';
    }
    el.classList.add('reveal');
    pending.push(el);
    io.observe(el);
  });

  // 兜底：锚点跳转（点导航、带 #hash 打开）会一步越过中间的块，IntersectionObserver
  // 只在「进出视口」时报，越过去的那些就一直藏着；往回滚时它们会是空的。
  // 所以滚动停下时，把已经在视口上方的也一并放出来。
  var sweepTimer = 0;
  window.addEventListener(
    'scroll',
    function () {
      window.clearTimeout(sweepTimer);
      sweepTimer = window.setTimeout(function () {
        pending = pending.filter(function (el) {
          if (!el.classList.contains('reveal') || el.classList.contains('is-in')) return false;
          if (el.getBoundingClientRect().top < window.innerHeight) {
            io.unobserve(el);
            show(el);
            return false;
          }
          return true;
        });
        if (route && route.classList.contains('will-draw') && route.getBoundingClientRect().top < window.innerHeight) {
          route.classList.add('is-drawn');
        }
      }, 120);
    },
    { passive: true }
  );
})();

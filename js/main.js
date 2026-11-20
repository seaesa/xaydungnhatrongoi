/*
 * GRM Group - static site
 * Vanilla JS re-implementation of the behaviours the original page gets from
 * Flatsome (+ jQuery, hoverIntent, Flickity, Magnific Popup, GTranslate).
 * Timings and thresholds were measured on the live site.
 */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var modulo = function (n, m) { return ((n % m) + m) % m; };

  html.classList.remove('no-js');
  html.classList.add('js');

  /* ------------------------------------------------------------------ *
   * 1. Desktop dropdowns (hoverIntent: interval 20ms, timeout 70ms)
   * ------------------------------------------------------------------ */
  function initDropdowns() {
    var SENSITIVITY = 3, INTERVAL = 20, TIMEOUT = 70;
    var items = $$('.header-nav li.has-dropdown, .nav-dropdown-has-arrow .nav li.has-dropdown');
    items = items.filter(function (li, i) { return items.indexOf(li) === i; });

    // Flatsome: keep the dropdown inside .header-inner (shift it left when it overflows)
    function position(dd) {
      var inner = $('.header-inner');
      var n = inner ? inner.clientWidth - parseFloat(getComputedStyle(inner).paddingLeft) - parseFloat(getComputedStyle(inner).paddingRight) : 0;
      if (!dd || n < 750) return;
      var vw = Math.max(html.clientWidth, window.innerWidth || 0);
      var r = dd.getBoundingClientRect().left + window.pageXOffset - (vw - n) / 2;
      var ds = getComputedStyle(dd), s = parseFloat(ds.width); // jQuery .width(): content box
      if (ds.boxSizing === 'border-box') {
        ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function (k) { s -= parseFloat(ds[k]) || 0; });
      }
      var a = n - (r + s), l = false;
      if (r > a && r < s) l = (r + a) / 3;
      if (a < 0) l = -a;
      if (l) dd.style.marginLeft = -l + 'px';
      if (s > n) dd.classList.add('nav-dropdown-full');
    }
    function open(li) {
      items.forEach(function (o) { if (o !== li && !o.contains(li)) close(o); });
      if (li.classList.contains('current-dropdown')) return;
      li.classList.add('current-dropdown');
      position($('.nav-dropdown', li));
    }
    function close(li) {
      var dd = $('.nav-dropdown', li);
      if (dd) dd.setAttribute('style', '');
      li.classList.remove('current-dropdown');
      li._locked = false;
    }

    items.forEach(function (li) {
      var timer = null, x = 0, y = 0, px = 0, py = 0, state = false;

      function track(e) { x = e.clientX; y = e.clientY; }
      function compare() {
        timer = null;
        if (Math.abs(px - x) + Math.abs(py - y) < SENSITIVITY) {
          li.removeEventListener('mousemove', track);
          state = true;
          open(li);
        } else {
          px = x; py = y;
          timer = setTimeout(compare, INTERVAL);
        }
      }
      li.addEventListener('mouseenter', function (e) {
        clearTimeout(timer);
        if (state) return;
        px = x = e.clientX; py = y = e.clientY;
        li.addEventListener('mousemove', track);
        timer = setTimeout(compare, INTERVAL);
      });
      li.addEventListener('mouseleave', function () {
        clearTimeout(timer);
        li.removeEventListener('mousemove', track);
        if (!state) return;
        timer = setTimeout(function () {
          timer = null;
          state = false;
          if (!li._locked) close(li);
        }, TIMEOUT);
      });
      li._resetHover = function () { state = false; };
    });

    /* Search icon: a click opens the dropdown and keeps it open */
    $$('.header-search > a').forEach(function (a) {
      var li = a.parentNode;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (li.classList.contains('current-dropdown') && li._locked) {
          close(li);
          if (li._resetHover) li._resetHover();
          return;
        }
        open(li);
        li._locked = true;
        var input = $('.search-field', li);
        if (input) setTimeout(function () { input.focus(); }, 50);
      });
    });

    doc.addEventListener('click', function (e) {
      items.forEach(function (li) {
        if (li.classList.contains('current-dropdown') && !li.contains(e.target)) {
          close(li);
          if (li._resetHover) li._resetHover();
        }
      });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') items.forEach(close);
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Sticky header ("sticky-jump"): sticks while scrolling DOWN past
   *    header height + 100px, releases on any upward scroll.
   * ------------------------------------------------------------------ */
  function initSticky() {
    var header = $('#header.has-sticky');
    if (!header) return;
    var wrapper = $('.header-wrapper', header);
    var lastY = window.pageYOffset;
    var stuck = false;
    var naturalH = 0;

    function update() {
      var y = window.pageYOffset;
      if (!stuck) naturalH = header.offsetHeight;
      var threshold = naturalH + 100;
      var down = y > lastY;
      if (!stuck && down && y > threshold) {
        header.style.height = naturalH + 'px';
        wrapper.classList.add('stuck');
        stuck = true;
      } else if (stuck && (!down && y !== lastY || y <= threshold)) {
        wrapper.classList.remove('stuck');
        header.style.height = '';
        stuck = false;
      }
      lastY = y;
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () {
      if (!stuck) naturalH = header.offsetHeight;
    });
    update();
  }

  /* ------------------------------------------------------------------ *
   * 3. Magnific-popup-like overlays (off-canvas menu + video lightbox)
   * ------------------------------------------------------------------ */
  var CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  var popup = null;

  function openPopup(opts) {
    if (popup) closePopup(true);
    var bg = doc.createElement('div');
    bg.className = 'mfp-bg ' + opts.cls + (opts.bgCls ? ' ' + opts.bgCls : '');
    var wrap = doc.createElement('div');
    wrap.className = 'mfp-wrap mfp-auto-cursor ' + opts.cls;
    wrap.tabIndex = -1;
    wrap.style.overflow = 'hidden auto';
    wrap.innerHTML = '<div class="mfp-container mfp-s-ready ' + opts.holder + '"><div class="mfp-content"></div>' +
      '<div class="mfp-preloader">' + (opts.preloader || 'Loading...') + '</div></div>' +
      '<button title="Close (Esc)" type="button" class="mfp-close">' + CLOSE_SVG + '</button>';
    var content = $('.mfp-content', wrap);
    opts.fill(content);

    var sbw = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    if (sbw > 0) html.style.marginRight = sbw + 'px';
    doc.body.appendChild(bg);
    doc.body.appendChild(wrap);

    popup = { bg: bg, wrap: wrap, content: content, opts: opts };

    wrap.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.mfp-close') || !content.contains(t)) closePopup();
    });
    wrap.focus({ preventScroll: true });
    setTimeout(function () {
      bg.classList.add('mfp-ready');
      wrap.classList.add('mfp-ready');
    }, 16);
  }

  function closePopup(instant) {
    if (!popup || popup.closing) return;
    var p = popup;
    p.closing = true;
    function finish() {
      if (p.opts.onClose) p.opts.onClose(p.content);
      p.bg.remove();
      p.wrap.remove();
      html.style.overflow = '';
      html.style.marginRight = '';
      if (popup === p) popup = null;
    }
    if (instant) return finish();
    p.bg.classList.add('mfp-removing');
    p.wrap.classList.add('mfp-removing');
    setTimeout(finish, 300);
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup) closePopup();
  });

  /* Off-canvas mobile menu */
  function initMobileMenu() {
    var menu = $('#main-menu');
    if (!menu) return;
    var placeholder = doc.createComment('main-menu');
    var angle = $('.icon-angle-down');
    var angleSvg = angle ? angle.innerHTML : '';

    // Flatsome adds a toggle button to every parent item of the sidebar nav
    $$('.nav-sidebar > li.menu-item-has-children', menu).forEach(function (li) {
      li.classList.add('has-child');
      li.setAttribute('aria-expanded', 'false');
      var btn = doc.createElement('button');
      btn.className = 'toggle';
      btn.innerHTML = '<i class="icon-angle-down">' + angleSvg + '</i>';
      li.insertBefore(btn, $('ul.children, ul.sub-menu', li));
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var on = li.classList.toggle('active');
        li.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    });

    $$('[data-open="#main-menu"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var pos = btn.getAttribute('data-pos') || 'left';
        var cls = 'off-canvas ' + (btn.getAttribute('data-color') || '') + ' off-canvas-' + pos;
        openPopup({
          cls: cls.replace(/\s+/g, ' ').trim(),
          holder: 'mfp-inline-holder',
          fill: function (content) {
            menu.parentNode.insertBefore(placeholder, menu);
            menu.classList.remove('mfp-hide');
            content.appendChild(menu);
          },
          bgCls: btn.getAttribute('data-bg') || 'main-menu-overlay',
          onClose: function () {
            menu.classList.add('mfp-hide');
            placeholder.parentNode.insertBefore(menu, placeholder);
            placeholder.remove();
            html.classList.remove('has-off-canvas', 'has-off-canvas-' + pos);
            btn.classList.remove('current-lightbox-clicked');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        html.classList.add('has-off-canvas', 'has-off-canvas-' + pos);
        btn.classList.add('current-lightbox-clicked');
        btn.setAttribute('aria-expanded', 'true');
      });
    });

    // Following a link inside the menu closes it
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && popup && !a.closest('.toggle')) closePopup();
    });
  }

  /* YouTube lightbox for .open-video buttons */
  function initVideoLightbox() {
    $$('a.open-video').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var m = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(a.getAttribute('href') || '');
        if (!m) return;
        e.preventDefault();
        openPopup({
          cls: 'my-mfp-video',
          holder: 'mfp-iframe-holder',
          preloader: '<div class="loading-spin centered dark"></div>',
          fill: function (content) {
            content.innerHTML = '<div class="mfp-iframe-scaler"><div class="mfp-close"></div>' +
              '<iframe class="mfp-iframe" src="https://www.youtube.com/embed/' + m[1] + '?autoplay=1" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. Flickity-compatible slider (same DOM, classes and physics)
   * ------------------------------------------------------------------ */
  var ARROW = 'M 10,50 L 60,100 L 70,90 L 30,50  L 70,10 L 60,0 Z';

  function Slider(el) {
    var o = {};
    try { o = JSON.parse(el.getAttribute('data-flickity-options') || '{}'); } catch (err) { o = {}; }
    this.o = {
      cellAlign: o.cellAlign || 'center',
      wrapAround: !!o.wrapAround,
      autoPlay: o.autoPlay === true ? 3000 : (o.autoPlay || 0),
      pauseAutoPlayOnHover: o.pauseAutoPlayOnHover !== false,
      prevNextButtons: o.prevNextButtons !== false,
      pageDots: o.pageDots !== false,
      adaptiveHeight: !!o.adaptiveHeight,
      dragThreshold: o.dragThreshold != null ? o.dragThreshold : 3,
      groupCells: o.groupCells || false,
      selectedAttraction: o.selectedAttraction || 0.025,
      friction: o.friction || 0.28,
      draggable: o.draggable !== false
    };
    this.el = el;
    this.x = 0;
    this.velocity = 0;
    this.selectedIndex = 0;
    this.build();
  }

  Slider.prototype.build = function () {
    var el = this.el, self = this;
    this.cells = Array.prototype.slice.call(el.children);
    this.viewport = doc.createElement('div');
    this.viewport.className = 'flickity-viewport';
    this.track = doc.createElement('div');
    this.track.className = 'flickity-slider';
    this.cells.forEach(function (c) {
      c.style.position = 'absolute';
      self.track.appendChild(c);
    });
    this.viewport.appendChild(this.track);
    el.appendChild(this.viewport);
    el.classList.add('flickity-enabled');
    if (this.o.draggable) el.classList.add('is-draggable');
    el.tabIndex = 0;

    if (this.o.prevNextButtons) {
      this.prev = this.button('previous', 'Previous', '');
      this.next = this.button('next', 'Next', ' transform="translate(100, 100) rotate(180) "');
      this.prev.addEventListener('click', function () { self.uiChange(); self.select(self.selectedIndex - 1); });
      this.next.addEventListener('click', function () { self.uiChange(); self.select(self.selectedIndex + 1); });
    }
    if (this.o.pageDots) {
      this.dotsHolder = doc.createElement('ol');
      this.dotsHolder.className = 'flickity-page-dots';
      el.appendChild(this.dotsHolder);
      this.dotsHolder.addEventListener('click', function (e) {
        var dot = e.target.closest('.dot');
        if (!dot) return;
        self.uiChange();
        self.select(self.dots.indexOf(dot));
      });
    }

    el.addEventListener('keydown', function (e) {
      if (e.target !== el) return;
      if (e.key === 'ArrowLeft') { self.uiChange(); self.select(self.selectedIndex - 1); }
      if (e.key === 'ArrowRight') { self.uiChange(); self.select(self.selectedIndex + 1); }
    });

    if (this.o.draggable) this.bindDrag();
    this.measure();
    this.positionAtSelected();
    this.updateSelected();

    $$('img', el).forEach(function (img) {
      if (!img.complete) img.addEventListener('load', function () { self.setSize(); }, { once: true });
    });
    window.addEventListener('resize', function () {
      clearTimeout(self._rt);
      self._rt = setTimeout(function () { self.resize(); }, 100);
    });
    window.addEventListener('load', function () { self.resize(); });

    if (this.o.autoPlay) this.initPlayer();
  };

  Slider.prototype.button = function (dir, label, transform) {
    var b = doc.createElement('button');
    b.className = 'flickity-button flickity-prev-next-button ' + dir;
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg class="flickity-button-icon" viewBox="0 0 100 100"><path d="' + ARROW + '" class="arrow"' + transform + '></path></svg>';
    this.el.appendChild(b);
    return b;
  };

  Slider.prototype.measure = function () {
    var self = this;
    var V = this.viewport.offsetWidth;
    this.V = V;
    var align = this.o.cellAlign === 'left' ? 0 : this.o.cellAlign === 'right' ? 1 : 0.5;
    this.align = align;
    var x = 0;
    this.sizes = this.cells.map(function (c) {
      var w = c.getBoundingClientRect().width;
      var s = { el: c, x: x, w: w };
      x += w;
      return s;
    });
    this.S = x;

    // group cells into slides
    var slides = [];
    var groupW = this.o.groupCells
      ? (typeof this.o.groupCells === 'string' ? V * parseFloat(this.o.groupCells) / 100 : null)
      : null;
    var groupN = typeof this.o.groupCells === 'number' ? this.o.groupCells : null;
    var cur = null;
    this.sizes.forEach(function (s) {
      var start = !cur ||
        (groupW !== null ? (cur.w + s.w > groupW + 1) :
          groupN !== null ? cur.cells.length >= groupN : true);
      if (start) { cur = { cells: [], x: s.x, w: 0 }; slides.push(cur); }
      cur.cells.push(s);
      cur.w += s.w;
    });
    slides.forEach(function (sl) { sl.target = sl.x + sl.w * align; });
    this.slides = slides;
    if (this.selectedIndex >= slides.length) this.selectedIndex = slides.length - 1;
    this.isWrap = this.o.wrapAround && slides.length > 1;

    if (this.dotsHolder) {
      this.dotsHolder.innerHTML = '';
      this.dots = slides.map(function (sl, i) {
        var li = doc.createElement('li');
        li.className = 'dot';
        li.setAttribute('aria-label', 'Page dot ' + (i + 1));
        self.dotsHolder.appendChild(li);
        return li;
      });
      this.dotsHolder.style.display = slides.length > 1 ? '' : 'none';
    }
    var showNav = slides.length > 1;
    if (this.prev) { this.prev.style.display = this.next.style.display = showNav ? '' : 'none'; }
    this.setSize();
  };

  Slider.prototype.setSize = function () {
    var h = 0;
    var list = this.o.adaptiveHeight && this.slides.length
      ? this.slides[this.selectedIndex].cells : this.sizes;
    list.forEach(function (s) { h = Math.max(h, s.el.offsetHeight); });
    this.viewport.style.height = h + 'px';
  };

  Slider.prototype.resize = function () {
    this.measure();
    this.positionAtSelected();
    this.updateSelected();
  };

  Slider.prototype.render = function () {
    var x = this.x;
    if (this.isWrap) x = modulo(x, this.S) - this.S;
    var t = x + this.V * this.align;
    var V = this.V, S = this.S;
    var wrap = this.isWrap;
    this.sizes.forEach(function (s) {
      var left = s.x;
      if (wrap) {
        var r = t + left;
        if (r + s.w <= 0 && r + S < V) left += S;
        else if (r >= V && r - S + s.w > 0) left -= S;
      }
      s.el.style.left = left + 'px';
    });
    this.track.style.transform = 'translateX(' + t + 'px)';
  };

  Slider.prototype.positionAtSelected = function () {
    this.x = -this.slides[this.selectedIndex].target;
    this.velocity = 0;
    this.render();
  };

  Slider.prototype.slideDistance = function (x, index) {
    var len = this.slides.length;
    var i = this.isWrap ? modulo(index, len) : index;
    var sl = this.slides[i];
    if (!sl) return null;
    var wrap = this.isWrap ? this.S * Math.floor(index / len) : 0;
    return x - (sl.target + wrap);
  };

  Slider.prototype.select = function (index, isDragSelect) {
    var len = this.slides.length;
    if (!len) return;
    if (this.isWrap) {
      var wrapIndex = modulo(index, len);
      var delta = Math.abs(wrapIndex - this.selectedIndex);
      var back = Math.abs(wrapIndex + len - this.selectedIndex);
      var fore = Math.abs(wrapIndex - len - this.selectedIndex);
      if (!isDragSelect && back < delta) index += len;
      else if (!isDragSelect && fore < delta) index -= len;
      if (index < 0) this.x -= this.S;
      else if (index >= len) this.x += this.S;
      index = wrapIndex;
    } else {
      index = Math.max(0, Math.min(len - 1, index));
    }
    this.selectedIndex = index;
    this.updateSelected();
    if (this.o.adaptiveHeight) this.setSize();
    this.startAnimation();
  };

  Slider.prototype.updateSelected = function () {
    var sel = this.slides[this.selectedIndex];
    this.sizes.forEach(function (s) {
      var on = sel.cells.indexOf(s) > -1;
      s.el.classList.toggle('is-selected', on);
      s.el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    var i = this.selectedIndex;
    if (this.dots) this.dots.forEach(function (d, k) {
      d.classList.toggle('is-selected', k === i);
      if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
  };

  Slider.prototype.startAnimation = function () {
    if (this.animating) return;
    this.animating = true;
    this.restingFrames = 0;
    var self = this;
    requestAnimationFrame(function tick() { self.animate(tick); });
  };

  Slider.prototype.animate = function (tick) {
    var prevX = this.x;
    if (this.isPointerDown && this.isDragging) {
      var dragForce = (this.dragX - this.x) - this.velocity;
      this.velocity += dragForce;
    } else if (!this.isPointerDown) {
      var distance = -this.slides[this.selectedIndex].target - this.x;
      this.velocity += distance * this.o.selectedAttraction;
    }
    this.x += this.velocity;
    this.velocity *= 1 - this.o.friction;
    this.render();

    if (!this.isPointerDown && Math.round(this.x * 100) === Math.round(prevX * 100)) this.restingFrames++;
    if (this.restingFrames > 2) {
      this.animating = false;
      this.positionAtSelected();
      return;
    }
    requestAnimationFrame(tick);
  };

  Slider.prototype.bindDrag = function () {
    var self = this, vp = this.viewport;
    var startX = 0, startY = 0, pid = null, moved = false;
    vp.style.touchAction = 'pan-y';

    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    vp.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || pid !== null) return;
      if (/^(input|textarea|select|button)$/i.test(e.target.nodeName)) return;
      pid = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      moved = false;
      self.isPointerDown = true;
      self.isDragging = false;
      self.dragX = self.x;
      vp.classList.add('is-pointer-down');
      self.stopPlayer();
    });

    function move(e) {
      if (e.pointerId !== pid) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!self.isDragging) {
        if (Math.abs(dx) <= self.o.dragThreshold) return;
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) return;
        self.isDragging = true;
        moved = true;
        self.dragStartPosition = self.x;
        self.el.classList.add('is-dragging');
        try { vp.setPointerCapture(pid); } catch (err) { /* noop */ }
        self.startAnimation();
      }
      self.dragX = self.dragStartPosition + dx;
      e.preventDefault();
    }

    function up(e) {
      if (e.pointerId !== pid) return;
      pid = null;
      vp.classList.remove('is-pointer-down');
      var wasDragging = self.isDragging;
      self.isPointerDown = false;
      self.isDragging = false;
      self.el.classList.remove('is-dragging');
      if (!wasDragging) return;
      // Flickity dragEndRestingSelect + dragEndBoostSelect
      var restingX = self.x + self.velocity / self.o.friction;
      var dist = Math.abs(self.slideDistance(-restingX, self.selectedIndex));
      var pos = self.closestResting(restingX, dist, 1);
      var neg = self.closestResting(restingX, dist, -1);
      var index = pos.distance < neg.distance ? pos.index : neg.index;
      if (index === self.selectedIndex) {
        var d = self.slideDistance(-self.dragX, self.selectedIndex);
        index += d > 0 && self.velocity < 0 ? 1 : d < 0 && self.velocity > 0 ? -1 : 0;
      }
      self.select(index, true);
    }

    vp.addEventListener('pointermove', move);
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', up);
    // swallow the click that ends a drag so links inside slides don't fire
    vp.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  };

  Slider.prototype.closestResting = function (restingX, distance, inc) {
    var index = this.selectedIndex;
    var min = Infinity;
    var cond = this.isWrap ? function (d, m) { return d < m; } : function (d, m) { return d <= m; };
    while (cond(distance, min)) {
      index += inc;
      min = distance;
      distance = this.slideDistance(-restingX, index);
      if (distance === null) break;
      distance = Math.abs(distance);
    }
    return { distance: min, index: index - inc };
  };

  /* autoplay — pauses on hover, stops for good after any user interaction */
  Slider.prototype.initPlayer = function () {
    var self = this;
    this.playState = 'playing';
    this.tick();
    if (this.o.pauseAutoPlayOnHover) {
      this.el.addEventListener('mouseenter', function () {
        if (self.playState !== 'playing') return;
        self.playState = 'paused';
        clearTimeout(self.playTimer);
      });
      this.el.addEventListener('mouseleave', function () {
        if (self.playState !== 'paused') return;
        self.playState = 'playing';
        self.tick();
      });
    }
    doc.addEventListener('visibilitychange', function () {
      if (self.playState === 'stopped') return;
      if (doc.hidden) { clearTimeout(self.playTimer); self.playState = 'hidden'; }
      else if (self.playState === 'hidden') { self.playState = 'playing'; self.tick(); }
    });
  };
  Slider.prototype.tick = function () {
    var self = this;
    clearTimeout(this.playTimer);
    this.playTimer = setTimeout(function () {
      if (self.playState !== 'playing') return;
      self.select(self.selectedIndex + 1);
      self.tick();
    }, this.o.autoPlay);
  };
  Slider.prototype.stopPlayer = function () {
    if (!this.o.autoPlay) return;
    this.playState = 'stopped';
    clearTimeout(this.playTimer);
  };
  Slider.prototype.uiChange = function () { this.stopPlayer(); };

  function initSliders() {
    $$('[data-flickity-options]').forEach(function (el) {
      el._slider = new Slider(el);
      // Flatsome: imagesLoaded -> .slider-wrapper .loading-spin fadeOut (jQuery default 400ms)
      var wrapper = el.closest('.slider-wrapper');
      var spins = wrapper ? $$('.loading-spin', wrapper) : [];
      if (!spins.length) return;
      // only the visible slide's images: lazy images in hidden slides never fire load
      var imgs = $$('.is-selected img', el).filter(function (img) { return !img.complete; });
      var left = imgs.length, faded = false;
      window.addEventListener('load', function () { fadeOut(); });
      function fadeOut() {
        if (faded) return;
        faded = true;
        spins.forEach(function (s) {
          s.style.transition = 'opacity 400ms ease';
          s.style.opacity = '0';
          setTimeout(function () { s.style.display = 'none'; }, 400);
        });
      }
      if (!left) return fadeOut();
      imgs.forEach(function (img) {
        function done() { if (--left === 0) fadeOut(); }
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. Project tabs
   * ------------------------------------------------------------------ */
  function initTabs() {
    $$('.tabbed-content').forEach(function (box) {
      var tabs = $$(':scope > ul.nav > li.tab', box);
      var panels = $$(':scope > .tab-panels > .panel', box);
      tabs.forEach(function (li, i) {
        var a = $('a', li);
        a.addEventListener('click', function (e) {
          e.preventDefault();
          tabs.forEach(function (t) { t.classList.toggle('active', t === li); });
          panels.forEach(function (p, k) { p.classList.toggle('active', k === i); });
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Scroll reveal ([data-animate]) + lazy section backgrounds
   * ------------------------------------------------------------------ */
  function initReveal() {
    var els = $$('[data-animate]');
    var bgs = $$('.bg:not(.bg-loaded)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.setAttribute('data-animated', 'true'); });
      bgs.forEach(function (el) { el.classList.add('bg-loaded'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.setAttribute('data-animated', 'true');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el) { io.observe(el); });

    var bgIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('bg-loaded');
        bgIo.unobserve(en.target);
      });
    }, { rootMargin: '300px 0px' });
    bgs.forEach(function (el) { bgIo.observe(el); });
  }

  /* ------------------------------------------------------------------ *
   * 7. Back-to-top button (visible once scrolled past one viewport)
   * ------------------------------------------------------------------ */
  function initBackToTop() {
    var btn = $('#top-link');
    if (!btn) return;
    function update() { btn.classList.toggle('active', window.pageYOffset > window.innerHeight); }
    window.addEventListener('scroll', update, { passive: true });
    update();
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------ *
   * 8. Language flags (Google Website Translator, like GTranslate)
   * ------------------------------------------------------------------ */
  function initTranslate() {
    var holder = $('#glt-footer');
    if (holder && !$('body > #google_language_translator')) holder.innerHTML = "<div id='google_language_translator'></div>";

    window.bbb = function () {
      /* global google */
      new google.translate.TranslateElement({ pageLanguage: 'vi', includedLanguages: 'en,fr,vi' }, 'google_language_translator');
    };
    var s = doc.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=bbb';
    s.async = true;
    doc.body.appendChild(s);

    function setLang(lang, tries) {
      var c = $('select.goog-te-combo');
      var box = $('#google_language_translator');
      if (!box || !box.innerHTML.length || !c || !c.innerHTML.length) {
        if ((tries || 0) < 200) setTimeout(function () { setLang(lang, (tries || 0) + 1); }, 50);
        return;
      }
      c.value = lang;
      c.dispatchEvent(new Event('change', { bubbles: true }));
      c.dispatchEvent(new Event('change', { bubbles: true }));
    }
    $$('a.nturl').forEach(function (a) {
      a.addEventListener('click', function () {
        // the original handler does not cancel the "#" navigation
        setLang(a.classList.contains('en') ? 'en' : 'vi');
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 9. Image lightbox for gallery items (Flatsome "lightbox-gallery":
   *    magnific popup, type image, gallery mode, one group per parent)
   * ------------------------------------------------------------------ */
  var ANGLE = {
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z"/></svg>'
  };

  function initImageLightbox() {
    if (!doc.body.classList.contains('lightbox')) return;
    var groups = [];
    $$('a.lightbox-gallery').forEach(function (a) {
      var parent = a.parentNode;
      if (groups.indexOf(parent) < 0) groups.push(parent);
    });
    groups.forEach(function (parent) {
      var links = $$(':scope > a', parent).filter(function (a) { return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(a.getAttribute('href') || ''); });
      links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          openGallery(links, i);
        });
      });
    });
  }

  function openGallery(links, index) {
    var total = links.length, cur = index;
    var container;
    function show(i) {
      cur = (i + total) % total;
      var a = links[cur];
      var content = $('.mfp-content', container);
      container.classList.remove('mfp-s-ready');
      container.classList.add('mfp-s-loading');
      content.innerHTML = '<div class="mfp-figure"><div class="mfp-close"></div><figure><img class="mfp-img" alt="">' +
        '<figcaption><div class="mfp-bottom-bar"><div class="mfp-title"></div><div class="mfp-counter"></div></div></figcaption></figure></div>';
      $('.mfp-title', content).textContent = a.getAttribute('title') || '';
      $('.mfp-counter', content).textContent = total > 1 ? (cur + 1) + ' of ' + total : '';
      var img = $('.mfp-img', content);
      img.onload = function () {
        container.classList.remove('mfp-s-loading');
        container.classList.add('mfp-s-ready');
      };
      img.onerror = function () {
        container.classList.remove('mfp-s-loading');
        container.classList.add('mfp-s-error');
        $('.mfp-preloader', container).innerHTML = 'The image #' + (cur + 1) + ' could not be loaded.';
      };
      img.src = a.getAttribute('href');
      img.addEventListener('click', function () { if (total > 1) show(cur + 1); });
    }
    function onKey(e) {
      if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    }
    openPopup({
      cls: 'mfp-gallery',
      holder: 'mfp-image-holder',
      preloader: '<div class="loading-spin centered dark"></div>',
      fill: function (content) {
        container = content.parentNode;
        if (total > 1) {
          ['left', 'right'].forEach(function (dir) {
            var b = doc.createElement('button');
            b.type = 'button';
            b.className = 'mfp-arrow mfp-arrow-' + dir;
            b.title = dir === 'left' ? 'Previous (Left arrow key)' : 'Next (Right arrow key)';
            b.innerHTML = '<i class="icon-angle-' + dir + '">' + ANGLE[dir] + '</i>';
            b.addEventListener('click', function (e) {
              e.stopPropagation();
              show(cur + (dir === 'left' ? -1 : 1));
            });
            container.appendChild(b);
          });
        }
        show(index);
        doc.addEventListener('keydown', onKey);
      },
      onClose: function () { doc.removeEventListener('keydown', onKey); }
    });
  }

  /* ------------------------------------------------------------------ *
   * 10. Banner grids (Packery: top-most, then left-most fit)
   * ------------------------------------------------------------------ */
  function initPackery() {
    var grids = $$('[data-packery-options], .has-packery');
    if (!grids.length) return;
    function layout(grid) {
      var cs = getComputedStyle(grid);
      var pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop);
      var width = grid.clientWidth - pl - parseFloat(cs.paddingRight);
      grid.style.position = 'relative';
      var placed = [], maxY = 0;
      Array.prototype.forEach.call(grid.children, function (el) {
        if (el.nodeType !== 1 || el.tagName === 'STYLE') return;
        el.style.position = 'absolute';
        var ecs = getComputedStyle(el), r = el.getBoundingClientRect();
        var w = r.width + parseFloat(ecs.marginLeft) + parseFloat(ecs.marginRight);
        var h = r.height + parseFloat(ecs.marginTop) + parseFloat(ecs.marginBottom);
        var xs = [0], ys = [0];
        placed.forEach(function (p) { xs.push(p.x + p.w); ys.push(p.y + p.h); });
        xs.sort(function (a, b) { return a - b; });
        ys.sort(function (a, b) { return a - b; });
        var pos = null;
        for (var yi = 0; yi < ys.length && !pos; yi++) {
          for (var xi = 0; xi < xs.length && !pos; xi++) {
            var x = xs[xi], y = ys[yi];
            if (x + w > width + 1) continue;
            var hit = placed.some(function (p) {
              return x < p.x + p.w - 1 && x + w > p.x + 1 && y < p.y + p.h - 1 && y + h > p.y + 1;
            });
            if (!hit) pos = { x: x, y: y };
          }
        }
        if (!pos) pos = { x: 0, y: maxY };
        placed.push({ x: pos.x, y: pos.y, w: w, h: h });
        maxY = Math.max(maxY, pos.y + h);
        el.style.left = (pos.x + pl) + 'px';
        el.style.top = (pos.y + pt) + 'px';
      });
      grid.style.height = (cs.boxSizing === 'border-box' ? maxY + pt + parseFloat(cs.paddingBottom) : maxY) + 'px';
    }
    function all() { grids.forEach(layout); }
    all();
    window.addEventListener('load', function () {
      all();
      $$('.banner-grid-wrapper').forEach(function (w) { w.classList.remove('processing'); });
    });
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(all, 100); });
  }

  /* ------------------------------------------------------------------ *
   * 11. Countdown timers (.ux-timer[data-countdown])
   * ------------------------------------------------------------------ */
  function initCountdown() {
    $$('.ux-timer[data-countdown]').forEach(function (el) {
      var parts = (el.getAttribute('data-countdown') || '').split(/[\/\s:]/).map(Number);
      var end = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, parts[3] || 0, parts[4] || 0, parts[5] || 0).getTime();
      function label(key, n) {
        var p = el.getAttribute('data-text-' + key + '-p');
        var plural = el.getAttribute('data-text-plural') || '';
        var s = el.getAttribute('data-text-' + key) || key;
        return n === 1 ? s : (p || s + plural);
      }
      function pad(n) { return (n < 10 ? '0' : '') + n; }
      function tick() {
        var left = Math.max(0, Math.round((end - Date.now()) / 1000));
        var w = Math.floor(left / 604800), d = Math.floor(left / 86400) % 7,
          h = Math.floor(left / 3600) % 24, m = Math.floor(left / 60) % 60, s = left % 60;
        var html = '';
        if (w > 0) html += '<span>' + w + '<strong>' + label('week', w) + '</strong></span> ';
        html += '<span>' + d + '<strong>' + label('day', d) + '</strong></span> ' +
          '<span>' + pad(h) + '<strong>' + label('hour', h) + '</strong></span> ' +
          '<span>' + pad(m) + '<strong>' + label('min', m) + '</strong></span> ' +
          '<span>' + pad(s) + '<strong>' + label('sec', s) + '</strong></span>';
        el.innerHTML = html;
        if (left > 0) setTimeout(tick, 1000);
      }
      tick();
    });
  }

  /* ------------------------------------------------------------------ *
   * 12. Contact Form 7 forms - client-side validation only.
   *     This is a static site: nothing is sent anywhere.
   * ------------------------------------------------------------------ */
  var CF7_MSG = {
    required: 'Vui lòng điền vào trường này.',
    email: 'Vui lòng nhập địa chỉ email hợp lệ.',
    tel: 'Vui lòng nhập số điện thoại hợp lệ.',
    invalid: 'Có một hoặc nhiều mục nhập có lỗi. Vui lòng kiểm tra và thử lại.',
    offline: 'Đây là bản web tĩnh: biểu mẫu chưa được kết nối máy chủ nên thông tin chưa được gửi đi.'
  };

  function initForms() {
    $$('.wpcf7').forEach(function (box) {
      box.classList.remove('no-js');
      box.classList.add('js');
      var form = $('form.wpcf7-form', box);
      if (!form) return;
      var output = $('.wpcf7-response-output', form);
      var fields = $$('.wpcf7-form-control-wrap', form);

      function check(wrap) {
        var ctl = $('input, textarea, select', wrap);
        if (!ctl) return true;
        var tip = $('.wpcf7-not-valid-tip', wrap);
        if (tip) tip.remove();
        var v = (ctl.type === 'checkbox' || ctl.type === 'radio')
          ? ($('input:checked', wrap) ? '1' : '') : ctl.value.trim();
        var msg = '';
        if (!v && (ctl.classList.contains('wpcf7-validates-as-required') || $('.wpcf7-validates-as-required', wrap))) msg = CF7_MSG.required;
        else if (v && ctl.classList.contains('wpcf7-validates-as-email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = CF7_MSG.email;
        else if (v && ctl.classList.contains('wpcf7-validates-as-tel') && !/^[+]?[0-9() -]{6,}$/.test(v)) msg = CF7_MSG.tel;
        ctl.classList.toggle('wpcf7-not-valid', !!msg);
        ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (msg) {
          tip = doc.createElement('span');
          tip.className = 'wpcf7-not-valid-tip';
          tip.setAttribute('aria-hidden', 'true');
          tip.textContent = msg;
          wrap.appendChild(tip);
        }
        return !msg;
      }

      function setStatus(status, text) {
        form.classList.remove('init', 'invalid', 'aborted', 'sent', 'failed', 'submitting');
        form.classList.add(status);
        form.setAttribute('data-status', status);
        if (output) {
          output.textContent = text || '';
          output.setAttribute('aria-hidden', text ? 'false' : 'true');
        }
      }

      fields.forEach(function (wrap) {
        wrap.addEventListener('change', function () { if (form.getAttribute('data-status') !== 'init') check(wrap); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = fields.map(check).every(Boolean);
        if (!ok) {
          setStatus('invalid', CF7_MSG.invalid);
          var bad = $('.wpcf7-not-valid', form);
          if (bad) bad.focus();
          return;
        }
        setStatus('aborted', CF7_MSG.offline);
      });
    });
  }

  /* Header / sidebar search forms: there is no search backend in a static site */
  function initSearch() {
    $$('form.searchform').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); });
    });
  }

  /* ------------------------------------------------------------------ */
  function ready(fn) {
    if (doc.readyState !== 'loading') fn();
    else doc.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initDropdowns();
    initSticky();
    initMobileMenu();
    initVideoLightbox();
    initSliders();
    initTabs();
    initReveal();
    initBackToTop();
    initTranslate();
    initImageLightbox();
    initPackery();
    initCountdown();
    initForms();
    initSearch();
  });

  window.addEventListener('load', function () {
    html.classList.remove('loading-site');
  });
})();

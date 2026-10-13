/* RADS motion layer. Works with html.js-split (set in <head> when reduced motion is off).
   Pieces: text splitting, lerped scroll progress (--progress/--enter), pinned disciplines scene,
   marquee, magnetic buttons, hero spotlight, letter-roll hovers, menu entrance. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('js-split') || !('IntersectionObserver' in window)) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- text splitting ---------- */
  const makeChar = (ch, i, withCopy) => {
    const c = document.createElement('span');
    c.className = '-s-char';
    c.textContent = ch;
    c.style.setProperty('--char-index', i);
    if (withCopy) c.dataset.c = ch;
    else c.style.setProperty('--char-random', Math.floor(Math.random() * 10));
    return c;
  };

  // Wraps every character of el's text in spans, keeping <em>/<br>. Returns the plain text.
  function splitChars(el, skip) {
    let idx = 0, label = '';
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          label += tok.trim() ? tok : ' ';
          if (!tok.trim()) { frag.append(' '); return; }
          const word = document.createElement('span');
          word.className = '-s-word';
          word.setAttribute('aria-hidden', 'true');
          [...tok].forEach(ch => word.append(makeChar(ch, idx++)));
          frag.append(word);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !(skip && n.matches(skip))) walk(n);
    });
    walk(el);
    el.setAttribute('aria-label', label.replace(/\s+/g, ' ').trim());
    el.classList.add('-splitted');
    return label;
  }

  // Wraps words so each can slide up inside its own clip; lines are numbered by layoutLines().
  function splitWords(el) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (!tok.trim()) { frag.append(' '); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = tok;
          w.append(wi);
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    el.classList.add('has-words');
  }

  function layoutLines() {
    $$('.has-words').forEach(el => {
      let line = -1, top = null;
      $$('.w', el).forEach(w => {
        const t = w.offsetTop;
        if (top === null || Math.abs(t - top) > 4) { line++; top = t; }
        w.style.setProperty('--line', line);
      });
    });
  }

  // Letter-roll hover: the label is duplicated per character via ::after (see motion.css).
  function roll(el) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const text = n.textContent.replace(/\s+/g, ' ');
      const lead = /^\s/.test(text) ? ' ' : '', trail = /\s$/.test(text) ? ' ' : '';
      const span = document.createElement('span');
      span.className = 'roll';
      span.setAttribute('aria-hidden', 'true');
      [...text.trim()].forEach((ch, i) => span.append(makeChar(ch, i, true)));
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text.trim();
      n.replaceWith(lead, span, sr, trail);
    });
  }

  const charTargets = '.hero h1, .editorial, .grand-title, .invitation h2, .pathway h3, .rp h3';
  $$(charTargets).forEach(el => { el.classList.remove('reveal'); splitChars(el); });

  const wordTargets = '.intro-copy, .serif-paragraph, .founder-copy > p:not(.serif-paragraph), .pathways-heading > p, .offerings-intro p, .community-copy p, .community-copy > span:last-child, .beginner-note p, .invitation-bottom > p, .pathway p';
  $$(wordTargets).forEach(el => { el.classList.remove('reveal'); splitWords(el); });

  const rollTargets = '.light-button, .dark-button, .underline-button, .text-button, .menu-trigger, .desktop-nav a, .footer nav a, .footer nav button';
  $$(rollTargets).forEach(roll);

  // stagger siblings that fade up together
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--l-delay', (Math.max(sibs.indexOf(el), 0) * .15).toFixed(2));
  });
  $$('.pathway-grid .pathway, .community-gallery .community-media, .offering-list .offering').forEach((el, i, all) => {
    const sibs = [...el.parentElement.children];
    el.style.setProperty('--l-delay', (sibs.indexOf(el) * .15).toFixed(2));
  });
  $$('.pathway-media, .founder-portrait, .founder-back, .community-media').forEach(el => el.classList.add('rev'));

  /* ---------- in-view triggers ---------- */
  const viewObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('-inview'); viewObserver.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.-splitted, .has-words').forEach(el => { if (!el.matches('.hero h1, .rp h3')) viewObserver.observe(el); });

  // Looping clips (pathway cards) only play while on screen.
  const videoObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }), { threshold: .25 });
  $$('video[data-lazyplay]').forEach(v => videoObserver.observe(v));

  // .rev elements are fully clipped until revealed, which IntersectionObserver treats as not visible,
  // so their parent is observed instead and the reveal is passed down.
  const revParents = new Map();
  $$('.rev').forEach(el => {
    const parent = el.parentElement;
    if (!revParents.has(parent)) revParents.set(parent, []);
    revParents.get(parent).push(el);
  });
  const revObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    revParents.get(e.target).forEach((el, i) => {
      el.style.setProperty('--rev-delay', ((parseFloat(el.style.getPropertyValue('--l-delay')) || 0) + i * .12).toFixed(2));
      el.classList.add('-inview');
    });
    revObserver.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  revParents.forEach((_, parent) => revObserver.observe(parent));

  /* ---------- scroll progress (lerped) ---------- */
  const tracks = [];
  const track = (el, mode) => { if (el) tracks.push({ el, mode, p: 0, e: 0, tp: 0, te: 0, lp: -1, le: -1 }); };
  track($('.hero'), 'out');
  ['.intro', '.disciplines', '.pathways', '.founder', '.community', '.offerings', '.invitation'].forEach(s => track($(s)));
  $$('.pathway-media, .founder-portrait, .founder-back, .community-media').forEach(el => track(el));
  $$('[data-progress]').forEach(el => track(el, el.dataset.progress === 'out' ? 'out' : 'full'));

  const mouse = { tx: 0, ty: 0, x: 0, y: 0, sx: 50, sy: 35, spot: 0, tspot: 0 };
  const magnets = [];
  const marquee = { move: null, anim: null, boost: 0 };
  let running = false;
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  function measure() {
    const vh = innerHeight;
    tracks.forEach(t => {
      const r = t.el.getBoundingClientRect();
      t.tp = t.mode === 'out' ? clamp(-r.top / r.height) : clamp((vh - r.top) / (vh + r.height));
      t.te = clamp((vh - r.top) / (vh * .7));
    });
  }

  function frame() {
    let busy = false;
    tracks.forEach(t => {
      const dp = t.tp - t.p, de = t.te - t.e;
      if (Math.abs(dp) > .0004) { t.p += dp * .14; busy = true; } else t.p = t.tp;
      if (Math.abs(de) > .0004) { t.e += de * .14; busy = true; } else t.e = t.te;
      if (t.p !== t.lp) { t.el.style.setProperty('--progress', t.p.toFixed(4)); t.lp = t.p; }
      if (t.e !== t.le) { t.el.style.setProperty('--enter', t.e.toFixed(4)); t.le = t.e; }
    });

    if (hero) {
      mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08;
      mouse.spot += (mouse.tspot - mouse.spot) * .1;
      if (Math.abs(mouse.tx - mouse.x) > .001 || Math.abs(mouse.ty - mouse.y) > .001 || Math.abs(mouse.tspot - mouse.spot) > .005) busy = true;
      hero.style.setProperty('--mxn', mouse.x.toFixed(3));
      hero.style.setProperty('--myn', mouse.y.toFixed(3));
      hero.style.setProperty('--sx', mouse.sx.toFixed(1) + '%');
      hero.style.setProperty('--sy', mouse.sy.toFixed(1) + '%');
      hero.style.setProperty('--spot', mouse.spot.toFixed(3));
    }

    magnets.forEach(m => {
      const dx = m.tx - m.x, dy = m.ty - m.y;
      if (Math.abs(dx) > .05 || Math.abs(dy) > .05) { m.x += dx * .18; m.y += dy * .18; busy = true; }
      else { m.x = m.tx; m.y = m.ty; }
      m.el.style.translate = (m.x || m.y) ? `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px` : '';
    });

    if (marquee.anim) {
      marquee.boost *= .94;
      if (marquee.boost < .02) marquee.boost = 0; else busy = true;
      marquee.anim.playbackRate = 1 + marquee.boost;
    }

    if (rhythmStep()) busy = true;

    if (busy) requestAnimationFrame(frame); else running = false;
  }

  /* ---------- hero pointer: spotlight + card drift ---------- */
  const hero = $('.hero');
  const heroMedia = $('.hero-media');
  if (fine && hero && heroMedia) {
    const spot = document.createElement('span');
    spot.className = 'spot';
    spot.setAttribute('aria-hidden', 'true');
    heroMedia.prepend(spot);
    hero.addEventListener('pointermove', e => {
      const hr = hero.getBoundingClientRect(), mr = heroMedia.getBoundingClientRect();
      mouse.tx = ((e.clientX - hr.left) / hr.width - .5) * 2;
      mouse.ty = ((e.clientY - hr.top) / hr.height - .5) * 2;
      mouse.sx = clamp((e.clientX - mr.left) / mr.width) * 100;
      mouse.sy = clamp((e.clientY - mr.top) / mr.height) * 100;
      mouse.tspot = e.clientX > mr.left && e.clientX < mr.right && e.clientY > mr.top && e.clientY < mr.bottom ? 1 : 0;
      kick();
    });
    hero.addEventListener('pointerleave', () => { mouse.tx = mouse.ty = 0; mouse.tspot = 0; kick(); });
  }

  /* ---------- magnetic buttons ---------- */
  if (fine) {
    $$('.light-button, .menu-trigger, .circle-button, .media-play').forEach(el => magnets.push({ el, x: 0, y: 0, tx: 0, ty: 0 }));
    window.addEventListener('pointermove', e => {
      let moved = false;
      magnets.forEach(m => {
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const near = Math.hypot(dx, dy) < 150 + Math.max(r.width, r.height) / 2;
        const tx = near ? dx * .3 : 0, ty = near ? dy * .3 : 0;
        if (tx !== m.tx || ty !== m.ty) { m.tx = tx; m.ty = ty; moved = true; }
      });
      if (moved) kick();
    }, { passive: true });
  }

  /* ---------- marquee (speeds up while scrolling) ---------- */
  function buildMarquee() {
    const band = $('.marquee');
    if (!band) return;
    const move = $('.marquee-move', band);
    const part = $('.marquee-part', band);
    if (!move || !part) return;
    $$('.marquee-part', move).slice(1).forEach(p => p.remove());
    const copies = Math.max(2, Math.ceil(innerWidth / part.offsetWidth) + 1);
    for (let i = 1; i < copies; i++) move.append(part.cloneNode(true));
    marquee.anim?.cancel();
    marquee.anim = move.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${-100 / copies}%)` }],
      { duration: 38000, iterations: Infinity, easing: 'linear' }
    );
    marquee.move = move;
  }
  const marqueeBand = $('.marquee');
  if (marqueeBand) {
    new IntersectionObserver(es => es.forEach(e => {
      if (!marquee.anim) return;
      e.isIntersecting ? marquee.anim.play() : marquee.anim.pause();
    })).observe(marqueeBand);
  }

  /* ---------- disciplines: expanding centre tile ---------- */
  const rhythmTrack = $('#rhythm-track');
  const rhythmMQ = matchMedia('(min-width:900px) and (min-height:700px)');
  const rhythm = { e: 0, s: 0, te: 0, ts: 0, panels: [], ticks: [] };
  if (rhythmTrack) {
    rhythm.panels = $$('.rp', rhythmTrack);
    rhythm.ticks = $$('.rhythm-ticks button', rhythmTrack);
    rhythm.panels.forEach((panel, k) => { panel.style.zIndex = k + 1; });
  }
  const rhythmActive = () => Boolean(rhythmTrack) && rhythmMQ.matches;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // scroll position -> target: e = how far the centre tile has expanded, s = which discipline (0..n-1)
  function rhythmMeasure() {
    if (!rhythmActive()) return;
    const r = rhythmTrack.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight));
    rhythm.te = easeOut(clamp(p / .24));
    rhythm.ts = clamp((p - .30) / .62) * (rhythm.panels.length - 1);
  }

  function rhythmApply() {
    const { e, s } = rhythm;
    rhythmTrack.style.setProperty('--e', e.toFixed(4));
    rhythmTrack.classList.toggle('-open', e > .25);
    $('.rhythm-mosaic', rhythmTrack).inert = e > .5;
    rhythm.panels.forEach((panel, k) => {
      panel.style.setProperty('--r', (k === 0 ? 1 : clamp(s - (k - 1))).toFixed(4));
      let a = clamp(1 - Math.abs(s - k) * 1.7);
      if (k === 0) a *= clamp((e - .78) * 4.5);
      panel.style.setProperty('--a', a.toFixed(3));
      const on = a > .45;
      $('.rp-copy', panel).inert = !on;
      $('h3', panel).classList.toggle('-inview', on);
    });
    rhythm.ticks.forEach((tick, k) => {
      tick.style.setProperty('--f', clamp(s - k + 1).toFixed(3));
      tick.disabled = e < .8;
    });
  }

  function rhythmStep() {
    if (!rhythmActive()) return false;
    let busy = false;
    const de = rhythm.te - rhythm.e, ds = rhythm.ts - rhythm.s;
    if (Math.abs(de) > .0005) { rhythm.e += de * .16; busy = true; } else rhythm.e = rhythm.te;
    if (Math.abs(ds) > .0005) { rhythm.s += ds * .14; busy = true; } else rhythm.s = rhythm.ts;
    rhythmApply();
    return busy;
  }

  // Scrolls the pinned scene to a given form; returns false when the scene isn't active (phones etc.).
  window.rhythmGoTo = k => {
    if (!rhythmActive()) return false;
    const r = rhythmTrack.getBoundingClientRect();
    const p = .30 + .62 * (k / (rhythm.panels.length - 1));
    scrollTo({ top: scrollY + r.top + (r.height - innerHeight) * p + 2, behavior: 'smooth' });
    return true;
  };
  rhythm.ticks.forEach((tick, k) => tick.addEventListener('click', () => window.rhythmGoTo(k)));

  /* ---------- menu overlay entrance ---------- */
  const menuDialog = $('#menu-dialog');
  if (menuDialog) {
    $$('nav a', menuDialog).forEach((a, i) => { a.style.setProperty('--link', i); splitChars(a, 'small'); });
    new MutationObserver(() => menuDialog.classList.toggle('-inview', menuDialog.open))
      .observe(menuDialog, { attributes: true, attributeFilter: ['open'] });
  }

  /* ---------- hero SVG trail ---------- */
  $$('.hero-trail path').forEach(p => p.setAttribute('pathLength', '1'));

  /* ---------- cursor trail (canvas ribbon; physics ported from Obsidian Assembly) ---------- */
  if (fine && matchMedia('(min-width:1025px)').matches) (() => {
    const cfg = {
      length: 60, width: 1.5, damping: .6, retention: .8, influence: .3, strength: .025,
      speedInfluence: .9, speedMax: 600, smoothing: .2,
      from: [184, 150, 214], to: [197, 143, 116], alphaFrom: .85, alphaTo: .15
    };
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const pts = Array.from({ length: cfg.length }, () => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    const head = { x: 0, y: 0 };
    let active = false, speed = 0, lastX = 0, lastY = 0, lastT = 0, raf = 0;

    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
    };
    size();
    addEventListener('resize', size);

    addEventListener('pointermove', e => {
      const now = performance.now();
      if (!active) {
        active = true;
        pts.forEach(p => { p.x = e.clientX; p.y = e.clientY; p.vx = p.vy = 0; });
        lastX = e.clientX; lastY = e.clientY; lastT = now;
      } else {
        const dt = Math.max(1, now - lastT) / 1000;
        const s = Math.min(1, Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt / cfg.speedMax);
        speed += (s - speed) * cfg.smoothing;
        lastX = e.clientX; lastY = e.clientY; lastT = now;
      }
      head.x = e.clientX; head.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { active = false; });

    function tick() {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      const boost = 1 + cfg.speedInfluence * speed;
      const p0 = pts[0];
      const gx = (head.x - p0.x) * (cfg.damping + .1), gy = (head.y - p0.y) * (cfg.damping + .1);
      p0.vx = p0.vx * cfg.retention + gx * cfg.influence * boost;
      p0.vy = p0.vy * cfg.retention + gy * cfg.influence * boost;
      p0.x += gx + p0.vx * cfg.strength * boost;
      p0.y += gy + p0.vy * cfg.strength * boost;
      let motion = Math.abs(gx) + Math.abs(gy);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = (a.x - b.x) * cfg.damping, dy = (a.y - b.y) * cfg.damping;
        b.vx = b.vx * cfg.retention + dx * cfg.influence * 2;
        b.vy = b.vy * cfg.retention + dy * cfg.influence * 4;
        b.x += dx + b.vx * cfg.strength;
        b.y += dy + b.vy * cfg.strength;
        motion += Math.abs(dx) + Math.abs(dy);
      }
      if (active) {
        const n = pts.length - 1;
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const c = cfg.from.map((v, k) => Math.round(v + (cfg.to[k] - v) * t));
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(cfg.alphaFrom + (cfg.alphaTo - cfg.alphaFrom) * t).toFixed(3)})`;
          ctx.lineWidth = Math.max(.4, cfg.width * (1 - t * .6) * boost);
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
          ctx.stroke();
        }
      }
      speed *= .94;
      if (active || motion > .05) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    }
  })();

  /* ---------- wiring ---------- */
  let lastY = scrollY;
  window.addEventListener('scroll', () => {
    const dv = Math.abs(scrollY - lastY);
    lastY = scrollY;
    marquee.boost = Math.min(Math.max(marquee.boost, dv * .35), 9);
    measure();
    rhythmMeasure();
    kick();
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { placeHeroEcho(); layoutLines(); buildMarquee(); measure(); rhythmMeasure(); kick(); }, 150);
  });

  /* ---------- hero headline echo: ivory copy inside the film arch, aligned to the real headline ---------- */
  function buildHeroEcho() {
    const h1 = $('.hero h1'), media = $('.hero-media');
    if (!h1 || !media || $('.hero-echo', media) || h1.closest('.hero-split')) return;
    const echo = h1.cloneNode(true);
    echo.removeAttribute('id');
    echo.removeAttribute('aria-label');
    echo.setAttribute('aria-hidden', 'true');
    echo.classList.add('hero-echo');
    media.append(echo);
    placeHeroEcho();
  }
  function placeHeroEcho() {
    const h1 = $('.hero h1'), media = $('.hero-media'), echo = $('.hero-echo', media || document);
    if (!h1 || !media || !echo) return;
    echo.style.left = (h1.offsetLeft - (media.offsetLeft - media.offsetWidth / 2)) + 'px';
    echo.style.top = (h1.offsetTop - media.offsetTop) + 'px';
    echo.style.width = h1.offsetWidth + 'px';
  }

  /* ---------- count-up numbers (hero highlights on load, credentials card on view) ---------- */
  const heroCounters = $$('.hero [data-count]');
  const creditCounters = $$('.credits [data-count]');
  [...heroCounters, ...creditCounters].forEach(el => { el.textContent = '0' + (el.dataset.suffix || ''); });
  function countUp(el) {
    const end = Number(el.dataset.count), suffix = el.dataset.suffix || '', t0 = performance.now();
    const tick = now => {
      const p = clamp((now - t0) / 1800);
      el.textContent = Math.round(end * easeOut(p)).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = end.toLocaleString('en-US') + suffix; }, 4500);
  }
  const runCounters = () => heroCounters.forEach(countUp);
  const creditObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    $$('[data-count]', e.target).forEach(countUp);
    creditObserver.unobserve(e.target);
  }), { threshold: .4 });
  $$('.credits').forEach(c => creditObserver.observe(c));

  const start = () => {
    buildHeroEcho();
    layoutLines();
    buildMarquee();
    measure();
    rhythmMeasure();
    rhythm.e = rhythm.te; rhythm.s = rhythm.ts;
    if (rhythmActive()) rhythmApply();
    tracks.forEach(t => { t.p = t.tp; t.e = t.te; });
    kick();
    setTimeout(() => {
      root.classList.add('-loaded');
      $$('.hero h1').forEach(h => h.classList.add('-inview'));
      setTimeout(runCounters, 1900);
    }, 60);
  };
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1800))]).then(start);
})();

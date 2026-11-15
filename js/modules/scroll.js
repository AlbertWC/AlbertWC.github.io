// Scroll-linked effects. One rAF-throttled handler, driven by scrollY against a layout cache:
// section tops/heights are measured on load, resize and size changes, never per frame, and a CSS
// variable is only written when its value changes (each write costs a style recalc on a phone).
//   [data-pin]        tall section with a sticky stage; writes --pp (0..1) on its first child
//   [data-seq]        pinned section; its [data-seq-item]s light up one by one (--sp, data-step). Where it does not
//                     pin (phones, short screens) it loses the attribute, so tools that look for pinned sections
//                     (the flick test) see a plain section; on touch it also gets .is-stacked: its steps rise in like
//                     [data-reveal] and the example phone plays its three screens on a timer while it is on screen.
//   [data-wipe]       media opens from a window to full size as it enters (--k)
//   [data-parallax]   element drifts against the scroll (--dy)
//   [data-drift]      same, with alternating speeds so neighbours move apart
//   [data-lines]      each <br>-separated line fades up as it reaches reading height
//   [data-line-h]     heading draws its underline (--k)
//   [data-reveal]     rises and fades in, and back out if you scroll up (--r)
//   [data-to]         number counts up with the scroll (data-dec for decimals)
//   [data-hscroll]    desktop only: vertical scrolling slides the [data-htrack] row sideways
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const goTo = y => window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.3 }) : scrollTo({ top: y, behavior: 'smooth' });

// hooks: functions called with scrollY at the end of each frame (e.g. the atmosphere tint), so nothing else reads it.
export function initScrollFx(hooks = []) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Touch: one fling travels about a screen, so short scrubs get a longer runway (RUN), and pinned
  // progress eases toward the finger (EASE: rate per second, frame-rate independent) instead of jumping
  // with the momentum. Desktop already has Lenis, so no easing there.
  const RUN = finePointer ? 1 : 1.6;
  const EASE = finePointer ? 0 : 16;
  // Fade-ins: on touch they start as soon as an element enters and finish within ~18% of the screen,
  // so text is fully sharp while it is still in the lower part of the screen (was ~mid-screen).
  const IN = finePointer ? 0.96 : 1.0, FADE = finePointer ? 0.32 : 0.18;

  document.querySelectorAll('[data-lines]').forEach(el => {
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(t => `<span class="line">${t}</span>`).join('');
  });

  const pins = [...document.querySelectorAll('[data-pin]')].map(el => ({ el, stage: el.firstElementChild, cur: -1 }));
  const seqs = [...document.querySelectorAll('[data-seq]')].map(el => ({
    el, sticky: el.firstElementChild, visual: el.querySelector('.seq__visual'), items: [...el.querySelectorAll('[data-seq-item]')],
    bar: el.querySelector('[data-seq-bar]'), idx: -2, tops: [], timers: [],
  }));
  // Show step idx: data-step picks the phone screen (main.css), the classes light the steps.
  const showStep = (s, idx) => {
    if (idx === s.idx) return;
    s.el.dataset.step = idx;
    s.idx = idx;
    s.items.forEach((it, i) => { it.classList.toggle('is-on', i <= idx); it.classList.toggle('is-current', i === idx); });
  };
  // Touch + stacked: one flick would scrub the three screens past in a blink, so they play on a timer instead,
  // once each time the phone comes into view (no endless loop), and rewind when it leaves.
  const playScreens = (s, on) => {
    s.timers.forEach(clearTimeout);
    s.timers = [];
    showStep(s, 0);
    if (on) for (let i = 1; i < s.items.length; i++) s.timers.push(setTimeout(() => showStep(s, i), i * 1500));
  };
  if (!finePointer && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        const s = seqs.find(q => q.visual === e.target);
        if (s && !s.pinned) playScreens(s, e.isIntersecting);
      }
    }, { threshold: 0.6 });
    seqs.forEach(s => s.visual && io.observe(s.visual));
  }
  const timed = s => !finePointer && !s.pinned;
  // Click a step to travel to it.
  for (const s of seqs) s.items.forEach((it, i) => {
    // Only a pinned sequence has somewhere to travel to; stacked, a tap would just make the page jump.
    const go = () => s.pinned && goTo(s.top + ((i + 0.5) / s.items.length) * 0.86 * (s.h - vh));
    // A real link inside a step (the Order button) keeps its own click and keys.
    it.addEventListener('click', e => { if (!e.target.closest('a')) go(); });
    it.addEventListener('keydown', e => { if (e.target === it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
  });

  const box = el => ({ el, top: 0, h: 0 });
  const wipes = [...document.querySelectorAll('[data-wipe]')].map(box);
  const heads = [...document.querySelectorAll('[data-line-h]')].map(box);
  const lines = [...document.querySelectorAll('.line')].map(box);
  const drifts = [...document.querySelectorAll('[data-drift]')].map((el, i) => ({ ...box(el), speed: i % 2 ? 0.12 : 0.05 }));
  const paras = [...document.querySelectorAll('[data-parallax]')].map(el => ({ ...box(el), speed: +el.dataset.parallax }));
  const reveals = [...document.querySelectorAll('[data-reveal]')].map(el => ({ ...box(el), off: ([...el.parentElement.children].indexOf(el) % 4) * 0.045 }));
  const counters = [...document.querySelectorAll('[data-to]')].map(el => ({ ...box(el), to: +el.dataset.to, dec: +(el.dataset.dec || 0) }));

  // The sideways strip pins only where a wheel drives it; touch keeps a native swipe row.
  const hpin = finePointer && innerWidth > 700;
  root.classList.toggle('hpin', hpin);
  const hs = hpin ? [...document.querySelectorAll('[data-hscroll]')].map(el => ({
    el, track: el.querySelector('[data-htrack]'), bar: el.querySelector('[data-hbar]'),
    figs: [...el.querySelectorAll('figure')].map(f => ({ f, cx: 0 })), dist: 0, top: 0, h: 0,
  })) : [];

  // Write-if-changed: the last value per element+property.
  const last = new WeakMap();
  const set = (el, prop, val) => {
    let m = last.get(el);
    if (!m) last.set(el, m = {});
    if (m[prop] === val) return;
    m[prop] = val;
    if (prop === 'transform') el.style.transform = val; else el.style.setProperty(prop, val);
  };
  const toggle = (el, cls, on) => { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };

  // ---- layout cache. vh is the small viewport (100svh), so the phone toolbar showing/hiding moves nothing.
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  let vh = innerHeight, maxY = 1;
  const docTop = el => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const measureBox = b => { b.top = docTop(b.el); b.h = b.el.offsetHeight; };
  function measure() {
    vh = probe.offsetHeight || innerHeight;
    for (const h of hs) {
      h.dist = Math.max(0, h.track.scrollWidth - innerWidth);
      h.el.style.height = `${h.dist + vh}px`;
    }
    maxY = Math.max(1, root.scrollHeight - innerHeight);
    [...pins, ...wipes, ...heads, ...lines, ...drifts, ...paras, ...reveals, ...counters, ...hs].forEach(measureBox);
    for (const s of seqs) {
      measureBox(s);
      s.pinned = getComputedStyle(s.sticky).position === 'sticky';
      s.el.classList.toggle('is-stacked', timed(s));   // touch only: the steps' reveal styles (main.css)
      s.el.toggleAttribute('data-seq', s.pinned);
      if (s.pinned) { s.timers.forEach(clearTimeout); s.timers = []; }
      s.vTop = docTop(s.visual);
      s.tops = s.items.map(docTop);
      s.items.forEach(it => s.pinned ? it.tabIndex = 0 : it.removeAttribute('tabindex'));
    }
    for (const h of hs) for (const g of h.figs) g.cx = g.f.offsetLeft + g.f.offsetWidth / 2;
  }
  // A scrub that starts at scrollY s0 and runs `len` px, but always finishes by the bottom of the page.
  const scrub = (y, s0, len) => { const room = Math.min(len, maxY - s0); return room <= 0 ? 1 : clamp((y - s0) / room); };

  // Everything below is computed every frame (no rect reads, so it is cheap) and written only when it
  // changes, so far-away sections settle at 0 or 1 once and cost nothing after that.
  let ticking = false, lastT = 0;
  function frame(jump, t = performance.now()) {
    ticking = false;
    const y = scrollY, dt = Math.min(0.1, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    let more = false;
    const near = (top, h, before = vh, after = vh) => y + vh > top - before && y < top + h + after;

    for (const pin of pins) {
      const live = near(pin.top, pin.h, 0, 0);
      toggle(pin.stage, 'is-live', live);
      const p = clamp((y - pin.top) / Math.max(1, pin.h - vh));
      // Ease only while the stage is on screen; off screen it just takes the target.
      pin.cur = jump || !live || !EASE || pin.cur < 0 ? p : pin.cur + (p - pin.cur) * (1 - Math.exp(-EASE * dt));
      if (Math.abs(p - pin.cur) < 0.0008) pin.cur = p; else more = true;
      set(pin.stage, '--pp', pin.cur.toFixed(4));
      toggle(pin.stage, 'is-moved', pin.cur > 0.2);   // the cue has faded by then (main.css)
    }
    for (const s of seqs) {
      if (timed(s)) {
        // Stacked on touch: each step rises in over half a screen of scroll (reversible); the phone runs on its timer.
        s.tops.forEach((top, i) => set(s.items[i], '--r', scrub(y, top - vh * (IN - (i % 4) * 0.03), vh * FADE).toFixed(3)));
        continue;
      }
      // Stacked (narrow or short screens), the phone follows its own position through the viewport instead.
      const n = s.items.length;
      const sp = s.pinned ? clamp(clamp((y - s.top) / Math.max(1, s.h - vh)) / 0.86) : scrub(y, s.vTop - vh * 0.85, vh * 0.6 * RUN);
      const idx = Math.min(n - 1, Math.floor(sp * n));
      set(s.sticky, '--sp', sp.toFixed(3));
      if (s.bar) set(s.bar, 'transform', `scaleX(${sp.toFixed(3)})`);
      showStep(s, idx);
    }
    for (const b of wipes) {
      const k = scrub(y, b.top - vh, vh * 0.8 * RUN);
      set(b.el, '--k', k.toFixed(3));
      toggle(b.el, 'is-live', k > 0 && k < 1);
    }
    for (const b of heads) set(b.el, '--k', scrub(y, b.top - vh * (finePointer ? 0.82 : 0.95), vh * (finePointer ? 0.3 : 0.2)).toFixed(3));
    for (const b of lines) set(b.el, '--k', scrub(y, b.top - vh * IN, vh * FADE).toFixed(3));
    for (const b of [...drifts, ...paras]) {
      if (!near(b.top, b.h, 200, 200)) continue;
      set(b.el, '--dy', `${((b.top - y + b.h / 2 - vh / 2) * -b.speed).toFixed(1)}px`);
    }
    for (const b of reveals) set(b.el, '--r', scrub(y, b.top - vh * (IN - (finePointer ? b.off : b.off * 0.5)), vh * FADE).toFixed(3));
    for (const c of counters) {
      const k = 1 - Math.pow(1 - scrub(y, c.top - vh * IN, vh * (finePointer ? 0.35 : 0.25)), 3);
      const txt = (c.to * k).toFixed(c.dec);
      if (c.el.textContent !== txt) c.el.textContent = txt;
    }
    for (const h of hs) {
      const p = clamp((y - h.top) / Math.max(1, h.h - vh)), tx = -p * h.dist;
      set(h.track, 'transform', `translate3d(${tx.toFixed(1)}px,0,0)`);
      if (h.bar) set(h.bar, 'transform', `scaleX(${p.toFixed(3)})`);
      // Cards swell as they pass the middle of the screen (centres cached, so no rect reads).
      for (const g of h.figs) {
        const d = Math.min(1, Math.abs(g.cx + tx - innerWidth / 2) / (innerWidth * 0.6));
        set(g.f, '--s', (1.03 - d * 0.1).toFixed(3));
      }
    }
    for (const fn of hooks) fn(y);
    if (more) request();
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(t => frame(false, t)); } };
  let pending = false;
  const remeasure = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; measure(); frame(true); }); };

  root.classList.add('fx');      // only now do the starting (hidden / closed) states apply
  measure();
  frame(true);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', remeasure);
  addEventListener('load', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  return { refresh: remeasure };
}

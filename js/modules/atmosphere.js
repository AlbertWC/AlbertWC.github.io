// Page mood: navy -> deep plum around the career/work sections -> navy at the close.
// --sky is non-inheriting (main.css @property) and written only on body and .nav, only when the rounded colour changes.
const SKY = [
  [0, [16, 38, 60]],
  [0.4, [34, 30, 66]],
  [0.75, [22, 34, 62]],
  [1, [14, 30, 50]],
];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function skyAt(p) {
  for (let i = 1; i < SKY.length; i++) {
    const [p1, c1] = SKY[i], [p0, c0] = SKY[i - 1];
    if (p <= p1) return mix(c0, c1, (p - p0) / (p1 - p0));
  }
  return SKY[SKY.length - 1][1];
}

// update(y) is called from scroll.js's frame; listen() runs it standalone (reduced motion).
export function initAtmosphere() {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const targets = [document.body, ...document.querySelectorAll('.nav')];
  let max = 1, lastSky = '', lastY = 0;
  const update = y => {
    lastY = y;
    const c = skyAt(Math.min(1, Math.max(0, y / max)));
    const sky = `rgb(${c.join(' ')})`;
    if (sky === lastSky) return;
    lastSky = sky;
    targets.forEach(el => el.style.setProperty('--sky', sky));
    meta && meta.setAttribute('content', `rgb(${c.join(',')})`);
  };
  const measure = () => { max = Math.max(1, root.scrollHeight - innerHeight); update(lastY); };
  const listen = () => {
    let ticking = false;
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(scrollY); }); } }, { passive: true });
    update(scrollY);
  };
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();
  return { update, listen };
}

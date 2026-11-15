// Landing page entry. Each piece is independent; if one fails the rest still run.
import { initAtmosphere } from './modules/atmosphere.js';
import { initScrollFx } from './modules/scroll.js';
import { initContact } from './modules/contact.js';
import { initNav } from './modules/nav.js';

const safe = (name, fn) => { try { return fn(); } catch (err) { console.error(`[${name}]`, err); } };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Smooth wheel scrolling on desktop only; touch keeps its native scroll.
async function initSmoothScroll() {
  if (reduced || !finePointer) return;
  const { default: Lenis } = await import('./vendor/lenis.js');
  window.__lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: { offset: -64 }, autoRaf: true });
}

safe('contact', initContact);
safe('nav', initNav);
const atmo = safe('atmosphere', initAtmosphere);
const fx = safe('scrollfx', () => initScrollFx(atmo ? [atmo.update] : []));
if (atmo && !fx) atmo.listen();
initSmoothScroll().catch(err => console.error('[smooth-scroll]', err));

// Phone menu: the Menu button opens the section links; picking one (or Escape) closes it.
export function initNav() {
  const nav = document.querySelector('.nav'), btn = nav?.querySelector('.nav__toggle');
  if (!btn) return;
  const set = open => { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Close' : 'Menu'; };
  btn.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}

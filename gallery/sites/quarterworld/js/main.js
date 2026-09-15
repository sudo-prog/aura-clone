/* QUARTERWORLD — page choreography: staggered reveals for panels & photos */
(() => {
'use strict';

const items = Array.from(document.querySelectorAll('[data-reveal]'));

// stagger siblings within the same parent (marquee wall, photo wall, …)
const counts = new Map();
for (const el of items) {
  const parent = el.parentElement;
  const idx = counts.get(parent) || 0;
  el.style.setProperty('--d', Math.min(idx * 110, 550) + 'ms');
  counts.set(parent, idx + 1);
}

if (!('IntersectionObserver' in window)) {
  items.forEach(el => el.classList.add('in'));
  return;
}

const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
      // once the staggered reveal has landed, clear the delay so
      // hover micro-interactions (photo flatten, etc.) respond instantly
      setTimeout(() => { en.target.style.transitionDelay = '0ms'; }, 1500);
    }
  }
}, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

items.forEach(el => io.observe(el));

/* ---- nav scrollspy: the section you're standing in lights up phosphor ---- */

const links = Array.from(document.querySelectorAll('.topnav a'))
  .filter(a => (a.getAttribute('href') || '').startsWith('#'));
const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
const secs = Array.from(byId.keys()).map(id => document.getElementById(id)).filter(Boolean);

if (secs.length) {
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      for (const [id, a] of byId) {
        if (id === en.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  secs.forEach(s => spy.observe(s));
}
})();

/* page furniture — scroll reveals for the machined sections */
(() => {
'use strict';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = document.querySelectorAll('.rv');
if (REDUCED || !('IntersectionObserver' in window)) {
  items.forEach(n => n.classList.add('in'));
  return;
}
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, { threshold: .18, rootMargin: '0px 0px -40px 0px' });
items.forEach(n => io.observe(n));
})();

/* LIGNE AUSTRALE — page choreography: hero load sequence, UTC clock,
   scroll reveals. The globe lives in globe.js. */
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // hero load choreography
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  }));

  // company clock — temps universel, as the wireless room keeps it
  const clock = document.getElementById('clock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent =
        String(d.getUTCHours()).padStart(2, '0') + ':' +
        String(d.getUTCMinutes()).padStart(2, '0');
    };
    tick();
    setInterval(tick, 20000);
  }

  // scroll reveals
  const targets = document.querySelectorAll(
    '.sec-head, .ligne-intro, .ligne-outro, .timetable-block, .tarifs-block, ' +
    '.crew-card, .badge, .diary, .footer-grid'
  );
  targets.forEach(el => el.classList.add('rv'));
  if (REDUCED) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }
  let stagger = 0;
  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const delay = Math.min(stagger++ % 4, 3) * 90;
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('in');
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(el => io.observe(el));
})();

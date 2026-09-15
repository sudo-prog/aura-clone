/* ============================================================
   BLACKWATER FORGE — page choreography.
   Load stamp, scroll reveals (a tap, not a float), the heat
   timeline's staggered ignition, and the one-shot oil flash.
   ============================================================ */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // load choreography — the wordmark stamps in like hammer blows
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  }));

  // stagger indices for the five heats
  document.querySelectorAll('.heats .heat').forEach((li, i) => {
    li.style.setProperty('--i', i);
  });

  // scroll reveals (+ the five-heats rail, which pours in when the list ignites)
  const rv = document.querySelectorAll('.rv');
  const heatsOl = document.querySelector('.heats');
  if (reduced || !('IntersectionObserver' in window)) {
    rv.forEach((n) => n.classList.add('lit'));
    if (heatsOl) heatsOl.classList.add('lit');
    const f = document.querySelector('.flash');
    if (f) f.classList.remove('go');
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add('lit');
        io.unobserve(en.target);
        // the quench card flashes its oil, once, when it ignites
        if (en.target.classList.contains('heat-quench')) {
          const f = en.target.querySelector('.flash');
          if (f) f.classList.add('go');
        }
      }
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    rv.forEach((n) => io.observe(n));
    if (heatsOl) io.observe(heatsOl);
  }
})();

/* QUBIT — page orchestration: load choreography, scroll reveals, coherence counter. */
(() => {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- load choreography: reveal hero once fonts settle ---- */
  const hero = document.querySelector('.hero');
  const arm = () => requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('loaded')));
  if (document.fonts && document.fonts.ready) {
    let armed = false;
    const go = () => { if (!armed) { armed = true; arm(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 600); // never hold the page hostage
  } else {
    arm();
  }

  /* ---- honest verbs: touch devices tap, they do not click ---- */
  if (matchMedia('(hover: none)').matches) {
    const cue = document.querySelector('.hero-cue');
    if (cue) cue.innerHTML = cue.innerHTML.replace('Click any node', 'Tap any node');
  }

  /* ---- scroll reveals: one primitive, plays once ---- */
  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !REDUCED) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(n => io.observe(n));
  } else {
    revealables.forEach(n => n.classList.add('is-in'));
  }

  /* ---- coherence counter: elapsed T2 windows since the page opened ---- */
  const cohEl = document.getElementById('cohCount');
  if (cohEl) {
    const T2_MS = 1.312;                     // T2 = 1312 μs
    const t0 = performance.now();
    const thin = ' ';
    const fmt = n => {
      const s = Math.floor(n).toString();
      let out = '';
      for (let i = 0; i < s.length; i++) {
        if (i > 0 && (s.length - i) % 3 === 0) out += thin;
        out += s[i];
      }
      return out;
    };
    const update = () => { cohEl.textContent = fmt((performance.now() - t0) / T2_MS); };
    update();
    if (REDUCED) {
      setInterval(update, 1000);
    } else {
      let running = false, rafId = 0, inView = false;
      const loop = () => {
        if (!running) return;
        update();
        rafId = requestAnimationFrame(loop);
      };
      const setRunning = on => {
        if (on === running) return;
        running = on;
        if (on) rafId = requestAnimationFrame(loop);
        else cancelAnimationFrame(rafId);
      };
      const vis = () => setRunning(inView && !document.hidden);
      document.addEventListener('visibilitychange', vis);
      new IntersectionObserver(es => { inView = es[0].isIntersecting; vis(); }, { threshold: 0 })
        .observe(cohEl);
    }
  }
})();

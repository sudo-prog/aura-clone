/* TENTH FLOOR APIARY — main.js
   Orchestration: text reveals, top-bar state, scrollspy, join interaction. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // text + module reveals (one grammar for the whole page)
  const reveals = [...document.querySelectorAll('.reveal')];
  if (RM) {
    reveals.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.18, rootMargin: '0px 0px -4% 0px' });
    reveals.forEach(el => io.observe(el));
  }

  // stat hexes count up as the comb builds
  const stats = [...document.querySelectorAll('.stat strong[data-count]')];
  if (stats.length) {
    const ease = t => 1 - Math.pow(1 - t, 3);
    const runCount = el => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now();
      const dur = 1100;
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * ease(k)) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (RM) {
      stats.forEach(el => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
    } else {
      const statIo = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          statIo.disconnect();
          setTimeout(() => stats.forEach(runCount), 500);
        }
      }, { threshold: 0.35 });
      const cluster = document.querySelector('.coop-stats');
      if (cluster) statIo.observe(cluster);
    }
  }

  // top bar shadow
  const topbar = document.querySelector('.topbar');
  const onScroll = () => topbar.classList.toggle('is-stuck', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // scrollspy
  const links = [...document.querySelectorAll('.topnav a[href^="#"]')];
  const byId = Object.fromEntries(links.map(l => [l.getAttribute('href').slice(1), l]));
  const spy = new IntersectionObserver(entries => {
    for (const en of entries) {
      const link = byId[en.target.id];
      if (!link) continue;
      if (en.isIntersecting) {
        links.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    }
  }, { rootMargin: '-38% 0px -52% 0px' });
  ['coop', 'registry', 'harvest', 'dance', 'join'].forEach(id => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  // join micro-interaction
  const joinBtn = document.getElementById('joinBtn');
  const joinConfirm = document.getElementById('joinConfirm');
  if (joinBtn && joinConfirm) {
    joinBtn.setAttribute('aria-expanded', 'false');
    joinBtn.addEventListener('click', () => {
      const open = joinConfirm.hidden;
      joinConfirm.hidden = !open;
      joinBtn.setAttribute('aria-expanded', String(open));
      if (open) joinBtn.textContent = 'See you January 12';
    });
  }
})();

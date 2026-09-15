/* HANABI — page choreography: reveals, catalog firing, the finale. */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── scroll reveals ──────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  }

  // ── caliber selector ────────────────────────────────────
  let caliber = 8;
  const calBtns = [...document.querySelectorAll('.cal-btn')];
  function setCal(cal, focus) {
    caliber = cal;
    for (const b of calBtns) {
      const on = Number(b.dataset.cal) === cal;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
  }
  calBtns.forEach((b, i) => {
    b.addEventListener('click', () => setCal(Number(b.dataset.cal)));
    b.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % calBtns.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + calBtns.length) % calBtns.length;
      if (j >= 0) {
        e.preventDefault();
        setCal(Number(calBtns[j].dataset.cal), true);
      }
    });
  });
  setCal(8);

  // ── fire buttons + sky captions ─────────────────────────
  const capWrap = document.getElementById('captions');
  const srLive = document.getElementById('sr-live');
  const announce = text => { if (srLive) srLive.textContent = text; };
  const NAMES = {
    kiku: ['Kiku', '菊'], botan: ['Botan', '牡丹'],
    yanagi: ['Yanagi', '柳'], kamuro: ['Kamuro', '冠'],
  };
  function caption(type, cal, x, y) {
    if (!capWrap || !NAMES[type]) return;
    const el = document.createElement('p');
    el.className = 'shot-caption';
    el.innerHTML = `${cal}-sun ${NAMES[type][0]} <span lang="ja">${NAMES[type][1]}</span>`;
    el.style.left = Math.min(innerWidth * 0.86, Math.max(innerWidth * 0.14, x)) + 'px';
    el.style.top = Math.max(innerHeight * 0.09, y - 14) + 'px';
    capWrap.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }
  for (const btn of document.querySelectorAll('.fire-btn')) {
    const label = btn.textContent;
    const type = btn.dataset.type;
    btn.addEventListener('click', () => {
      // aria-disabled, not disabled: keyboard focus must survive the climb
      if (btn.getAttribute('aria-disabled') === 'true' || !window.PYRO) return;
      const cal = caliber; // capture at the moment of firing
      btn.setAttribute('aria-disabled', 'true');
      btn.textContent = 'climbing…';
      PYRO.fire(type, cal, (x, y) => {
        caption(type, cal, x, y);
        announce(`${cal}-sun ${NAMES[type][0]} bursts over the river.`);
        btn.textContent = label;
        btn.removeAttribute('aria-disabled');
      });
    });
  }

  // ── the finale ──────────────────────────────────────────
  const sentinel = document.getElementById('finale-sentinel');
  const encore = document.getElementById('encore');
  let finaleFired = false;

  // the crowd's shout — the manifesto promised it
  function tamaya() {
    if (!capWrap) return;
    const el = document.createElement('p');
    el.className = 'shot-caption tamaya';
    el.innerHTML = '<span lang="ja">玉屋ーー！</span>Tamaya!';
    el.style.left = '50%';
    el.style.top = Math.round(innerHeight * 0.4) + 'px';
    capWrap.appendChild(el);
    setTimeout(() => el.remove(), 4600);
  }

  function runFinale() {
    if (!window.PYRO || PYRO.finaleActive) return;
    if (encore.getAttribute('aria-disabled') === 'true') return;
    encore.setAttribute('aria-disabled', 'true');
    announce('The finale barrage begins — the sky over the river fills.');
    if (!PYRO.reduced) document.body.classList.add('finale-dim');
    PYRO.finale(() => {
      // the last crown fades, the crowd shouts into the dark —
      // then the page comes back and offers an encore
      tamaya();
      announce('Tamaya! The finale has ended.');
      setTimeout(() => {
        document.body.classList.remove('finale-dim');
        encore.hidden = false;
        encore.removeAttribute('aria-disabled');
      }, PYRO.reduced ? 0 : 2600);
    });
  }

  if (sentinel && 'IntersectionObserver' in window) {
    // arm slightly before the reader arrives, so the first volley is already
    // climbing when "look up" comes into view
    const fio = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting && !finaleFired) {
          finaleFired = true;
          fio.disconnect();
          runFinale();
        }
      }
    }, { threshold: 0, rootMargin: '0px 0px 18% 0px' });
    fio.observe(sentinel);
  }
  if (encore) encore.addEventListener('click', runFinale);
})();

/* BÉTON BRUT — scroll engine: cyanotype elevations draw themselves, then cure
   into cast concrete. Scroll-driven (rAF scheduled on scroll only — nothing
   runs while the tab is hidden or the user is idle). */
(() => {
  'use strict';
  const docEl = document.documentElement;
  docEl.classList.add('js');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* live viewport dimension in the hero measuring line */
  const dimEl = document.querySelector('[data-vw]');
  const setDim = () => { if (dimEl) dimEl.textContent = Math.round(innerWidth) + ' PX'; };
  setDim();
  addEventListener('resize', setDim, { passive: true });

  /* formwork-strip heading reveals */
  const veils = [...document.querySelectorAll('.reveal')];
  if (!reduce.matches && 'IntersectionObserver' in window) {
    veils.forEach(v => v.classList.add('veiled'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    veils.forEach(v => io.observe(v));
  }

  if (reduce.matches) { docEl.classList.add('static'); return; }

  const clamp = t => t < 0 ? 0 : t > 1 ? 1 : t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };

  /* per-order draw windows inside the tracing phase (0 → 1 of tracing) */
  const WIN = {
    0: [0.00, 0.18], /* ground, sea            */
    1: [0.08, 0.44], /* primary silhouette     */
    2: [0.36, 0.62], /* openings, secondary    */
    3: [0.54, 0.82], /* hatching, board lines  */
    4: [0.70, 0.97], /* dims, north, title     */
    5: [0.84, 1.00]  /* labels, dashed axes    */
  };
  const TRACE_END = 0.55, CURE_START = 0.60, CURE_END = 0.92;

  const projects = [...document.querySelectorAll('[data-project]')].map(sec => {
    const track = sec.querySelector('.track');
    const stage = sec.querySelector('.stage');
    const bp = sec.querySelector('.bp');
    const ff = sec.querySelector('.ff');
    const cast = sec.querySelector('.cast');
    const shadow = cast.querySelector('.cs');
    const pourRect = sec.querySelector('.pour-rect');
    const pourLvl = cast.querySelector('.pour-lvl');
    const hudPhase = sec.querySelector('.hud-phase');
    const hudNiv = sec.querySelector('.hud-niv');
    const hudPct = sec.querySelector('.hud-pct');
    const hudBar = sec.querySelector('.hud-bar i');
    const summit = parseFloat(sec.dataset.h) || 0;

    /* bucket elements by draw order, then window each within its bucket */
    const buckets = {};
    bp.querySelectorAll('[data-o]').forEach(el => {
      const o = el.dataset.o;
      (buckets[o] = buckets[o] || []).push(el);
    });
    const draws = [], fades = [];
    Object.keys(buckets).forEach(o => {
      const group = buckets[o];
      const [b0, b1] = WIN[o] || [0.8, 1];
      const span = b1 - b0, dur = span * 0.5;
      group.forEach((el, i) => {
        const s = b0 + (span - dur) * (group.length > 1 ? i / (group.length - 1) : 0);
        const item = { el, s, e: s + dur };
        if (typeof el.getTotalLength === 'function' && el instanceof SVGGeometryElement) {
          item.len = el.getTotalLength() + 2;
          el.style.strokeDasharray = item.len;
          el.style.strokeDashoffset = item.len;
          draws.push(item);
        } else {
          el.style.opacity = 0;
          fades.push(item);
        }
      });
    });

    return { sec, track, stage, bp, ff, cast, shadow, pourRect, pourLvl, hudPhase,
             hudNiv, hudPct, hudBar, summit, draws, fades,
             top: 0, span: 1, inView: true, lastPhase: '' };
  });

  if (!projects.length) return;

  const measure = () => {
    const vh = innerHeight;
    projects.forEach(p => {
      const r = p.track.getBoundingClientRect();
      p.top = r.top + scrollY;
      p.span = Math.max(1, p.track.offsetHeight - vh);
    });
  };

  const pct = v => String(Math.round(clamp(v) * 100)).padStart(3, '0') + '%';

  const render = () => {
    const y = scrollY;
    projects.forEach(p => {
      if (!p.inView) return;
      const prog = clamp((y - p.top) / p.span);

      /* tracing */
      const q = clamp(prog / TRACE_END);
      p.draws.forEach(d => {
        const t = smooth((q - d.s) / (d.e - d.s));
        d.el.style.strokeDashoffset = (d.len * (1 - t)).toFixed(1);
      });
      p.fades.forEach(f => {
        f.el.style.opacity = smooth((q - f.s) / (f.e - f.s)).toFixed(2);
      });

      /* serrage: the wooden negative erects inside the traced silhouette */
      if (p.ff) p.ff.setAttribute('opacity', smooth((prog - 0.52) / 0.08).toFixed(3));

      /* curing: the mass pours bottom-up inside the formwork, wet → cured */
      const cc = smooth((prog - CURE_START) / (CURE_END - CURE_START));
      p.bp.style.opacity = (1 - 0.93 * cc).toFixed(3);
      p.cast.style.opacity = Math.min(1, cc * 4).toFixed(3);
      p.cast.style.filter = 'brightness(' + (0.66 + 0.34 * cc).toFixed(3) + ')';
      const lvlY = -40 + 720 * (1 - cc);
      if (p.pourRect) p.pourRect.setAttribute('y', lvlY.toFixed(1));
      if (p.pourLvl) { /* wet laitance edge riding the pour level */
        const visible = cc > 0.02 && cc < 0.985 && lvlY < 540;
        p.pourLvl.setAttribute('opacity', visible ? (4 * cc * (1 - cc) * 0.8).toFixed(2) : '0');
        if (visible) {
          const yy = Math.max(72, Math.min(540, lvlY)).toFixed(1);
          p.pourLvl.setAttribute('y1', yy);
          p.pourLvl.setAttribute('y2', yy);
        }
      }
      if (p.shadow) p.shadow.style.transform = 'scaleX(' + (0.25 + 0.75 * cc).toFixed(3) + ')';
      if (p.hudNiv && p.summit) {
        const lvl = (p.summit * cc).toFixed(2);
        p.hudNiv.textContent = '▽ NIVEAU +' + (lvl.length < 5 ? '0' + lvl : lvl) + ' M';
      }

      /* HUD */
      let phase, shown;
      if (prog < 0.02) { phase = 'MISE EN PLAN'; shown = 0; }
      else if (prog < TRACE_END) { phase = 'TRAÇAGE — ÉLÉVATION'; shown = q; }
      else if (prog < CURE_START) { phase = 'COFFRAGE — SERRAGE DES BANCHES'; shown = 1; }
      else if (prog < CURE_END) { phase = 'COULAGE → PRISE'; shown = (prog - CURE_START) / (CURE_END - CURE_START); }
      else { phase = 'DÉCOFFRAGE — OUVRAGE NU'; shown = 1; }
      if (phase !== p.lastPhase) {
        p.hudPhase.textContent = phase;
        p.stage.classList.toggle('curing', prog >= CURE_START);
        /* décoffrage: the drawing's ink lifts — annotations strip with the boards,
           only faint construction lines stay in the wall */
        p.stage.classList.toggle('stripped', prog >= CURE_END);
        p.lastPhase = phase;
      }
      p.hudPct.textContent = pct(shown);
      p.hudBar.style.width = (clamp(prog) * 100).toFixed(1) + '%';
    });
  };

  /* only animate stages near the viewport */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const p = projects.find(x => x.track === e.target);
        if (p) { p.inView = e.isIntersecting; if (e.isIntersecting) render(); }
      });
    }, { rootMargin: '25% 0px 25% 0px' });
    projects.forEach(p => io.observe(p.track));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; render(); });
  };
  addEventListener('scroll', onScroll, { passive: true });

  const remeasure = () => { measure(); render(); };
  addEventListener('resize', remeasure, { passive: true });
  addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  measure();
  projects.forEach(p => { p.inView = true; });
  render();
})();

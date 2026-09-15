/* ARCANUM — the self-inscribing sigil engine, candlelight, and small rites */
(() => {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutQuad = t => 1 - (1 - t) * (1 - t);

  /* ---------------------------------------------------------------
     Inscriber — draws every [data-ink] stroke of an SVG in sequence,
     fades [data-fade] elements at their slot (or at data-at fraction),
     and optionally walks a wet-ink nib along the live stroke.
     --------------------------------------------------------------- */
  class Inscriber {
    constructor(svg, opts = {}) {
      this.svg = svg;
      this.overlap = opts.overlap ?? 0.4;
      this.msPerPx = opts.msPerPx ?? 0.9;
      this.minD = opts.min ?? 150;
      this.maxD = opts.max ?? 900;
      this.totalWanted = opts.total ?? null;
      this.playing = false;
      this.raf = 0;

      this.items = [...svg.querySelectorAll('[data-ink],[data-fade],[data-write]')].map(el => {
        if (el.hasAttribute('data-ink')) {
          const L = el.getTotalLength();
          return { el, type: 'ink', L };
        }
        if (el.hasAttribute('data-write')) {
          return { el, type: 'write', spans: Inscriber.splitLetters(el) };
        }
        return { el, type: 'fade', at: el.dataset.at ? parseFloat(el.dataset.at) : null };
      });

      this.nib = null;
      if (opts.nib) this.makeNib(opts.nibParent || svg);

      this.build();
      if (RM) this.finish();
      else this.reset();
      svg.style.opacity = '1';
    }

    /* wrap every glyph of a [data-write] text in its own tspan so the
       inscription can be written out letter by letter (spaces ride with
       the preceding glyph so SVG whitespace collapsing cannot eat them) */
    static splitLetters(el) {
      const host = el.querySelector('textPath') || el;
      const NS = 'http://www.w3.org/2000/svg';
      const chars = [...host.textContent];
      host.textContent = '';
      const spans = [];
      for (const ch of chars) {
        if (ch === ' ' && spans.length) { spans[spans.length - 1].textContent += ' '; continue; }
        const ts = document.createElementNS(NS, 'tspan');
        ts.textContent = ch;
        host.appendChild(ts);
        spans.push(ts);
      }
      return spans;
    }

    makeNib(parent) {
      const NS = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'nib');
      g.style.opacity = '0';
      const halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('r', '6.5');
      halo.setAttribute('fill', 'rgba(29,23,16,.18)');
      const core = document.createElementNS(NS, 'circle');
      core.setAttribute('r', '3');
      core.setAttribute('fill', '#1D1710');
      g.append(halo, core);
      parent.appendChild(g);
      this.nib = g;
    }

    build() {
      let t = 0;
      this.timeline = this.items.map(it => {
        const dur = it.type === 'ink'
          ? Math.max(this.minD, Math.min(this.maxD, it.L * this.msPerPx))
          : it.type === 'write' ? it.spans.length * 26
          : 320;
        const item = { ...it, start: t, dur };
        if (!(it.type === 'fade' && it.at != null)) t += dur * (1 - this.overlap);
        return item;
      });
      this.total = t + 380;
      if (this.totalWanted) {
        const k = this.totalWanted / this.total;
        this.timeline.forEach(i => { i.start *= k; i.dur *= k; });
        this.total = this.totalWanted;
      }
      // pinned fades (data-at) land at a fraction of the final timeline
      this.timeline.forEach(i => {
        if (i.type === 'fade' && i.at != null) {
          i.start = i.at * this.total;
          i.dur = Math.max(180, Math.min(520, this.total - i.start));
        }
      });
    }

    reset() {
      for (const it of this.timeline) {
        if (it.type === 'ink') {
          it.el.style.strokeDasharray = `${it.L} ${it.L + 2}`;
          it.el.style.strokeDashoffset = String(it.L);
        } else if (it.type === 'write') {
          for (const ts of it.spans) ts.style.opacity = '0';
        } else {
          it.el.style.opacity = '0';
        }
      }
      if (this.nib) this.nib.style.opacity = '0';
    }

    finish() {
      for (const it of this.timeline) {
        if (it.type === 'ink') it.el.style.strokeDashoffset = '0';
        else if (it.type === 'write') { for (const ts of it.spans) ts.style.opacity = '1'; }
        else it.el.style.opacity = '1';
      }
      if (this.nib) this.nib.style.opacity = '0';
      this.playing = false;
    }

    play(done) {
      if (this.playing) return;
      if (RM) { this.finish(); done && done(); return; }
      this.reset();
      this.playing = true;
      let elapsed = 0;
      let last = performance.now();

      const tick = now => {
        elapsed += Math.min(now - last, 48);
        last = now;

        for (const it of this.timeline) {
          const p = (elapsed - it.start) / it.dur;
          if (p <= 0) continue;
          const q = Math.min(1, p);
          if (it.type === 'ink') {
            it.el.style.strokeDashoffset = String(it.L * (1 - easeInOutCubic(q)));
          } else if (it.type === 'write') {
            /* a steady scribe: letters land at an even pace around the ring */
            const k = q * it.spans.length;
            const full = Math.floor(k);
            for (let i = 0; i < it.spans.length; i++) {
              it.spans[i].style.opacity = i < full ? '1' : i === full ? String(k - full) : '0';
            }
          } else {
            it.el.style.opacity = String(easeOutQuad(q));
          }
        }

        if (this.nib) {
          let act = null;
          for (let i = this.timeline.length - 1; i >= 0; i--) {
            const it = this.timeline[i];
            if (it.type === 'ink' && elapsed > it.start && elapsed < it.start + it.dur) { act = it; break; }
          }
          if (act) {
            const e = easeInOutCubic((elapsed - act.start) / act.dur);
            const pt = act.el.getPointAtLength(e * act.L);
            const parentM = this.nib.parentNode.getScreenCTM();
            const elM = act.el.getScreenCTM();
            if (parentM && elM) {
              const p2 = new DOMPoint(pt.x, pt.y).matrixTransform(parentM.inverse().multiply(elM));
              this.nib.setAttribute('transform', `translate(${p2.x} ${p2.y})`);
              this.nib.style.opacity = '1';
            }
          } else {
            this.nib.style.opacity = '0';
          }
        }

        if (elapsed < this.total) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.finish();
          done && done();
        }
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  /* --------------------------- setup --------------------------- */
  const onReady = fn => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  onReady(() => {
    if (RM) document.querySelectorAll('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());

    /* --- the Great Seal --- */
    const sealSvg = document.getElementById('great-seal');
    let seal = null;
    if (sealSvg) {
      seal = new Inscriber(sealSvg, {
        total: parseFloat(sealSvg.dataset.total) || 2550,
        overlap: 0.45,
        msPerPx: 0.9,
        min: 150,
        max: 900,
        nib: !!sealSvg.dataset.nib,
        nibParent: document.getElementById('seal-art'),
      });
      const sealed = () => {
        document.dispatchEvent(new CustomEvent('arcanum:sealed'));
        if (!RM) { /* the stamp is pressed: one small settle */
          sealSvg.classList.remove('sealed');
          void sealSvg.getBoundingClientRect();
          sealSvg.classList.add('sealed');
        }
      };
      if (!RM) setTimeout(() => seal.play(sealed), 260);
      const replay = document.querySelector('.reinscribe');
      if (replay) replay.addEventListener('click', () => seal.play(sealed));
    }

    /* --- lesser sigils: dividers, drop caps, stamps --- */
    const lesser = [...document.querySelectorAll('svg.sig')].filter(s => s !== sealSvg);
    for (const svg of lesser) {
      const isStamp = svg.classList.contains('stamp');
      svg._insc = new Inscriber(svg, {
        total: isStamp ? 700 : 820,
        overlap: 0.35,
      });
    }

    if (RM || !('IntersectionObserver' in window)) {
      lesser.forEach(s => s._insc.finish());
    }
    if (!RM && 'IntersectionObserver' in window) {
      const sigWatch = new IntersectionObserver(entries => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target._insc && en.target._insc.play();
            sigWatch.unobserve(en.target);
          }
        }
      }, { threshold: 0.35 });
      lesser.forEach(s => sigWatch.observe(s));

      /* stamps re-inscribe on hover — the shop stamps the label for you */
      document.querySelectorAll('.label').forEach(card => {
        const stamp = card.querySelector('svg.stamp');
        if (!stamp || !stamp._insc) return;
        card.addEventListener('pointerenter', () => stamp._insc.play());
      });

      /* divider sigils redraw themselves when the cursor crosses them */
      document.querySelectorAll('.divider').forEach(d => {
        const sig = d.querySelector('svg.sig');
        if (sig && sig._insc) d.addEventListener('pointerenter', () => sig._insc.play());
      });
    }

    /* --- reveals --- */
    const reveals = [...document.querySelectorAll('.reveal')];
    if (RM || !('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('lit'));
    } else {
      const revWatch = new IntersectionObserver(entries => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('lit');
            revWatch.unobserve(en.target);
          }
        }
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(el => revWatch.observe(el));
    }

    /* --- candlelight: a slow random walk with the occasional gutter --- */
    const candle = document.querySelector('.candle');
    if (candle && !RM) {
      let cur = 0.92, target = 0.92, nextShift = 0, gutterUntil = 0, raf = 0;
      const loop = now => {
        if (now > nextShift) {
          target = 0.8 + Math.random() * 0.2;
          nextShift = now + 100 + Math.random() * 220;
          if (Math.random() < 0.014) gutterUntil = now + 300;
        }
        cur += (target - cur) * (now < gutterUntil ? 0.45 : 0.05);
        candle.style.opacity = cur.toFixed(3);
        raf = requestAnimationFrame(loop);
      };
      const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
      const stop = () => { cancelAnimationFrame(raf); raf = 0; };
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
      /* when the great seal finishes inscribing, the candle gutters once */
      document.addEventListener('arcanum:sealed', () => {
        const now = performance.now();
        target = 0.72;
        nextShift = now + 420;
        gutterUntil = now + 420;
      });
      start();
    }

    /* --- the letter & the wax seal --- */
    const letter = document.querySelector('.letter');
    if (letter) {
      const status = letter.querySelector('.letter-status');
      letter.addEventListener('submit', ev => {
        ev.preventDefault();
        const name = letter.querySelector('#f-name').value.trim();
        const matter = letter.querySelector('#f-matter').value.trim();
        if (!name || !matter) {
          status.textContent = 'The post declines an empty letter. State your name and your matter.';
          return;
        }
        if (letter.classList.contains('stamped')) {
          status.textContent = 'Already sealed. The post leaves at dusk; patience.';
          return;
        }
        letter.classList.add('stamped');
        status.textContent = 'Sealed. The evening post leaves at dusk.';
      });
    }
  });
})();

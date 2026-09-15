/* LEGERDEMAIN — deck engine: per-card 3D pose system with staged timing */
import { frontSVG, backSVG } from './cards.js';

export const EASE = {
  deal: 'cubic-bezier(.34,.04,.14,1)',
  soft: 'cubic-bezier(.45,.05,.18,1)',
  lift: 'cubic-bezier(.3,.02,.18,1.06)',
  tossIn: 'cubic-bezier(.42,.06,.86,.55)',
  tossOut: 'cubic-bezier(.12,.5,.22,1)',
}; /* no linear, no default ease — house rules */

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
export const wait = (ms) =>
  new Promise((r) => setTimeout(r, REDUCED.matches ? Math.min(ms, 30) : ms));

const jitter = (i, amp) => Math.sin(i * 127.31) * amp;

export class Deck {
  /** stage: element with transform-style preserve-3d; specs: [{rank,suit}] */
  constructor(stage, specs) {
    this.stage = stage;
    this.cards = specs.map((spec, i) => {
      const el = document.createElement('div');
      el.className = 'pcard';
      el.innerHTML = `<div class="pcard-in"><div class="pf pf-front">${frontSVG(spec)}</div><div class="pf pf-back">${backSVG()}</div></div>`;
      stage.appendChild(el);
      return { spec, el, inner: el.firstElementChild, i, pose: null };
    });
  }

  destroy() {
    for (const c of this.cards) c.el.remove();
    this.cards = [];
  }

  /** pose: {x,y,z,rx,ry,rz,s,faceUp} — px / deg */
  set(c, pose, { dur = 700, delay = 0, ease = EASE.soft, flipDur } = {}) {
    const p = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, ...pose };
    const reduced = REDUCED.matches;
    const st = c.el.style;
    st.transitionProperty = 'transform';
    st.transitionDuration = (reduced ? 0 : dur) + 'ms';
    st.transitionDelay = (reduced ? 0 : delay) + 'ms';
    st.transitionTimingFunction = ease;
    st.transform =
      `translate3d(${p.x}px,${p.y}px,${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`;
    if (pose.faceUp !== undefined) {
      const si = c.inner.style;
      si.transitionProperty = 'transform';
      si.transitionDuration = (reduced ? 0 : (flipDur ?? Math.max(dur * 0.8, 360))) + 'ms';
      si.transitionDelay = (reduced ? 0 : delay) + 'ms';
      si.transitionTimingFunction = EASE.soft;
      si.transform = pose.faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)';
    }
    c.pose = p;
  }

  /** fn(i, n) -> pose; opts.stagger ms per card */
  formation(fn, { dur = 700, stagger = 0, ease = EASE.soft, order } = {}) {
    const n = this.cards.length;
    const seq = order || this.cards.map((_, i) => i);
    seq.forEach((ci, k) => {
      this.set(this.cards[ci], fn(ci, n, k), { dur, delay: k * stagger, ease });
    });
    return wait(dur + stagger * (n - 1));
  }
}

/* ————— shared formations ————— */

export const stackPose = (i, n, { y = 0, faceUp = false } = {}) => ({
  x: jitter(i, 1.6),
  y: y + jitter(i + 40, 1.2),
  z: (n - i) * 0.55,
  rz: jitter(i + 9, 1.4),
  faceUp,
});

export const fanPose = (i, n, { spread = 118, radius = 330, lift = 0 } = {}) => {
  const t = n === 1 ? 0.5 : i / (n - 1);
  const a = (-spread / 2 + t * spread) * (Math.PI / 180);
  return {
    x: Math.sin(a) * radius,
    y: radius - Math.cos(a) * radius - lift,
    z: i * 0.7,
    rz: a * (180 / Math.PI),
    faceUp: true,
  };
};

export const ribbonPose = (i, n, { width = 640, y = 0, faceUp = true } = {}) => {
  const t = n === 1 ? 0.5 : i / (n - 1);
  return {
    x: -width / 2 + t * width,
    y: y + Math.sin(t * Math.PI) * -8,
    z: i * 0.6,
    rz: -3 + t * 6,
    faceUp,
  };
};

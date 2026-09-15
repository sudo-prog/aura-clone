// AFTER HOURS — the turntable. 33⅓ RPM exactly (200°/s), correct label
// rotation, and the needle drop: swing → drop → settle → track inward.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVG_NS = 'http://www.w3.org/2000/svg';

const CX = 290, CY = 330;      // record center
const PX = 575, PY = 120;      // tonearm pivot

// Arm geometry (derived from pivot/stylus math in DESIGN.md):
const REST = -14;              // parked on the armrest
const LEADIN = 17.2;           // lead-in groove
const SET_ANGLES = [19.5, 29, 37]; // 9:00 outer · 10:30 mid · midnight inner

const disc = document.getElementById('disc');
const arm = document.getElementById('arm');
const armShadow = document.getElementById('armShadow');
const lamp = document.getElementById('onLamp');

// ---- build grooves + strobe dots ----
(() => {
  const grooves = document.getElementById('grooves');
  let seed = 33;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 82; r <= 221; r += 1.9) {
    const band = Math.abs(r - 178) < 2.5 || Math.abs(r - 130) < 2.5;
    const lead = r >= 216;
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', CX);
    c.setAttribute('cy', CY);
    c.setAttribute('r', r.toFixed(1));
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', `rgba(233,220,192,${(band || lead ? 0.1 : 0.016 + rnd() * 0.05).toFixed(3)})`);
    c.setAttribute('stroke-width', band || lead ? '1.1' : '0.7');
    grooves.appendChild(c);
  }
  const strobe = document.getElementById('strobe');
  for (let k = 0; k < 90; k++) {
    const a = (k / 90) * Math.PI * 2;
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', (CX + Math.cos(a) * 235).toFixed(1));
    dot.setAttribute('cy', (CY + Math.sin(a) * 235).toFixed(1));
    dot.setAttribute('r', '1.4');
    dot.setAttribute('fill', 'rgba(201,160,90,0.5)');
    strobe.appendChild(dot);
  }
})();

// ---- stylus groove glow: the lit groove under the needle (non-rotating) ----
// Stylus tip in base (unrotated) arm coordinates; it orbits the pivot.
const TIPX0 = 558, TIPY0 = 464;
const STYL_R = Math.hypot(TIPX0 - PX, TIPY0 - PY);
const STYL_A = Math.atan2(TIPY0 - PY, TIPX0 - PX);

const glowG = document.createElementNS(SVG_NS, 'g');
glowG.setAttribute('opacity', '0');
const mkC = (attrs) => {
  const c = document.createElementNS(SVG_NS, 'circle');
  for (const k in attrs) c.setAttribute(k, attrs[k]);
  glowG.appendChild(c);
  return c;
};
const glowSoft = mkC({ cx: CX, cy: CY, r: 200, fill: 'none', stroke: 'rgba(235,203,139,0.5)', 'stroke-width': '2', filter: 'url(#softBlur)' });
const glowCrisp = mkC({ cx: CX, cy: CY, r: 200, fill: 'none', stroke: 'rgba(246,227,180,0.3)', 'stroke-width': '0.7' });
const tipHalo = mkC({ r: 4.5, fill: 'rgba(246,227,180,0.4)', filter: 'url(#softBlur)' });
const tipDot = mkC({ r: 2, fill: '#F6E3B4' });
arm.parentNode.insertBefore(glowG, arm);

// ---- state ----
let discAngle = 0;
let vel = 0;                        // deg/s
const VEL_TARGET = 200;             // 33⅓ RPM = 200°/s — the correct speed
let armAngle = REST;
let lift = 1;                       // 1 = raised, 0 = stylus in the groove
let needleDown = false;
let trackIndex = 0;
let phase = 'rest';                 // rest | swing | drop | play | liftoff | return
let phaseT = 0;
let wobbleT = -1;
let lastNow = performance.now();
let visible = true;
let running = false;
let rafId = 0;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function applyTransforms() {
  disc.setAttribute('transform', `rotate(${discAngle.toFixed(2)} ${CX} ${CY})`);
  let a = armAngle;
  if (wobbleT >= 0 && wobbleT < 1) {
    a += 0.7 * Math.sin(wobbleT * 22) * Math.exp(-wobbleT * 5.5);
  }
  const ty = -8 * lift, tx = 2.5 * lift;
  arm.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${a.toFixed(2)} ${PX} ${PY})`);
  armShadow.setAttribute('transform', `translate(${(4 + 10 * lift).toFixed(1)},${(6 + 13 * lift).toFixed(1)})`);
  armShadow.setAttribute('opacity', (0.42 - 0.22 * lift).toFixed(2));

  // lit groove: where the stylus sits, the wax catches the light
  const th = STYL_A + (a * Math.PI) / 180;
  const tipX = PX + tx + STYL_R * Math.cos(th);
  const tipY = PY + ty + STYL_R * Math.sin(th);
  const gr = Math.hypot(tipX - CX, tipY - CY);
  glowSoft.setAttribute('r', gr.toFixed(1));
  glowCrisp.setAttribute('r', gr.toFixed(1));
  tipHalo.setAttribute('cx', tipX.toFixed(1));
  tipHalo.setAttribute('cy', tipY.toFixed(1));
  tipDot.setAttribute('cx', tipX.toFixed(1));
  tipDot.setAttribute('cy', tipY.toFixed(1));
  glowG.setAttribute('opacity', ((1 - lift) * 0.9).toFixed(2));
}

let swingFrom = REST, swingTo = LEADIN, swingDur = 1.1;

function setPhase(p) {
  phase = p;
  phaseT = 0;
}

function step(dt) {
  // motor: spin-up to exactly 33⅓
  if (!REDUCED) {
    vel += (VEL_TARGET - vel) * Math.min(1, dt * 1.1);
    if (VEL_TARGET - vel < 0.5) vel = VEL_TARGET;
    discAngle = (discAngle + vel * dt) % 360;
  }

  phaseT += dt;
  if (wobbleT >= 0) wobbleT += dt;

  switch (phase) {
    case 'swing': {
      const t = Math.min(1, phaseT / swingDur);
      armAngle = swingFrom + (swingTo - swingFrom) * easeInOutCubic(t);
      if (t >= 1) setPhase('drop');
      break;
    }
    case 'drop': {
      const t = Math.min(1, phaseT / 0.38);
      lift = 1 - easeOutCubic(t);
      if (t >= 1) {
        lift = 0;
        wobbleT = 0;
        vel = VEL_TARGET * 0.94; // the stylus drags the motor for a beat
        setPhase('play');
        dispatchEvent(new CustomEvent('needlelanded'));
      }
      break;
    }
    case 'play': {
      // creep toward the groove of whichever set the reader is beside
      const target = SET_ANGLES[trackIndex];
      const d = target - armAngle;
      const rate = 2.2; // deg/s — audible-tracking slow
      if (Math.abs(d) > 0.02) {
        armAngle += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
      }
      break;
    }
    case 'liftoff': {
      const t = Math.min(1, phaseT / 0.3);
      lift = easeOutCubic(t);
      if (t >= 1) {
        lift = 1;
        swingFrom = armAngle;
        swingTo = REST;
        swingDur = 0.9;
        setPhase('return');
      }
      break;
    }
    case 'return': {
      const t = Math.min(1, phaseT / swingDur);
      armAngle = swingFrom + (swingTo - swingFrom) * easeInOutCubic(t);
      if (t >= 1) setPhase('rest');
      break;
    }
  }

  applyTransforms();
}

function frame(now) {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  if (visible) step(dt);
}

function start() {
  if (running) return;
  running = true;
  lastNow = performance.now();
  rafId = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

// ---- events from main.js ----
addEventListener('needle', (e) => {
  const down = e.detail.down;
  if (down === needleDown) return;
  needleDown = down;
  if (REDUCED) {
    // no theatrics: place the arm where it belongs, instantly
    lift = down ? 0 : 1;
    armAngle = down ? SET_ANGLES[trackIndex] : REST;
    setPhase(down ? 'play' : 'rest');
    if (down) dispatchEvent(new CustomEvent('needlelanded'));
    else dispatchEvent(new CustomEvent('needlelifted'));
    applyTransforms();
    return;
  }
  if (down) {
    swingFrom = armAngle;
    swingTo = LEADIN;
    swingDur = Math.max(0.2, 1.1 * Math.abs(LEADIN - armAngle) / (LEADIN - REST));
    wobbleT = -1;
    setPhase('swing');
  } else {
    dispatchEvent(new CustomEvent('needlelifted'));
    setPhase('liftoff');
  }
});

addEventListener('track', (e) => {
  trackIndex = e.detail.i;
  if (REDUCED && phase === 'play') {
    armAngle = SET_ANGLES[trackIndex];
    applyTransforms();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else if (!REDUCED && visible) start();
});

// fully park the rAF loop when the deck is offscreen (mobile, scrolled past)
new IntersectionObserver((entries) => {
  visible = entries[0].isIntersecting;
  if (!visible) stop();
  else if (!REDUCED && !document.hidden) start();
}, { threshold: 0 }).observe(document.getElementById('tt'));

// ---- boot ----
applyTransforms();
if (!REDUCED) {
  start();
  setTimeout(() => lamp.classList.add('lit'), 900);
} else {
  vel = 0;
  discAngle = 14; // parked with a little character
  lamp.classList.add('lit');
  applyTransforms();
}

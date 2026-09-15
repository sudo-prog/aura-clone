// AFTER HOURS — conductor: load sequence, reveals, needle trigger,
// set tracking, status line, mobile chip.

import './room.js';
import './turntable.js';
import './audio.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- load sequence ----
const arm = () => document.documentElement.classList.add('loaded');
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(arm);
  setTimeout(arm, 900); // belt and braces
} else {
  setTimeout(arm, 300);
}

// ---- reveals ----
const revealables = document.querySelectorAll('.reveal, .deco-head, .deco-sub');
if (REDUCED) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  revealables.forEach((el) => io.observe(el));

  // stagger the house rules
  document.querySelectorAll('.rules li').forEach((li, i) => {
    li.style.transitionDelay = `${i * 70}ms`;
    li.style.transition = 'opacity .7s var(--ease), transform .7s var(--ease)';
    li.style.opacity = '0';
    li.style.transform = 'translateY(10px)';
  });
  const rulesIO = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('.rules li').forEach((li) => {
        li.style.opacity = '1';
        li.style.transform = 'none';
      });
      rulesIO.disconnect();
    }
  }, { threshold: 0.2 });
  rulesIO.observe(document.querySelector('.rules'));
}

// ---- needle trigger + set tracking ----
const sets = document.getElementById('sets');
const cards = [...document.querySelectorAll('.set-card')];
const status = document.getElementById('ttStatus');
const chip = document.getElementById('chip');
const chipText = document.getElementById('chipText');
const stage = document.querySelector('.stage');

const NAMES = ['The Ruby Calloway Trio', 'The Vine Street Five', 'The Midnight Jam'];
let needleDown = false;
let track = -1;
let ticking = false;

function setStatus(down, i) {
  if (down) {
    status.textContent = `Now spinning · ${NAMES[i]} · 33⅓`;
    status.classList.add('live');
    chipText.textContent = `Now spinning — ${NAMES[i]}`;
  } else {
    status.textContent = 'Tonearm at rest — scroll to cue Side B';
    status.classList.remove('live');
  }
}

function update() {
  ticking = false;
  const vh = innerHeight;
  const setsTop = sets.getBoundingClientRect().top;
  const down = setsTop < vh * 0.78;

  if (down !== needleDown) {
    needleDown = down;
    dispatchEvent(new CustomEvent('needle', { detail: { down } }));
    if (!down) {
      setStatus(false, 0);
      cards.forEach((c) => c.classList.remove('on-air'));
      track = -1;
    }
  }

  if (down) {
    // which set is the reader beside?
    let best = 0, bestD = Infinity;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - vh * 0.42);
      // once past the last card, the jam keeps the stand
      if (r.top < vh && d < bestD) { bestD = d; best = i; }
      if (r.bottom < 0) { best = Math.max(best, i); }
    });
    if (best !== track) {
      track = best;
      dispatchEvent(new CustomEvent('track', { detail: { i: track } }));
      setStatus(true, track);
      cards.forEach((c, i) => c.classList.toggle('on-air', i === track));
    }
  }

  // mobile chip: needle is down but the deck is out of sight
  const stageGone = stage.getBoundingClientRect().bottom < 40;
  chip.classList.toggle('show', down && stageGone);
}

// tap the chip: back to the deck to watch the needle work
chip.addEventListener('click', () => {
  document.getElementById('tt').scrollIntoView({
    behavior: REDUCED ? 'auto' : 'smooth',
    block: 'center',
  });
});

addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}, { passive: true });

addEventListener('resize', update);
update();

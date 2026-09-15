import { initHeroStrings } from './strings.js';
import { initHarmonics } from './harmonics.js';
import { buildSpruce, buildMaple } from './wood.js';
import * as audio from './audio.js';
import { STRINGS, reducedMotion } from './physics.js';

// ---------- signature canvases ----------
const hero = initHeroStrings();
initHarmonics();

// ---------- tonewood panels ----------
buildSpruce(document.getElementById('sprucePanel'));
buildMaple(document.getElementById('maplePanel'));

// ---------- sound toggle (user gesture gate for Karplus–Strong) ----------
const soundBtn = document.getElementById('soundToggle');
const soundLabel = soundBtn.querySelector('span');
soundBtn.addEventListener('click', () => {
  const on = soundBtn.getAttribute('aria-pressed') === 'true';
  if (on) {
    audio.disable();
    soundBtn.setAttribute('aria-pressed', 'false');
    soundLabel.textContent = soundLabel.dataset.off;
  } else {
    audio.enable();
    soundBtn.setAttribute('aria-pressed', 'true');
    soundLabel.textContent = soundLabel.dataset.on;
    // a soft open A to confirm the voice, and show it on the string —
    // with its sympathetic answer, like every other pluck on the page
    hero.strings[2].pluck(0.3, 14);
    hero.sympathize(2);
    audio.pluck(STRINGS[2].freq, 0.3, { t60: 3, gain: 0.5, bright: 0.9 });
  }
});

// ---------- nav scrollspy: the underline rests where the reader works ----------
const navA = new Map(
  [...document.querySelectorAll('.site-head nav a')].map((a) => [a.hash.slice(1), a])
);
let hereId = null;
const spy = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) hereId = en.target.id;
  navA.forEach((a, id) => {
    const on = id === hereId;
    a.classList.toggle('is-here', on);
    if (on) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section').forEach((s) => spy.observe(s));

// ---------- scroll reveals ----------
const reveals = document.querySelectorAll('.reveal, .reveal-strings');
if (reducedMotion) {
  reveals.forEach((n) => n.classList.add('is-in'));
  document.querySelectorAll('.wood').forEach((n) => n.classList.add('is-lit'));
} else {
  const ro = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        if (en.target.classList.contains('wood')) {
          // raking light crosses the plate just after the panel lands
          setTimeout(() => en.target.classList.add('is-lit'), 250);
        }
        ro.unobserve(en.target);
      }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach((n) => ro.observe(n));
  document.querySelectorAll('.wood').forEach((n) => ro.observe(n));
  // hero strings stage reveals on load
  requestAnimationFrame(() => {
    document.querySelector('.reveal-strings').classList.add('is-in');
  });
}

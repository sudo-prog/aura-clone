'use strict';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const grid = document.getElementById('grid');
const spectrum = document.getElementById('spectrum');
const plaque = document.getElementById('plaque');
const search = document.getElementById('search');
const count = document.getElementById('count');
const empty = document.getElementById('empty');
const viewer = document.getElementById('viewer');
const overlay = document.getElementById('iframe-overlay');
const iframeEl = document.getElementById('room-iframe');

/* ---------- hang the vitrines ---------- */

const wraps = [];
{
  const frag = document.createDocumentFragment();
  ROOMS.forEach((r, i) => {
    const no = String(i + 1).padStart(2, '0');
    const li = document.createElement('li');
    li.className = 'vwrap';
    li.id = 'study-' + r.name;
    li.style.setProperty('--a', r.accent);
    li.style.setProperty('--d', ((i % 3) * 0.09) + 's');
    li.innerHTML = `
      <button class="vitrine" type="button">
        <div class="shot"><img src="fable51/shots/${r.name}.jpg" width="2160" height="1350"
          alt="The front room of ${esc(r.title)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"></div>
        <div class="plate">
          <div class="plate-row">
            <span class="no"><span class="idx">Study ${no}</span><span class="enter" aria-hidden="true">Enter →</span></span>
            <span class="domain">${esc(r.name)}</span>
          </div>
          <h2>${esc(r.title)}</h2>
          <p class="where">${esc(r.where)}</p>
          <p class="blurb">${esc(r.blurb)}</p>
        </div>
      </button>`;
    const btn = li.querySelector('button.vitrine');
    btn.addEventListener('click', () => openStudy(r, no, li));
    frag.appendChild(li);
    wraps.push(li);
  });
  grid.appendChild(frag);
}

/* ---------- open individual room page (each has own iframe) ---------- */

function openStudy(r, no, li) {
  // Navigate to the individual room page that embeds this room in its own iframe
  window.location.href = 'fable51/' + r.name + '.html';
}

function closeRoom() {
  viewer.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  iframeEl.src = '';
  document.body.style.overflow = '';
  wraps.forEach(w => w.classList.remove('active'));
}

overlay.addEventListener('click', closeRoom);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && viewer.classList.contains('open')) closeRoom();
});

/* ---------- scroll reveal ---------- */

const revealIO = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
}, { threshold: 0.08, rootMargin: '0px 0px -4%' });
wraps.forEach(w => revealIO.observe(w));

/* ---------- spectrum strip ---------- */

function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

const chipByName = new Map();
{
  const rooms = ROOMS.map((r, i) => ({ ...r, i, ...hsl(r.accent) }));
  const chromatic = rooms.filter(r => r.s > 0.14 && r.l > 0.07 && r.l < 0.96).sort((a, b) => a.h - b.h || a.l - b.l);
  const neutral = rooms.filter(r => !chromatic.includes(r)).sort((a, b) => a.l - b.l);
  const frag = document.createDocumentFragment();
  [...chromatic, ...neutral].forEach((r, k) => {
    const no = String(r.i + 1).padStart(2, '0');
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.style.setProperty('--a', r.accent);
    b.style.transitionDelay = (k * 0.012) + 's';
    b.setAttribute('aria-label', `${r.title} \u2014 study ${no}`);
    b.dataset.name = r.name;
    b.addEventListener('click', () => {
      const target = document.getElementById('study-' + r.name);
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      target.classList.remove('pulse');
      setTimeout(() => target.classList.add('pulse'), reduced ? 50 : 450);
      target.addEventListener('animationend', () => target.classList.remove('pulse'), { once: true });
    });
    const show = () => {
      const rect = b.getBoundingClientRect();
      plaque.innerHTML = `<span class="pno">${no}</span>${esc(r.title)}`;
      const half = plaque.offsetWidth / 2 + 8;
      plaque.style.left = Math.min(Math.max(rect.left + rect.width / 2, half), innerWidth - half) + 'px';
      plaque.style.top = (rect.top - plaque.offsetHeight - 10) + 'px';
      plaque.classList.add('show');
    };
    const hide = () => plaque.classList.remove('show');
    b.addEventListener('mouseenter', show);
    b.addEventListener('mouseleave', hide);
    b.addEventListener('focus', show);
    b.addEventListener('blur', hide);
    frag.appendChild(b);
    chipByName.set(r.name, b);
  });
  spectrum.appendChild(frag);
  setTimeout(() => chipByName.forEach(c => { c.style.transitionDelay = ''; }), 1800);
}

/* the chip of the room nearest mid-viewport stands taller */
let currentChip = null;
const spyIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const chip = chipByName.get(e.target.id.replace('study-', ''));
    if (chip === currentChip) continue;
    currentChip?.classList.remove('current');
    chip.classList.add('current');
    currentChip = chip;
  }
}, { rootMargin: '-42% 0px -42%' });
wraps.forEach(w => spyIO.observe(w));

/* ---------- tilt (pointer-tracked, rAF-batched, lerped) ---------- */

if (finePointer && !reduced) {
  const MAX = 4.2;
  const live = new Map();
  let raf = null;

  const loop = () => {
    let alive = false;
    for (const [el, s] of live) {
      s.rx += (s.tx - s.rx) * 0.13;
      s.ry += (s.ty - s.ry) * 0.13;
      el.style.setProperty('--rx', s.rx.toFixed(3) + 'deg');
      el.style.setProperty('--ry', s.ry.toFixed(3) + 'deg');
      if (s.active || Math.abs(s.rx) > 0.01 || Math.abs(s.ry) > 0.01) alive = true;
      else { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); live.delete(el); }
    }
    raf = alive || live.size ? requestAnimationFrame(loop) : null;
  };
  const wake = () => { if (raf === null && !document.hidden) raf = requestAnimationFrame(loop); };

  wraps.forEach(w => {
    w.addEventListener('pointerenter', () => {
      if (!live.has(w)) live.set(w, { rx: 0, ry: 0, tx: 0, ty: 0, active: true });
      live.get(w).active = true;
      wake();
    });
    w.addEventListener('pointermove', e => {
      const s = live.get(w);
      if (!s) return;
      const r = w.getBoundingClientRect();
      s.ty = ((e.clientX - r.left) / r.width - 0.5) * 2 * MAX;
      s.tx = -((e.clientY - r.top) / r.height - 0.5) * 2 * MAX;
    });
    w.addEventListener('pointerleave', () => {
      const s = live.get(w);
      if (s) { s.active = false; s.tx = 0; s.ty = 0; }
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    else if (live.size) wake();
  });
}

/* ---------- search ---------- */

const fold = s => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const haystack = new Map(wraps.map((w, i) => {
  const r = ROOMS[i];
  return [w, fold(`${r.name} ${r.title} ${r.where} ${r.blurb}`)];
}));

search.addEventListener('input', () => {
  const q = fold(search.value.trim());
  let shown = 0;
  wraps.forEach(w => {
    const hit = !q || haystack.get(w).includes(q);
    w.classList.toggle('hidden', !hit);
    chipByName.get(w.id.replace('study-', '')).classList.toggle('mute', !hit);
    if (hit) shown++;
  });
  count.textContent = `${shown} / ${ROOMS.length} studies`;
  empty.classList.toggle('show', shown === 0);
});

/* ---------- boot choreography ---------- */

{
  const h1 = document.querySelector('.masthead h1');
  const text = h1.textContent;
  h1.textContent = '';
  [...text].forEach((ch, i) => {
    if (ch === ' ') { h1.appendChild(document.createTextNode(' ')); return; }
    const s = document.createElement('span');
    s.className = 'l';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch;
    s.style.transitionDelay = (0.12 + i * 0.028) + 's';
    h1.appendChild(s);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('boot');
    document.documentElement.classList.add('ready');
    setTimeout(() => h1.querySelectorAll('.l').forEach(s => { s.style.transitionDelay = ''; }), 1600);
  }));
}

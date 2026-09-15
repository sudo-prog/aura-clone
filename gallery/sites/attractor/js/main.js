// ATTRACTOR — gallery engine.
// One rAF loop walks the visible works; each visible, unfinished work
// paints one increment per frame. Offscreen works rest. Hidden tabs rest.

import { newSeed, mulberry32, fmtSeed } from './prng.js';
import { ALGORITHMS } from './pieces.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const artworks = [];
const active = new Set();
let rafId = 0;
let pageVisible = !document.hidden;

class Artwork {
  constructor(wall){
    this.wall = wall;
    this.algo = wall.dataset.algo;
    this.plate = wall.querySelector('.plate');
    this.canvas = wall.querySelector('canvas.art');
    this.ghost = wall.querySelector('canvas.ghost');
    this.seedEl = wall.querySelector('.seed-value');
    this.runtimeEl = wall.querySelector('.runtime-t');
    this._lastS = -1;
    this.btn = wall.querySelector('.reseed');
    this.seed = newSeed();
    this.piece = null;
    this.done = false;
    this.visible = false;
    if (this.btn) this.btn.addEventListener('click', () => this.reseed());
    this.updateSeedLabel(false);
  }

  size(){
    this.w = Math.max(20, this.plate.clientWidth);
    this.h = Math.max(20, this.plate.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  build(instant){
    this.size();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.rng = mulberry32(this.seed);
    this.piece = ALGORITHMS[this.algo](this.ctx, this.w, this.h, this.rng, { dpr: this.dpr });
    this.done = false;
    this.runStart = performance.now();
    this._lastS = -1;
    if (instant){
      this.piece.finish();
      this.done = this.piece.alive ? reduced : true;
    }
    this.wall.classList.toggle('executing', !this.done);
    schedule();
  }

  reseed(){
    // The current state gives way: snapshot it, dissolve it over the new one.
    const gc = this.ghost;
    gc.width = this.canvas.width;
    gc.height = this.canvas.height;
    gc.getContext('2d').drawImage(this.canvas, 0, 0);
    gc.classList.remove('fade');
    gc.classList.add('show');
    void gc.offsetWidth;
    gc.classList.add('fade');
    clearTimeout(this._ghostT);
    this._ghostT = setTimeout(() => gc.classList.remove('show', 'fade'), 1100);

    this.seed = newSeed();
    this.updateSeedLabel(true);
    this.build(reduced);
    if (this.visible) active.add(this);
    schedule();
  }

  updateSeedLabel(animate){
    if (!this.seedEl) return;
    const final = fmtSeed(this.seed);
    if (!animate || reduced){
      this.seedEl.textContent = final;
      return;
    }
    // A new accession number is drawn: the digits tumble before they settle.
    clearInterval(this._seedT);
    let ticks = 0;
    this._seedT = setInterval(() => {
      ticks++;
      if (ticks >= 9){
        clearInterval(this._seedT);
        this.seedEl.textContent = final;
        return;
      }
      this.seedEl.textContent = final.replace(/\d/g, () => (Math.random() * 10) | 0);
    }, 46);
  }
}

/* ---------- the loop ---------- */

function frame(now){
  rafId = 0;
  let working = false;
  for (const a of active){
    if (a.done || !a.piece) continue;
    if (a.piece.step(now)){
      a.done = true;
      a.wall.classList.remove('executing');
    } else working = true;
    // The featured acquisition wears the age of its current state.
    if (a.runtimeEl && a.piece.alive){
      const s = ((now - a.runStart) / 1000) | 0;
      if (s !== a._lastS){
        a._lastS = s;
        const m = (s / 60) | 0, ss = s % 60;
        a.runtimeEl.textContent = m + ':' + String(ss).padStart(2, '0');
      }
    }
  }
  if (working && pageVisible) rafId = requestAnimationFrame(frame);
}

function schedule(){
  if (!rafId && pageVisible) rafId = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  pageVisible = !document.hidden;
  if (pageVisible) schedule();
});

/* ---------- observers ---------- */

const io = new IntersectionObserver((entries) => {
  for (const e of entries){
    const a = e.target.__art;
    if (!a) continue;
    if (e.isIntersecting){
      a.visible = true;
      active.add(a);
      schedule();
    } else {
      a.visible = false;
      active.delete(a);
    }
  }
}, { threshold: 0.18 });

const ro = new IntersectionObserver((entries) => {
  for (const e of entries){
    if (e.isIntersecting){
      e.target.classList.add('in');
      ro.unobserve(e.target);
    }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

/* ---------- init ---------- */

document.querySelectorAll('.wall[data-algo]').forEach((wall) => {
  const a = new Artwork(wall);
  wall.__art = a;
  artworks.push(a);
  a.build(reduced);
  io.observe(wall);
});

document.querySelectorAll('.reveal-group').forEach((gp) => {
  gp.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
  });
});
document.querySelectorAll('[data-reveal]').forEach((el) => ro.observe(el));

/* header whisper turns opaque once the visitor walks */
const head = document.querySelector('.site-head');
let lastScrolled = false;
addEventListener('scroll', () => {
  const s = scrollY > 10;
  if (s !== lastScrolled){
    lastScrolled = s;
    head.classList.toggle('scrolled', s);
  }
}, { passive: true });

/* resize: re-execute every work at the new dimensions, same seed */
let lastW = innerWidth, rt = 0;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (Math.abs(innerWidth - lastW) < 28) return;
    lastW = innerWidth;
    for (const a of artworks) a.build(true);
    schedule();
  }, 240);
});

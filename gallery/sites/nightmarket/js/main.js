/* GŎNG SÌ NIGHT MARKET — street food, 2049
   Ignition choreography · rain & steam canvases · CRT order terminal */
(() => {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

/* ================= SIGN IGNITION ================= */
const hero = $('.hero');
const signBlock = $('.sign-block');

function buildMirror() {
  const wrap = $('.mirror-wrap');
  if (!wrap || !signBlock) return;
  const m = document.createElement('div');
  m.className = 'sign sign--mirror';
  m.setAttribute('aria-hidden', 'true');
  m.innerHTML = $('.sign', signBlock).innerHTML;
  const u = $('.sign-underline', signBlock);
  if (u) m.appendChild(u.cloneNode(true));
  wrap.appendChild(m);
}

function igniteSign() {
  const pink = $$('.sign-line--pink .lt', signBlock);
  const blue = $$('.sign-line--blue .lt', signBlock);
  let t = 380;
  for (const lt of pink) { lt.style.setProperty('--d', Math.round(t) + 'ms'); t += rand(120, 260); }
  t += 240;
  for (const lt of blue) { lt.style.setProperty('--d', Math.round(t) + 'ms'); t += rand(55, 130); }
  const cjkD = t + 260;
  const ulineD = cjkD + 340;
  hero.style.setProperty('--cjk-d', Math.round(cjkD) + 'ms');
  hero.style.setProperty('--uline-d', Math.round(ulineD) + 'ms');
  buildMirror();                     // clone carries the per-letter --d inline styles
  hero.classList.add('ignite');
  return ulineD + 750;               // when the whole board reads as "on"
}

/* Typed tagline */
function typeTagline(after) {
  const el = $('.tagline-text');
  if (!el) return;
  const text = el.dataset.text || '';
  if (reduced) return;               // CSS renders it statically
  setTimeout(() => {
    let i = 0;
    (function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i++);
        setTimeout(tick, text[i - 1] === '·' ? 150 : rand(18, 46));
      }
    })();
  }, after);
}

/* ================= HERO CANVAS: RAIN + STEAM ================= */
function makeSteamSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(205,215,235,.55)');
  grad.addColorStop(.55, 'rgba(190,205,230,.16)');
  grad.addColorStop(1, 'rgba(180,200,230,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}
const steamSprite = makeSteamSprite();

function heroFX() {
  const canvas = $('.hero-fx');
  if (!canvas || reduced) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0, groundY = 0;
  let drops = [], splashes = [], wisps = [];
  let running = false, visible = true, raf = 0, last = 0;

  function size() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - ($('.asphalt')?.clientHeight || H * .3);
    const n = Math.min(150, Math.round(W / 10));
    drops = Array.from({ length: n }, () => newDrop(true));
    wisps = Array.from({ length: 11 }, () => newWisp(true));
    splashes = [];
  }
  const newDrop = (seed) => ({
    x: rand(-40, W + 40), y: seed ? rand(-H, H) : rand(-120, -10),
    len: rand(11, 26), spd: rand(620, 1080), drift: rand(-90, -40),
    a: rand(.05, .16), tint: Math.random() < .12
  });
  const newWisp = (seed) => ({
    x: rand(W * .12, W * .88), y: seed ? rand(groundY - 200, groundY + 30) : groundY + rand(0, 40),
    r: rand(42, 92), spd: rand(10, 21), sway: rand(.4, 1.3), ph: rand(0, 6.28),
    a: 0, maxA: rand(.035, .08), life: 0
  });

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000 || .016);
    last = ts;
    ctx.clearRect(0, 0, W, H);

    // steam (behind rain) — hugs the ground, never climbs over the sign
    for (const w of wisps) {
      w.life += dt; w.y -= w.spd * dt; w.x += Math.sin(w.life * w.sway + w.ph) * 14 * dt;
      w.r += 6 * dt;
      if (w.y > groundY - 160) w.a = Math.min(w.maxA, w.a + dt * .04);
      else w.a -= dt * .05;
      if (w.a <= 0 && w.life > 2.5) Object.assign(w, newWisp(false));
      if (w.a > 0) {
        ctx.globalAlpha = Math.max(0, w.a);
        ctx.drawImage(steamSprite, w.x - w.r, w.y - w.r, w.r * 2, w.r * 2);
      }
    }
    ctx.globalAlpha = 1;

    // rain
    ctx.lineWidth = 1;
    for (const d of drops) {
      d.y += d.spd * dt; d.x += d.drift * dt;
      if (d.y > groundY + rand(0, H - groundY)) {
        if (Math.random() < .28) splashes.push({ x: d.x, y: Math.min(d.y, H - 6), r: 1, a: .22 });
        Object.assign(d, newDrop(false));
      }
      const dx = d.drift / d.spd * d.len, dy = d.len;
      ctx.strokeStyle = d.tint ? `rgba(255,140,200,${d.a})` : `rgba(175,205,255,${d.a})`;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - dx, d.y - dy); ctx.stroke();
    }

    // splashes
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.r += 26 * dt; s.a -= dt * .5;
      if (s.a <= 0) { splashes.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(190,215,255,${s.a})`;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * .32, 0, 0, 6.283); ctx.stroke();
    }

    raf = requestAnimationFrame(frame);
  }

  function setRun() {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; setRun(); }).observe(canvas);
  document.addEventListener('visibilitychange', setRun);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 180); });
  size(); setRun();
}

/* ================= DISH STEAM ================= */
function dishSteam() {
  if (reduced) return;
  const cards = $$('.dish');
  const units = [];
  for (const card of cards) {
    const canvas = $('.steam', card);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const u = { canvas, ctx, card, parts: [], vis: false, hot: false, W: 0, H: 0 };
    card.addEventListener('mouseenter', () => u.hot = true);
    card.addEventListener('mouseleave', () => u.hot = false);
    units.push(u);
  }
  if (!units.length) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);

  function sizeUnit(u) {
    const r = u.canvas.getBoundingClientRect();
    u.W = r.width; u.H = r.height;
    u.canvas.width = r.width * dpr; u.canvas.height = r.height * dpr;
    u.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    u.parts = Array.from({ length: 8 }, () => newPart(u, true));
  }
  const newPart = (u, seed) => ({
    x: u.W / 2 + rand(-20, 20), y: seed ? rand(u.H * .2, u.H * .6) : u.H * .58 + rand(-4, 10),
    r: rand(4, 8), spd: rand(10, 19), sway: rand(.8, 2), ph: rand(0, 6.28),
    a: 0, maxA: rand(.05, .12), life: 0
  });

  const io = new IntersectionObserver(es => {
    for (const e of es) {
      const u = units.find(x => x.canvas === e.target);
      if (u) { u.vis = e.isIntersecting; if (u.vis && !u.W) sizeUnit(u); }
    }
    setRun();
  }, { rootMargin: '60px' });
  units.forEach(u => io.observe(u.canvas));

  let running = false, raf = 0, last = 0;
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000 || .016);
    last = ts;
    for (const u of units) {
      if (!u.vis || !u.W) continue;
      const { ctx } = u;
      ctx.clearRect(0, 0, u.W, u.H);
      const boost = u.hot ? 1.7 : 1;
      for (const p of u.parts) {
        p.life += dt;
        p.y -= p.spd * boost * dt;
        p.x += Math.sin(p.life * p.sway + p.ph) * 9 * dt;
        p.r += 3.5 * dt;
        p.a = p.y > u.H * .3 ? Math.min(p.maxA * boost, p.a + dt * .25) : p.a - dt * .2;
        if (p.y < -10 || p.a <= 0 && p.life > 1) Object.assign(p, newPart(u, false));
        if (p.a > 0) {
          ctx.globalAlpha = Math.min(.18, p.a);
          ctx.drawImage(steamSprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  }
  function setRun() {
    const should = units.some(u => u.vis) && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }
  document.addEventListener('visibilitychange', setRun);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => units.forEach(u => u.vis && sizeUnit(u)), 200); });
}

/* ================= SCROLL REVEALS + GLITCH + HEAT ================= */
function reveals() {
  const els = $$('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(es => {
    const batch = es.filter(e => e.isIntersecting);
    batch.forEach((e, i) => {
      io.unobserve(e.target);
      setTimeout(() => {
        e.target.classList.add('in');
        const g = $('.glitch', e.target);
        if (g && !g.classList.contains('glitched')) setTimeout(() => g.classList.add('glitched'), 120);
        const h = $('.heat', e.target);
        if (h) setTimeout(() => h.classList.add('heat-on'), 420);
      }, reduced ? 0 : i * 70);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

/* ================= CRT ORDER TERMINAL ================= */
function terminal() {
  const linesEl = $('.crt-lines');
  const receiptEl = $('#receipt');
  const printBtn = $('#printBtn');
  const clearBtn = $('#clearBtn');
  if (!linesEl || !receiptEl) return;

  const items = new Map();          // name → {qty, price, cjk}
  let queue = Promise.resolve();    // serialize typewriter writes
  let ordering = false;             // has the user added anything
  let gen = 0;                      // bumped on CLEAR — stale writes are dropped
  let queueNo = Math.floor(rand(120, 960));
  const pad4 = n => String(n).padStart(4, '0');

  /* the previous customer's chit, still in the slot */
  const stub = $('#stub');
  if (stub) $('span', stub).textContent = `Nº ${pad4(queueNo)} · UNCLAIMED · 03:11`;

  const typeInto = (el, text) => new Promise(res => {
    if (reduced) { el.textContent = text; return res(); }
    let i = 0;
    (function tick() {
      el.textContent = text.slice(0, ++i);
      i < text.length ? setTimeout(tick, rand(12, 30)) : res();
    })();
  });

  function addLine(left, right, cls = '') {
    const g = gen;
    queue = queue.then(async () => {
      if (g !== gen) return;
      const div = document.createElement('div');
      div.className = 'crt-line' + (cls ? ' ' + cls : '');
      const l = document.createElement('span');
      const r = document.createElement('span'); r.className = 'r';
      div.append(l, r);
      linesEl.appendChild(div);
      while (linesEl.children.length > 9) linesEl.firstChild.remove();
      await typeInto(l, left);
      if (right && g === gen) r.textContent = right;
    });
    return queue;
  }

  function updateTotal() {
    let total = 0, count = 0;
    items.forEach(v => { total += v.qty * v.price; count += v.qty; });
    let t = $('.crt-line--total', linesEl);
    if (!t) {
      t = document.createElement('div');
      t.className = 'crt-line crt-line--total';
      t.innerHTML = '<span></span><span class="r"></span>';
    }
    linesEl.appendChild(t);   // keep pinned last
    t.firstChild.textContent = `TOTAL · ${count} ITEM${count === 1 ? '' : 'S'}`;
    t.lastChild.textContent = `HK$ ${total.toFixed(2)}`;
  }

  /* attract mode — boots when the terminal is first seen */
  const idleLines = [
    'INSERT APPETITE',
    'RAIN DOES NOT CLOSE US',
    '8 DISHES · 5 STALLS · 1 FLYOVER',
    'MSG IS A FLAVOR, NOT A CRIME',
    'THE COMPANY IS YOU, A BOWL, AND THE RAIN',
  ];
  let idleIdx = 0, idleTimer = 0, booted = false;
  function idle() {
    if (ordering) return;
    linesEl.innerHTML = '';
    addLine('> ' + idleLines[idleIdx++ % idleLines.length], '', 'crt-line--idle');
    idleTimer = setTimeout(idle, 4200);
  }
  function bootSeq() {
    if (booted) return;
    booted = true;
    if (ordering) return;
    addLine('SELFTEST ................ OK', '', 'crt-line--idle');
    addLine('RAIN DRIVER v2.3 ... LOADED', '', 'crt-line--idle');
    addLine('PRINTER ................ WARM', '', 'crt-line--idle');
    addLine('ATTRACT MODE', '', 'crt-line--idle').then(() => {
      if (!ordering) idleTimer = setTimeout(idle, 2400);
    });
  }
  const termSection = $('#terminal');
  if (termSection) {
    new IntersectionObserver((es, io) => {
      if (es.some(e => e.isIntersecting)) { io.disconnect(); bootSeq(); }
    }, { threshold: .25 }).observe(termSection);
  } else bootSeq();

  /* ADD buttons */
  $$('.dish').forEach(li => {
    const btn = $('.add', li);
    if (!btn) return;
    const orig = btn.textContent;
    btn.addEventListener('click', () => {
      const { name, price, cjk } = li.dataset;
      if (!ordering) {
        ordering = true; booted = true;
        clearTimeout(idleTimer); gen++; queue = Promise.resolve();
        linesEl.innerHTML = '';
      }
      const it = items.get(name) || { qty: 0, price: +price, cjk };
      it.qty++; items.set(name, it);
      const g = gen;
      addLine(`+ ${it.qty}× ${name}`, (it.qty * it.price).toFixed(2)).then(() => { if (g === gen) updateTotal(); });
      btn.classList.add('added');
      btn.textContent = 'ADDED — ' + it.qty + ' IN CART';
      setTimeout(() => { btn.classList.remove('added'); btn.textContent = orig; }, 1100);
      if (!reduced) {
        const f = document.createElement('span');
        f.className = 'fly';
        f.textContent = `+HK$${price}`;
        li.appendChild(f);
        f.addEventListener('animationend', () => f.remove());
      }
    });
  });

  /* PRINT */
  printBtn?.addEventListener('click', () => {
    if (!items.size) {
      if (!ordering) { clearTimeout(idleTimer); linesEl.innerHTML = ''; }
      addLine('> NOTHING TO PRINT. THE RAIN IS FREE.', '', 'crt-line--idle').then(() => {
        if (!ordering) idleTimer = setTimeout(idle, 3600);
      });
      return;
    }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const marketHour = (18 + now.getHours() % 10) % 24;   // it is always 18:00–04:00 here
    const stamp = `2049-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(marketHour)}:${pad(now.getMinutes())}`;
    let total = 0;
    let rows = '';
    items.forEach((v, k) => {
      total += v.qty * v.price;
      rows += `<p class="r-line"><span>${v.qty}× ${k} <span lang="zh-Hant">${v.cjk}</span></span><span class="r">${(v.qty * v.price).toFixed(2)}</span></p>`;
    });
    queueNo++;
    stub?.classList.add('gone');      // the printer finally eats the old chit
    receiptEl.innerHTML = `<div class="receipt-inner">
      <h3>GŎNG SÌ <span lang="zh-Hant">公司</span> NIGHT MARKET</h3>
      <p class="r-sub">KOWLOON UNDERLINE · DECK 3 · ${stamp}</p>
      <p class="r-queue">Nº ${String(queueNo).padStart(4, '0')}</p>
      <hr class="r-rule">
      ${rows}
      <hr class="r-rule">
      <p class="r-line r-total"><span>TOTAL</span><span class="r">HK$ ${total.toFixed(2)}</span></p>
      <p class="r-line"><span>RAIN SURCHARGE</span><span class="r">0.00</span></p>
      <p class="r-line"><span>PAID · OCTOPUS 9</span><span class="r">••••7118</span></p>
      <div class="r-barcode" aria-hidden="true"></div>
      <p class="r-note"><span lang="zh-Hant">多謝光臨</span> · SHOW THIS NUMBER · MSG IS A FLAVOR, NOT A CRIME</p>
    </div>`;
    const win = receiptEl.closest('.receipt-window');
    win.classList.remove('open');
    void win.offsetHeight;            // restart the paper feed
    win.classList.add('open');
    addLine(`> CHIT #${String(queueNo).padStart(4, '0')} PRINTED. STAND IN THE RAIN.`);
  });

  /* CLEAR */
  clearBtn?.addEventListener('click', () => {
    items.clear();
    ordering = false;
    receiptEl.closest('.receipt-window')?.classList.remove('open');
    clearTimeout(idleTimer);
    gen++; queue = Promise.resolve();
    linesEl.innerHTML = '';
    addLine('> ORDER CLEARED. THE NIGHT IS LONG.', '', 'crt-line--idle').then(() => {
      if (!ordering) idleTimer = setTimeout(idle, 3600);
    });
  });
}

/* ================= NEON BUZZ (procedural, opt-in) ================= */
function buzz() {
  const btn = $('#buzzBtn');
  if (!btn) return;
  let ac = null, master = null, crackleTimer = 0, on = false;

  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);

    // transformer hum: two detuned saws through a dull lowpass
    for (const [freq, det] of [[100, 0], [100, 7], [200, -4]]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = .7;
      const g = ac.createGain(); g.gain.value = freq === 200 ? .006 : .012;
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start();
    }
    // crackle bed: looped noise through a bandpass, gated randomly
    const len = ac.sampleRate * 1.2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < .015 ? 1 : .05);
    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2;
    const ng = ac.createGain(); ng.gain.value = .0;
    src.connect(bp); bp.connect(ng); ng.connect(master);
    src.start();
    // the dying R spits: random crackle bursts
    (function spit() {
      crackleTimer = setTimeout(() => {
        if (on && ac) {
          const t = ac.currentTime;
          ng.gain.cancelScheduledValues(t);
          ng.gain.setValueAtTime(.05, t);
          ng.gain.exponentialRampToValueAtTime(.0001, t + rand(.06, .22));
        }
        spit();
      }, rand(350, 2400));
    })();
  }

  btn.addEventListener('click', async () => {
    on = !on;
    btn.setAttribute('aria-pressed', String(on));
    $('.buzz-state', btn).textContent = on ? 'ON' : 'OFF';
    if (on) {
      if (!ac) build();
      await ac.resume();
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.linearRampToValueAtTime(1, ac.currentTime + .8);
    } else if (ac) {
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.linearRampToValueAtTime(0, ac.currentTime + .3);
      setTimeout(() => { if (!on && ac) ac.suspend(); }, 400);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ac && on) { on = false; btn.setAttribute('aria-pressed', 'false'); $('.buzz-state', btn).textContent = 'OFF'; master.gain.value = 0; ac.suspend(); }
  });
}

/* ================= BOOT ================= */
function boot() {
  reveals();
  terminal();
  heroFX();
  dishSteam();
  buzz();
  if (reduced) {
    buildMirror();                  // reflection is static-safe
    hero.classList.add('ignite', 'lit');  // CSS forces everything steady-on
    return;
  }
  document.fonts.ready.then(() => {
    const onAt = igniteSign();
    typeTagline(onAt - 300);
    // the cast light arrives as the last tube settles
    setTimeout(() => hero.classList.add('lit'), Math.max(0, onAt - 500));
  });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();

})();

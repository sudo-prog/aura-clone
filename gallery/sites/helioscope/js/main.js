// ============================================================
// HELIOSCOPE — instrumentation layer
// clock · boot choreography · charts · locator · observers
// ============================================================
import { initSun, stateAt } from './sun.js';
import {
  OBS, REGIONS, diskXY, FLARES, fluxSeries, KP, CITIES,
} from './data.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- signature element ------------------------------------------------
let sun = null;
try {
  sun = initSun($('#sun-canvas'));
} catch (err) {
  sun = null;
}
if (!sun) document.documentElement.classList.add('no-webgl');

// ---- UTC clock ----------------------------------------------------------
const clockEl = $('#utc-clock');
function tickClock() {
  clockEl.textContent = new Date().toISOString().slice(11, 19) + ' UT';
}
tickClock();
setInterval(tickClock, 1000);

// ---- telemetry packet age (footer of aurora panel) ----------------------
const pktEl = $('#pkt-age');
if (pktEl) {
  let age = 37, limit = 90 + Math.random() * 40;
  setInterval(() => {
    age += 1;
    if (age > limit) { age = 1; limit = 70 + Math.random() * 60; }
    pktEl.textContent = `T+${String(Math.floor(age)).padStart(3, '0')} S`;
  }, 1000);
}

// ==========================================================================
// FLARE INDEX — 24 h GOES-class log chart (SVG)
// ==========================================================================
const COMPACT = innerWidth < 700; // narrower viewBox => legible chart type on phones

function buildFluxChart() {
  const host = $('#flux-chart');
  if (!host) return;
  const W = COMPACT ? 440 : 760, H = COMPACT ? 280 : 300,
        x0 = 10, x1 = COMPACT ? 398 : 706,
        yTop = 14, yBot = COMPACT ? 246 : 272;
  const logMin = -8, logMax = -3;
  const X = (t) => x0 + (t / 24) * (x1 - x0);
  const Y = (f) => yBot - ((Math.log10(f) - logMin) / (logMax - logMin)) * (yBot - yTop);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    'Soft X-ray flux over the last 24 hours on a logarithmic scale. Background near B6 with flares C4.1, M1.8, C7.3 and C2.6.');

  let g = '';
  // class bands
  const bands = ['A', 'B', 'C', 'M', 'X'];
  for (let i = 0; i <= 5; i++) {
    const y = yBot - (i / 5) * (yBot - yTop);
    g += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="grid"/>`;
    if (i < 5) {
      const yc = yBot - ((i + 0.5) / 5) * (yBot - yTop);
      const hot = i >= 3;
      g += `<text x="${x1 + 16}" y="${yc + 4}" class="band ${hot ? 'band-hot' : ''}">${bands[i]}</text>`;
    }
  }
  // shade M+X alert bands very faintly
  g += `<rect x="${x0}" y="${yTop}" width="${x1 - x0}" height="${(yBot - yTop) * 0.4}" class="alert-band"/>`;
  // hour grid
  for (let h = 0; h <= 24; h += COMPACT ? 8 : 4) {
    g += `<line x1="${X(h)}" y1="${yBot}" x2="${X(h)}" y2="${yBot + 5}" class="grid"/>`;
    const lbl = h === 24 ? '24 UT' : String(h).padStart(2, '0');
    g += `<text x="${X(h)}" y="${yBot + 20}" class="ax" text-anchor="${h === 24 ? 'end' : 'middle'}">${lbl}</text>`;
  }

  // flux trace
  const pts = fluxSeries();
  const dPath = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.flux).toFixed(1)}`).join('');
  const area = `${dPath}L${X(OBS.windowEndH).toFixed(1)},${yBot}L${x0},${yBot}Z`;
  g += `<path d="${area}" class="flux-area"/>`;
  g += `<path d="${dPath}" class="flux-line" id="flux-line"/>`;

  // now marker
  const nx = X(OBS.windowEndH);
  g += `<line x1="${nx}" y1="${yTop}" x2="${nx}" y2="${yBot}" class="now-line"/>`;
  g += `<text x="${nx - 6}" y="${yTop + 10}" class="now-label" text-anchor="end">${OBS.windowEndLabel} · LIVE</text>`;

  // flare markers
  for (const f of FLARES) {
    const fx = X(f.t), fy = Y(f.peak);
    const hot = f.cls.startsWith('M') || f.cls.startsWith('X');
    g += `<g class="flare-mark ${hot ? 'hot' : ''}">
      <line x1="${fx}" y1="${fy - 6}" x2="${fx}" y2="${fy - 16}"/>
      <text x="${fx}" y="${fy - 22}" text-anchor="middle">${f.cls}</text>
    </g>`;
  }

  svg.innerHTML = g;
  host.appendChild(svg);

  // draw-in
  const line = $('#flux-line', host);
  const len = line.getTotalLength();
  if (!REDUCED) {
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
  }
}

// ==========================================================================
// SUNSPOT LOG — disk locator + region plates
// ==========================================================================
function buildLocator() {
  const host = $('#disk-locator');
  if (!host) return;
  const S = 240, C = S / 2, R = 100;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${S} ${S}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    'Orthographic solar disk locator showing the positions of active regions 4172, 4175, 4178 and 4181.');

  let g = `<circle cx="${C}" cy="${C}" r="${R}" class="limb"/>`;
  // parallels (project to chords seen from the ecliptic)
  for (const lat of [-60, -30, 0, 30, 60]) {
    const y = C - R * Math.sin(lat * Math.PI / 180);
    const hw = R * Math.cos(lat * Math.PI / 180);
    g += `<line x1="${C - hw}" y1="${y}" x2="${C + hw}" y2="${y}" class="grat ${lat === 0 ? 'grat-eq' : ''}"/>`;
  }
  // meridians (half ellipses)
  for (const lon of [-60, -30, 0, 30, 60]) {
    const rx = Math.abs(R * Math.sin(lon * Math.PI / 180));
    if (lon === 0) g += `<line x1="${C}" y1="${C - R}" x2="${C}" y2="${C + R}" class="grat"/>`;
    else g += `<ellipse cx="${C}" cy="${C}" rx="${Math.max(rx, 0.5)}" ry="${R}" class="grat"/>`;
  }
  g += `<text x="${C + R - 2}" y="${C - 6}" class="compass" text-anchor="end">W</text>`;
  g += `<text x="${C - R + 2}" y="${C - 6}" class="compass">E</text>`;

  for (const reg of REGIONS) {
    const p = diskXY(reg);
    const x = C + p.x * R, y = C - p.y * R;
    const labelLeft = p.x > 0.55;
    g += `<g class="ar-dot" data-ar="${reg.ar}">
      <circle cx="${x}" cy="${y}" r="10" class="ring"/>
      <circle cx="${x}" cy="${y}" r="${3 + reg.r * 30}" class="core"/>
      <text x="${labelLeft ? x - 14 : x + 14}" y="${y + 3}" text-anchor="${labelLeft ? 'end' : 'start'}">${reg.ar}</text>
    </g>`;
  }
  svg.innerHTML = g;
  host.appendChild(svg);
}

function buildRegionPlates() {
  const host = $('#ar-list');
  if (!host) return;
  host.innerHTML = REGIONS.map((reg, i) => `
    <li class="ar-row rv" data-ar="${reg.ar}" style="--d:${i * 0.08}s">
      <div class="ar-id">
        <span class="ar-num">AR ${reg.ar}</span>
        <span class="ar-cls" title="Mount Wilson magnetic class ${reg.clsName}">${reg.cls}</span>
      </div>
      <div class="ar-body">
        <p class="ar-meta mono">${reg.latH} ${reg.lonH} &nbsp;·&nbsp; ${reg.area} MSH &nbsp;·&nbsp; ${reg.spots} SPOTS</p>
        <p class="ar-note">${reg.note}</p>
      </div>
      <div class="ar-prob" aria-label="Flare probabilities: C ${reg.prob.c} percent, M ${reg.prob.m} percent, X ${reg.prob.x} percent">
        ${['c', 'm', 'x'].map((k) => `
          <div class="prob">
            <span class="prob-k">${k.toUpperCase()}</span>
            <span class="prob-track"><span class="prob-fill prob-${k}" style="width:${reg.prob[k]}%"></span></span>
            <span class="prob-v">${reg.prob[k]}%</span>
          </div>`).join('')}
      </div>
    </li>`).join('');

  // cross-highlight rows <-> locator dots
  const link = (ar, on) => {
    $$(`.ar-row[data-ar="${ar}"], .ar-dot[data-ar="${ar}"]`).forEach((el) =>
      el.classList.toggle('hot', on));
  };
  $$('.ar-row, .ar-dot').forEach((el) => {
    el.addEventListener('pointerenter', () => link(el.dataset.ar, true));
    el.addEventListener('pointerleave', () => link(el.dataset.ar, false));
  });
}

// ==========================================================================
// AURORA — 72 h Kp forecast bars + visibility ladder
// ==========================================================================
function buildKpChart() {
  const host = $('#kp-chart');
  if (!host) return;
  const W = COMPACT ? 440 : 760, H = COMPACT ? 240 : 250,
        x0 = 26, x1 = COMPACT ? 434 : 752,
        yTop = 31, yBot = COMPACT ? 188 : 196;
  const n = KP.bins.length;
  const bw = (x1 - x0) / n;
  const Y = (kp) => yBot - (kp / 9) * (yBot - yTop);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    'Planetary K index forecast for 72 hours. Peak Kp 6, a G2 storm, early on July 9.');

  let g = '';
  for (const kp of [3, 6, 9]) {
    g += `<line x1="${x0}" y1="${Y(kp)}" x2="${x1}" y2="${Y(kp)}" class="grid"/>`;
    g += `<text x="${x0 - 8}" y="${Y(kp) + 3.5}" class="ax" text-anchor="end">${kp}</text>`;
  }
  // storm threshold
  g += `<line x1="${x0}" y1="${Y(5)}" x2="${x1}" y2="${Y(5)}" class="thresh"/>`;
  g += `<text x="${x1}" y="${Y(5) - 5}" class="thresh-label" text-anchor="end">G1 THRESHOLD</text>`;

  // bars
  KP.bins.forEach((kp, i) => {
    const bx = x0 + i * bw + bw * 0.14;
    const by = Y(kp);
    const storm = kp >= 5;
    g += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(bw * 0.72).toFixed(1)}"
      height="${(yBot - by).toFixed(1)}" class="kbar ${storm ? 'kbar-storm' : ''}"
      style="--d:${(i * 0.024).toFixed(3)}s"><title>Kp ${kp}</title></rect>`;
  });

  // day separators + labels
  for (let dIdx = 0; dIdx < 3; dIdx++) {
    const sx = x0 + dIdx * 8 * bw;
    if (dIdx > 0) g += `<line x1="${sx}" y1="${yTop - 8}" x2="${sx}" y2="${yBot}" class="day-sep"/>`;
    g += `<text x="${sx + 4 * bw}" y="${yBot + 22}" class="ax" text-anchor="middle">${KP.days[dIdx]}</text>`;
  }
  g += `<line x1="${x0}" y1="${yBot}" x2="${x1}" y2="${yBot}" class="axis"/>`;

  // storm annotation
  const s0 = x0 + KP.stormBins[0] * bw, s1 = x0 + (KP.stormBins[1] + 1) * bw;
  g += `<path d="M${s0},${yTop - 10}L${s0},${yTop - 14}L${s1},${yTop - 14}L${s1},${yTop - 10}" class="storm-bracket"/>`;
  const stormText = COMPACT ? `${KP.stormLabel} WATCH` : `${KP.stormLabel} · CME + CH-88 STREAM`;
  g += `<text x="${(s0 + s1) / 2}" y="${yTop - 19}" class="storm-label" text-anchor="middle">${stormText}</text>`;

  svg.innerHTML = g;
  host.appendChild(svg);
}

function buildCityLadder() {
  const host = $('#city-ladder');
  if (!host) return;
  host.innerHTML = CITIES.map((c, i) => `
    <li class="city rv" style="--d:${i * 0.06}s">
      <span class="city-name">${c.name}</span>
      <span class="city-lat mono">${c.lat}</span>
      <span class="chip chip-${c.grade}">${c.verdict}</span>
    </li>`).join('');
}

// ==========================================================================
// Boot choreography, reveals, flares on section transitions
// ==========================================================================
function digitShuffle() {
  if (REDUCED) return;
  $$('[data-shuffle]').forEach((el, i) => {
    const final = el.textContent;
    const start = performance.now() + 350 + i * 95;
    const dur = 620;
    const step = (now) => {
      if (now < start) { requestAnimationFrame(step); return; }
      const t = (now - start) / dur;
      if (t >= 1) { el.textContent = final; return; }
      el.textContent = [...final].map((ch, j) =>
        /[0-9]/.test(ch) && (j * 7919 + Math.floor(now / 42)) % 3 !== 0
          ? String(Math.floor(Math.random() * 10)) : ch).join('');
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function setupReveals() {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach((el) => io.observe(el));

  // chart draw-in
  const lineIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('drawn');
        lineIO.unobserve(en.target);
      }
    }
  }, { threshold: 0.3 });
  $$('#flux-chart, #kp-chart').forEach((el) => lineIO.observe(el));
}

function setupSectionFlares() {
  const lamp = $('#status-lamp');
  const lampLabel = $('#status-label');
  let last = 0, lampTimer = 0;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const now = performance.now();
      if (now - last < 2600) continue;
      last = now;
      if (sun) sun.flare();
      if (!REDUCED) {
        // the instruments feel the flare: bezel ticks + IDs brighten briefly
        document.body.classList.add('flaring');
        setTimeout(() => document.body.classList.remove('flaring'), 1500);
      }
      if (lamp && !REDUCED) {
        lamp.classList.add('flare');
        lampLabel.textContent = 'TRANSIENT';
        clearTimeout(lampTimer);
        lampTimer = setTimeout(() => {
          lamp.classList.remove('flare');
          lampLabel.textContent = 'NOMINAL';
        }, 1900);
      }
    }
  }, { threshold: 0.22 });
  $$('#today, #flares, #regions, #aurora, #station').forEach((s) => io.observe(s));
}

function setupNavCurrent() {
  const links = new Map(
    $$('.nav a').map((a) => [a.getAttribute('href').slice(1), a]));
  const instEl = $('#dr-inst');
  const INST = {
    sun: 'WL-3', today: 'WL-3', flares: 'HX-1',
    regions: 'MAG-4', aurora: 'L1', station: 'KEA-2',
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      if (instEl && INST[en.target.id]) instEl.textContent = INST[en.target.id];
      const link = links.get(en.target.id);
      if (!link) continue;
      links.forEach((l) => l.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-40% 0px -50% 0px' });
  $$('main section[id], footer[id]').forEach((s) => io.observe(s));
}

// ==========================================================================
// Descent rail — right-edge altimeter mirroring the camera's field of view
// ==========================================================================
function setupDepthRail() {
  const rail = $('.depth-rail');
  if (!rail) return;
  const marker = $('.dr-marker', rail);
  const track = $('.dr-track', rail);
  const read = $('#dr-read');
  let trackH = 0;
  const measure = () => { trackH = track.getBoundingClientRect().height; };
  measure();
  addEventListener('resize', measure);

  let pending = false;
  const update = () => {
    pending = false;
    const doc = document.documentElement;
    const span = Math.max(doc.scrollHeight - innerHeight, 1);
    const t = Math.min(Math.max(scrollY / span, 0), 1);
    marker.style.transform = `translateY(${(t * Math.max(trackH - 2, 0)).toFixed(1)}px)`;
    // half-viewport height expressed in solar radii — widens as we pull back
    read.textContent = (0.5 / stateAt(t).r).toFixed(2);
  };
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// ---- run ---------------------------------------------------------------
buildFluxChart();
buildLocator();
buildRegionPlates();
buildKpChart();
buildCityLadder();
setupReveals();
setupSectionFlares();
setupNavCurrent();
setupDepthRail();

requestAnimationFrame(() => requestAnimationFrame(() => {
  document.body.classList.add('lit');
  digitShuffle();
}));

// ---- WL-3 live-feed frame counter (hero corner) -------------------------
const frameEl = $('#frame-n');
if (frameEl) {
  let n = 88214;
  setInterval(() => {
    n += 1;
    frameEl.textContent = String(n).padStart(6, '0').replace(/^(\d{3})/, '$1 ');
  }, 1000);
}

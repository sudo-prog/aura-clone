/* ═══════════════════════════════════════════════════════════════════
   EPHEMERIS · main.js — the year dial, This Night, specimen pages,
   the shelf of editions, and the quiet choreography between them.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const A = window.ALM;
  const $ = s => document.querySelector(s);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── date state ────────────────────────────────────────────────── */
  const today = (() => {
    const n = new Date();
    const m = n.getMonth();
    return A.doyOf(m, Math.min(n.getDate(), A.MLEN[m]));
  })();
  let doy = today;

  /* ── the year dial ─────────────────────────────────────────────── */
  const dial = $('#dial');
  let ring;

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || dial).appendChild(e);
    return e;
  }

  function buildDial() {
    const C = 160;
    const defs = el('defs', {});
    const grad = el('radialGradient', { id: 'brass', cx: '50%', cy: '42%', r: '65%' }, defs);
    el('stop', { offset: '0%', 'stop-color': 'rgba(199,165,94,0.13)' }, grad);
    el('stop', { offset: '72%', 'stop-color': 'rgba(199,165,94,0.045)' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'rgba(199,165,94,0.10)' }, grad);
    el('circle', { cx: C, cy: C, r: 146, fill: 'url(#brass)' });

    ring = el('g', { id: 'dialRing' });
    // ticks: months major, five-day minor
    for (let d = 0; d < 365; d += 5) {
      const a = d / 365 * 360;
      el('line', {
        x1: C, y1: 14, x2: C, y2: 19,
        stroke: 'rgba(199,165,94,0.35)', 'stroke-width': 0.6,
        transform: `rotate(${a} ${C} ${C})`
      }, ring);
    }
    for (let m = 0; m < 12; m++) {
      const a = A.MLEN.slice(0, m).reduce((s, v) => s + v, 0) / 365 * 360;
      el('line', {
        x1: C, y1: 14, x2: C, y2: 26,
        stroke: 'rgba(199,165,94,0.7)', 'stroke-width': 1,
        transform: `rotate(${a} ${C} ${C})`
      }, ring);
      const mid = (A.MLEN.slice(0, m).reduce((s, v) => s + v, 0) + A.MLEN[m] / 2) / 365 * 360;
      const g = el('g', { transform: `rotate(${mid} ${C} ${C})` }, ring);
      const t = el('text', {
        x: C, y: 42, 'text-anchor': 'middle',
        fill: m === 7 ? '#EDDCA8' : 'rgba(217,225,236,0.75)',
        style: 'font-family:"Cormorant SC",serif;font-size:12.5px;letter-spacing:.24em;'
      }, g);
      t.textContent = A.MONTHS[m].slice(0, 3).toUpperCase();
    }
    // the eclipse — 12 August, marked in carmine on the rim
    const eclA = (A.doyOf(7, 12) + 0.5) / 365 * 360;
    el('circle', {
      cx: C, cy: 22.5, r: 2.6, fill: '#C0524A',
      transform: `rotate(${eclA} ${C} ${C})`
    }, ring);

    // cardinal points of the year — four silver marks riding the outer channel
    const SEASONS = [
      [A.doyOf(2, 20), 'Vernal equinox — 20 March'],
      [A.doyOf(5, 21), 'Summer solstice — 21 June'],
      [A.doyOf(8, 22), 'Autumnal equinox — 22 September'],
      [A.doyOf(11, 21), 'Winter solstice — 21 December']
    ];
    for (const [dy, name] of SEASONS) {
      const a = (dy + 0.5) / 365 * 360;
      const g = el('g', { transform: `rotate(${a} ${C} ${C})` }, ring);
      el('circle', { cx: C, cy: 11.2, r: 1.5, fill: 'none', stroke: 'rgba(217,225,236,0.65)', 'stroke-width': 0.8 }, g);
      const ti = el('title', {}, g);
      ti.textContent = name;
    }

    // static furniture above the ring
    el('circle', { cx: C, cy: C, r: 151, fill: 'none', stroke: 'rgba(199,165,94,0.55)', 'stroke-width': 1 });
    el('circle', { cx: C, cy: C, r: 146.5, fill: 'none', stroke: 'rgba(199,165,94,0.28)', 'stroke-width': 0.6 });
    el('circle', { cx: C, cy: C, r: 108, fill: 'none', stroke: 'rgba(199,165,94,0.22)', 'stroke-width': 0.6 });
    el('path', { d: `M${C} 6 L${C - 5.5} 17 L${C + 5.5} 17 Z`, fill: '#EDDCA8' });

    ring.style.transformOrigin = '160px 160px';
    if (!reduced) ring.style.transition = 'transform .5s cubic-bezier(.19,.8,.22,1)';
  }

  function ringTo(v, immediate) {
    if (immediate) {
      ring.style.transition = 'none';
      ring.style.transform = `rotate(${-v / 365 * 360}deg)`;
      void ring.getBoundingClientRect();
      if (!reduced) ring.style.transition = 'transform .5s cubic-bezier(.19,.8,.22,1)';
    } else {
      ring.style.transform = `rotate(${-v / 365 * 360}deg)`;
    }
  }

  function setDate(v, opts = {}) {
    doy = ((Math.round(v) % 365) + 365) % 365;
    const { day, monthName } = A.dateOf(doy);
    $('#drDay').textContent = day;
    $('#drMon').textContent = monthName;
    dial.setAttribute('aria-valuenow', doy);
    dial.setAttribute('aria-valuetext', day + ' ' + monthName + ' 2026');
    ringTo(doy, opts.immediate);
    renderNight(doy);
    if (window.ATLAS) ATLAS.setDoy(doy);
  }

  function bindDial() {
    let draggingDial = false, a0 = 0, doy0 = 0, accum = 0;
    const angOf = e => {
      const r = dial.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };
    dial.addEventListener('pointerdown', e => {
      dial.setPointerCapture(e.pointerId);
      draggingDial = true;
      a0 = angOf(e); doy0 = doy; accum = 0;
      dial.classList.add('dragging');
      ring.style.transition = 'none';
    });
    dial.addEventListener('pointermove', e => {
      if (!draggingDial) return;
      let da = angOf(e) - a0;
      while (da > 180) da -= 360;
      while (da < -180) da += 360;
      accum += da; a0 = angOf(e);
      setDate(doy0 - accum / 360 * 365, { immediate: true });
    });
    const up = () => {
      if (!draggingDial) return;
      draggingDial = false;
      dial.classList.remove('dragging');
      if (!reduced) ring.style.transition = 'transform .5s cubic-bezier(.19,.8,.22,1)';
    };
    dial.addEventListener('pointerup', up);
    dial.addEventListener('pointercancel', up);
    dial.addEventListener('keydown', e => {
      const step = e.shiftKey ? 7 : 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setDate(doy + step); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setDate(doy - step); e.preventDefault(); }
      else if (e.key === 'PageUp') { setDate(doy + 30); e.preventDefault(); }
      else if (e.key === 'PageDown') { setDate(doy - 30); e.preventDefault(); }
      else if (e.key === 'Home') { setDate(today); e.preventDefault(); }
    });
    $('#dayBack').addEventListener('click', () => { setDate(doy - 1); ATLAS.hideHint(); });
    $('#dayFwd').addEventListener('click', () => { setDate(doy + 1); ATLAS.hideHint(); });
    $('#dialToday').addEventListener('click', () => { setDate(today); ATLAS.hideHint(); });
    $('#eclipseBtn').addEventListener('click', () => { setDate(A.doyOf(7, 12)); ATLAS.hideHint(); });
    dial.addEventListener('pointerdown', () => ATLAS.hideHint(), { once: true });
    dial.addEventListener('keydown', () => ATLAS.hideHint(), { once: true });
  }

  /* ── This Night ────────────────────────────────────────────────── */
  const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const PNAME = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };

  function row(dt, dd) {
    return `<div class="row"><dt>${dt}</dt><span class="leader" aria-hidden="true"></span><dd>${dd}</dd></div>`;
  }

  function renderNight(doy) {
    const d = A.d2000(doy, 21);
    const s = A.sun(d);
    const se = A.eclToEq(s.lambda, 0);
    const srs = A.riseSet(doy, se.raH, se.dec, -0.833);
    const stw = A.riseSet(doy, se.raH, se.dec, -18);

    let darkRow;
    if (stw.neverRises) darkRow = row('True dark', '<i>never — it does not come</i>');
    else if (stw.circumpolar || !stw.set) darkRow = row('True dark', '<i>not this night — midsummer glow</i>');
    else darkRow = row('True dark', A.fmtHM(stw.set) + ' — ' + A.fmtHM(stw.rise));

    $('#sunRows').innerHTML =
      row('Sun rises', A.fmtHM(srs.rise)) +
      row('Sun souths', A.fmtHM(srs.transit)) +
      row('Sun sets', A.fmtHM(srs.set)) +
      darkRow;

    // the Moon
    const m = A.moon(d);
    const ph = A.moonPhase(d);
    const me = A.eclToEq(m.lambda, m.beta);
    const mrs = A.riseSet(doy, me.raH, me.dec, 0.125);
    $('#moonName').textContent = ph.name;
    $('#moonPct').textContent = Math.round(ph.illum * 100) + '% lit · ' + Math.round(ph.age) + ' days old';
    $('#moonTimes').innerHTML = mrs.circumpolar
      ? 'above the horizon all night'
      : mrs.neverRises
        ? 'below the horizon all night'
        : 'rises ' + A.fmtHM(mrs.rise) + ' · sets ' + A.fmtHM(mrs.set);
    drawMoonSVG($('#moonSvg'), ph);

    // the planets
    let html = '';
    for (const k of PLANETS) {
      const p = A.planet(k, d);
      const e = A.eclToEq(p.lambda, p.beta);
      const rs = A.riseSet(doy, e.raH, e.dec, -0.567);
      const mag = A.planetMag(k, p.r, p.delta);
      const elong = A.wrap180(p.lambda - s.lambda);
      let vis, lost = false;
      if (Math.abs(elong) < 12) { vis = 'lost in the Sun&rsquo;s glare'; lost = true; }
      else if (Math.abs(elong) > 150) vis = 'all night — souths ' + A.fmtHM(rs.transit);
      else if (elong > 0) vis = 'evening, western sky — sets ' + A.fmtHM(rs.set);
      else vis = 'morning, eastern sky — rises ' + A.fmtHM(rs.rise);
      const magStr = lost ? '—' : (mag < 0 ? '−' : '+') + Math.abs(mag).toFixed(1);
      html += `<li${lost ? ' class="p-lost"' : ''}>
        <span class="p-name">${PNAME[k]}</span>
        <span class="p-where">in ${A.zodiacOf(p.lambda)}</span>
        <span class="p-mag">${magStr}</span>
        <span class="p-vis">${vis}</span></li>`;
    }
    $('#planetList').innerHTML = html;
  }

  /* moon disc: lit limb right when waxing, left when waning; craters drawn */
  function drawMoonSVG(svg, ph) {
    const r = 30, c = 36;
    const k = Math.cos(ph.elong * Math.PI / 180);
    const rx = r * Math.abs(k);
    const sweepT = k > 0 ? 0 : 1;
    const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepT} ${c} ${c - r} Z`;
    const flip = ph.waxing ? '' : ` transform="translate(${2 * c} 0) scale(-1 1)"`;
    svg.innerHTML =
      `<circle cx="${c}" cy="${c}" r="${r}" fill="#131B2E" stroke="rgba(217,225,236,.45)" stroke-width="1"/>` +
      (ph.illum > 0.005 ? `<g${flip}>
        <clipPath id="litclip"><path d="${lit}"/></clipPath>
        <path d="${lit}" fill="#DDE4EF"/>
        <g clip-path="url(#litclip)" fill="rgba(120,132,158,.4)">
          <circle cx="${c + 9}" cy="${c - 8}" r="4.2"/>
          <circle cx="${c + 2}" cy="${c + 10}" r="5.6"/>
          <circle cx="${c + 14}" cy="${c + 6}" r="2.6"/>
          <circle cx="${c - 8}" cy="${c - 2}" r="3.1"/>
        </g></g>` : '') +
      `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(217,225,236,.3)" stroke-width=".7"/>`;
  }

  /* ── specimen pages — computed once, for August ────────────────── */
  function fillSpecimen() {
    const AUG = 7;
    let rows = '';
    for (let day = 1; day <= 16; day++) {
      const dy = A.doyOf(AUG, day);
      const d = A.d2000(dy, 12);
      const s = A.sun(d);
      const se = A.eclToEq(s.lambda, 0);
      const srs = A.riseSet(dy, se.raH, se.dec, -0.833);
      const m = A.moon(A.d2000(dy, 21));
      const me = A.eclToEq(m.lambda, m.beta);
      const mrs = A.riseSet(dy, me.raH, me.dec, 0.125);
      const ph = A.moonPhase(A.d2000(dy, 21));
      const decD = se.dec * 180 / Math.PI;
      const dd = Math.abs(decD), dg = Math.floor(dd), dm = Math.round((dd - dg) * 60);
      const decStr = (decD < 0 ? '−' : '+') + dg + '° ' + String(dm).padStart(2, '0') + '′';
      rows += `<tr${day === 12 ? ' class="eclipse"' : ''}>
        <td>${day}</td>
        <td class="sun-start">${A.fmtHMplain(srs.rise)}</td>
        <td>${A.fmtHMplain(srs.set)}</td>
        <td>${decStr}</td>
        <td class="sun-start">${A.fmtHMplain(mrs.rise)}</td>
        <td>${A.fmtHMplain(mrs.set)}</td>
        <td>${Math.round(ph.age)}</td></tr>`;
    }
    $('#augTable tbody').innerHTML = rows;

    // phenomena: the eclipse, the Perseids, and every lunar conjunction the engine finds
    const events = [
      { day: 12, txt: 'Total eclipse of the Sun; greatest at 17<sup>h</sup>46<sup>m</sup> — Iceland, the open Atlantic, Spain.', ecl: true },
      { day: 12, txt: 'Perseid meteors at maximum, to sixty an hour; the night is moonless.' }
    ];
    for (const k of PLANETS) {
      let prev = null;
      for (let day = 0; day <= 32; day++) {
        const d = A.d2000(A.doyOf(AUG, 1) + day - 1, 21);
        const sep = A.wrap180(A.moon(d).lambda - A.planet(k, d).lambda);
        if (prev !== null && prev < 0 && sep >= 0 && day >= 1 && day <= 31) {
          const db = A.moon(d).beta - A.planet(k, d).beta;
          const deg = Math.max(0.5, Math.abs(db)).toFixed(0);
          events.push({ day, txt: `The Moon passes ${deg}° ${db > 0 ? 'north' : 'south'} of ${PNAME[k]}.` });
        }
        prev = sep;
      }
    }
    events.sort((a, b) => a.day - b.day);
    $('#phenomena').innerHTML = events.map(e =>
      `<li><span class="ph-day${e.ecl ? ' ph-ecl' : ''}">${e.day}</span><span>${e.txt}</span></li>`).join('');

    // phases of the moon, found by the engine
    const targets = [[0, 'New Moon'], [90, 'First Quarter'], [180, 'Full Moon'], [270, 'Last Quarter']];
    const found = [];
    for (let h = 0; h <= 31 * 24; h += 2) {
      const d0 = A.d2000(A.doyOf(AUG, 1), h - 2);
      const d1 = A.d2000(A.doyOf(AUG, 1), h);
      const e0 = A.moonPhase(d0).elong, e1 = A.moonPhase(d1).elong;
      for (const [tgt, name] of targets) {
        const c0 = A.wrap180(e0 - tgt), c1 = A.wrap180(e1 - tgt);
        if (c0 < 0 && c1 >= 0) {
          const day = Math.min(31, Math.floor(h / 24) + 1);
          if (!found.some(f => f.name === name)) found.push({ name, day, tgt });
        }
      }
    }
    found.sort((a, b) => a.day - b.day);
    $('#phasesRow').innerHTML = found.map(f => {
      // almanac convention: ink is shadow — New ●, First Quarter ◐, Full ○, Last ◑
      const r = 15, c = 16;
      let disc;
      if (f.tgt === 0) disc = `<circle cx="${c}" cy="${c}" r="${r}" fill="#2B2519"/>`;
      else if (f.tgt === 180) disc = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#2B2519" stroke-width="1.2"/>`;
      else {
        const sweep = f.tgt === 90 ? 0 : 1; // shadow west for first quarter, east for last
        disc = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#2B2519" stroke-width="1.2"/>
                <path d="M ${c} ${c - r} A ${r} ${r} 0 0 ${sweep} ${c} ${c + r} Z" fill="#2B2519"/>`;
      }
      return `<div class="phase-cell"><svg viewBox="0 0 32 32" aria-hidden="true">${disc}</svg>
        <span class="ph-name">${f.name}</span><span class="ph-date">${f.day} August</span></div>`;
    }).join('');
  }

  /* ── the shelf of editions ─────────────────────────────────────── */
  const NOTES = {
    1853: 'First edition. Four hundred copies, sewn in blue wrappers; eleven survive.',
    1861: 'The Comet Edition. Tebbutt&rsquo;s comet arrived mid-printing; a fold-out plate was cut at the last hour.',
    1874: 'Transit of Venus. Sold out in nine days; the Press bought its first steam platen with the proceeds.',
    1882: 'The second transit. Voss, aged 61, computed the contacts herself. &ldquo;Once more, then never again for us.&rdquo;',
    1901: 'New century: red cloth, new type, and photographic charts — abandoned within a year as &ldquo;too soft.&rdquo;',
    1910: 'Halley&rsquo;s return. The most reprinted edition in the Press&rsquo;s history: seven impressions.',
    1919: 'The Eclipse Edition. Carried the 29 May track to Pr&iacute;ncipe; a reader wrote asking whether starlight truly bends.',
    1943: 'War economy: thinner stock, one colour, no cloth — and not one table omitted.',
    1957: 'The Satellite Supplement, eight pages added at the last minute, on &ldquo;the new artificial moons.&rdquo;',
    1969: 'The Lunar Edition, gold cloth — the only departure in a century. The Moon-map foldout now hangs in ten thousand halls.',
    1986: 'Halley again, low and poor. The preface apologised for the comet&rsquo;s manners.',
    1997: 'Hale&ndash;Bopp. Circulation doubled and has never entirely come down.',
    2012: 'The Last Transit. Venus crossed the Sun 5&ndash;6 June; the next is 2117. The colophon reads: for our successors.',
    2024: 'The April eclipse — first edition set wholly in the Press&rsquo;s digital revival of its 1853 type.',
    2026: 'This edition. Totality returns to Europe on 12 August, and the Perseids fall the same moonless night.'
  };
  const SHELF_YEARS = [1853, 1857, 1861, 1866, 1870, 1874, 1878, 1882, 1887, 1893,
    1901, 1905, 1910, 1914, 1916, 1917, 1918, 1919, 1924, 1931, 1936, 1943, 1947,
    1951, 1957, 1961, 1965, 1969, 1973, 1978, 1982, 1986, 1990, 1994, 1997, 2001,
    2003, 2008, 2012, 2016, 2020, 2024, 2026];
  const CLOTHS = ['#41584A', '#6C3D36', '#37436B', '#5C4E31', '#39464E', '#5D4258', '#43596B'];

  function buildShelf() {
    const shelf = $('#shelf');
    const tip = document.createElement('div');
    tip.className = 'spine-tip';
    tip.setAttribute('role', 'status');
    document.body.appendChild(tip);

    const strip = html => { const t = document.createElement('div'); t.innerHTML = html; return t.textContent; };
    let hideTip = () => {};
    addEventListener('scroll', () => hideTip(), { passive: true });

    SHELF_YEARS.forEach(y => {
      const notable = NOTES[y] != null;
      const war = (y >= 1916 && y <= 1918) || y === 1943;
      const sp = document.createElement(notable ? 'button' : 'div');
      if (notable) sp.type = 'button';
      sp.className = 'spine' + (notable ? ' notable' : '') + (y === 2026 ? ' current' : '');
      const h = war ? 168 : 182 + ((y * 7919) % 34);
      const w = war ? 19 : 27 + ((y * 104729) % 12);
      sp.style.height = h + 'px';
      sp.style.width = w + 'px';
      let cloth = CLOTHS[(y * 31) % CLOTHS.length];
      if (y === 1901) cloth = '#7A3A33';
      if (y === 1969) cloth = '#A8853E';
      if (y === 2026) cloth = '#2A3763';
      if (war) cloth = '#6B6350';
      sp.style.background = `linear-gradient(90deg, rgba(255,255,255,.20), rgba(255,255,255,.03) 30%, rgba(0,0,0,.25) 82%, rgba(0,0,0,.5)),` +
        `linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,0) 25%, rgba(0,0,0,.3) 95%), ${cloth}`;
      const yr = document.createElement('span');
      yr.className = 'sp-year';
      yr.textContent = y;
      if (y === 1969) yr.style.color = '#2B2519';
      sp.appendChild(yr);
      if (notable) {
        const st = document.createElement('span');
        st.className = 'sp-star';
        st.textContent = '✦';
        st.setAttribute('aria-hidden', 'true');
        sp.appendChild(st);
        sp.setAttribute('aria-label', y + ' edition — ' + strip(NOTES[y]));
        const show = () => {
          tip.innerHTML = `<b>${y}</b><p>${NOTES[y]}</p>`;
          const r = sp.getBoundingClientRect();
          tip.classList.add('show');
          const tw = tip.offsetWidth, th = tip.offsetHeight;
          let left = r.left + r.width / 2 - tw / 2;
          left = Math.max(10, Math.min(innerWidth - tw - 10, left));
          tip.style.left = left + 'px';
          tip.style.top = Math.max(8, r.top - th - 14) + 'px';
        };
        const hide = () => tip.classList.remove('show');
        hideTip = hide;
        sp.addEventListener('mouseenter', show);
        sp.addEventListener('mouseleave', hide);
        sp.addEventListener('focus', show);
        sp.addEventListener('blur', hide);
      }
      shelf.appendChild(sp);
    });
  }

  /* ── constellation chips & card ────────────────────────────────── */
  function bindChips() {
    const chips = document.querySelectorAll('.chip');
    const card = $('#constCard');
    let pinned = null;
    chips.forEach(ch => {
      const key = ch.dataset.const;
      ch.setAttribute('aria-pressed', 'false');
      ch.addEventListener('click', () => {
        ATLAS.select(pinned === key ? null : key);
      });
      ch.addEventListener('mouseenter', () => ATLAS.preview(key, true));
      ch.addEventListener('mouseleave', () => ATLAS.preview(key, false));
    });
    ATLAS.onSelect((key, c) => {
      pinned = key;
      chips.forEach(ch => {
        const on = ch.dataset.const === key;
        ch.classList.toggle('active', on);
        ch.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (c) {
        $('#ccName').textContent = c.label;
        $('#ccGen').textContent = c.gen;
        $('#ccNote').textContent = c.note;
        $('#ccData').innerHTML = c.data;
        card.hidden = false;
      } else {
        card.hidden = true;
      }
    });
  }

  /* ── scroll reveals ────────────────────────────────────────────── */
  function bindReveals() {
    if (reduced) {
      document.querySelectorAll('.reveal').forEach(s => s.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(s => io.observe(s));
  }

  /* ── go ────────────────────────────────────────────────────────── */
  buildDial();
  bindDial();
  ATLAS.init({ doy });
  bindChips();
  setDate(doy, { immediate: true });
  fillSpecimen();
  buildShelf();
  bindReveals();
})();

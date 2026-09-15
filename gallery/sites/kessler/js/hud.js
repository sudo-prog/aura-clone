/* KESSLER WATCH — HUD wiring: clock, telemetry, scrubber, catalog card,
   conjunction alert, boot sequence. */

const $ = (s) => document.querySelector(s);

function fmtHMS(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}
function fmtSimElapsed(s) {
  s = Math.max(0, Math.floor(s));
  const d = Math.floor(s / 86400);
  return String(d).padStart(3, '0') + ':' + fmtHMS(s % 86400);
}
function fmtKm(km) {
  if (km < 1) return (km * 1000).toFixed(0) + ' M';
  if (km < 100) return km.toFixed(2) + ' KM';
  return Math.round(km).toLocaleString('en-US') + ' KM';
}

export function initHUD(sky) {
  const els = {
    utc: $('#utc-clock'),
    simElapsed: $('#sim-elapsed'),
    rateLabel: $('#rate-label'),
    slider: $('#time-slider'),
    hold: $('#hold-btn'),
    card: $('#catalog-card'),
    conjChip: $('#conj-chip'),
    alert: $('#conj-alert'),
    alertTitle: $('#conj-alert-title'),
    alertBody: $('#conj-alert-body'),
    hero: $('#sky'),
    status: $('#hud-status'),
    statusText: $('#hud-status-text'),
  };

  /* real UTC clock */
  function utcTick() {
    const d = new Date();
    els.utc.textContent = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
      .map((v) => String(v).padStart(2, '0')).join(':') + ' UTC';
  }
  utcTick();
  setInterval(utcTick, 1000);

  /* telemetry counts from the real catalog — odometer count-up on boot */
  const c = sky.counts();
  function countUp(el, target, suffix = '', dur = 1100) {
    if (sky.isReduced()) { el.textContent = target + suffix; return; }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  setTimeout(() => {
    countUp($('#stat-total'), c.total);
    countUp($('#stat-leo'), c.leo);
    countUp($('#stat-nav'), c.nav);
    countUp($('#stat-geo'), c.geo);
    countUp($('#stat-debris'), c.debrisPct, '%');
  }, sky.isReduced() ? 0 : 620);
  document.querySelectorAll('.js-total').forEach((el) => { el.textContent = c.total; });

  /* ---------- time scrubber: exponential 1x → 4096x ---------- */
  let heldRate = null;
  function sliderToRate(v) { return Math.round(Math.pow(4096, v / 100)); }
  function applyRate(r) {
    sky.setRate(r);
    els.rateLabel.textContent = r === 0 ? 'HELD' : '×' + r.toLocaleString('en-US');
    els.slider.setAttribute('aria-valuetext', r === 0 ? 'held' : r + ' times real time');
    els.hold.textContent = r === 0 ? 'RESUME' : 'HOLD';
    els.hold.setAttribute('aria-pressed', r === 0 ? 'true' : 'false');
  }
  els.slider.addEventListener('input', () => {
    heldRate = null;
    applyRate(sliderToRate(+els.slider.value));
  });
  els.hold.addEventListener('click', () => {
    if (sky.getRate() === 0) {
      applyRate(heldRate ?? sliderToRate(+els.slider.value));
      heldRate = null;
    } else {
      heldRate = sky.getRate();
      applyRate(0);
    }
  });
  if (sky.isReduced()) {
    applyRate(0);
    els.hold.textContent = 'RESUME';
  } else {
    els.slider.value = String(Math.round((Math.log(60) / Math.log(4096)) * 100)); // 60×
    applyRate(60);
  }

  /* ---------- catalog card ---------- */
  let cardVisible = false;
  function positionCard(x, y) {
    const heroRect = els.hero.getBoundingClientRect();
    const cw = els.card.offsetWidth, ch = els.card.offsetHeight;
    let cx = x + 18, cy = y - ch / 2;
    if (cx + cw > heroRect.width - 12) cx = x - cw - 18;
    cy = Math.max(64, Math.min(cy, heroRect.height - ch - 96));
    els.card.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px)`;
  }
  function showCard(o, x, y) {
    const per = Math.round(o.altKm * (1 - o.ecc));
    const apo = Math.round(o.altKm * (1 + o.ecc) + (o.ecc * 6371));
    els.card.innerHTML = `
      <div class="cc-head">
        <span class="cc-id">${o.id}</span>
        <span class="cc-type cc-type--${o.type === 'PAY' ? 'pay' : 'deb'}">${o.type === 'PAY' ? 'PAYLOAD' : o.type === 'R/B' ? 'ROCKET BODY' : 'DEBRIS'}</span>
      </div>
      <div class="cc-name">${o.name}</div>
      <dl class="cc-grid">
        <div><dt>INT'L DES</dt><dd>${o.intl}</dd></div>
        <div><dt>REGIME</dt><dd>${o.shell}</dd></div>
        <div><dt>PERIGEE</dt><dd>${per.toLocaleString('en-US')} KM</dd></div>
        <div><dt>APOGEE</dt><dd>${apo.toLocaleString('en-US')} KM</dd></div>
        <div><dt>INCL</dt><dd>${o.incl.toFixed(1)}°</dd></div>
        <div><dt>PERIOD</dt><dd>${(o.period / 60).toFixed(1)} MIN</dd></div>
        <div><dt>RCS</dt><dd>${o.rcs} M²</dd></div>
        <div><dt>SINCE</dt><dd>${o.launched}</dd></div>
      </dl>
      <div class="cc-foot">
        <span>${o.origin}</span>
        <span class="cc-status cc-status--${o.status === 'ACTIVE' ? 'ok' : 'warn'}">${o.status}</span>
      </div>`;
    els.card.classList.add('is-on');
    cardVisible = true;
    positionCard(x, y);
  }
  function hideCard() {
    if (!cardVisible) return;
    els.card.classList.remove('is-on');
    cardVisible = false;
  }

  /* ---------- conjunction UI ---------- */
  let lastEv = null;
  let lastPaint = 0;
  let lastPaintPhase = '';
  let heroPhase = '';
  function onConjunction(ev) {
    lastEv = ev;
    /* while a slew ramp runs the chip owns its own "SLEWING" copy */
    if (sky.isSlewing && sky.isSlewing()) return;
    /* throttle DOM writes — this runs every frame from the render loop */
    const now = performance.now();
    if (ev.phase === lastPaintPhase && now - lastPaint < 350) return;
    lastPaint = now;
    lastPaintPhase = ev.phase;

    /* the alert propagates through the whole console: frame, vignette, status */
    if (ev.phase !== heroPhase) {
      heroPhase = ev.phase;
      els.hero.dataset.conj = ev.phase.toLowerCase();
      if (ev.phase === 'ALERT') {
        els.status.classList.add('is-alert');
        els.statusText.textContent = 'CONJUNCTION';
      } else {
        els.status.classList.remove('is-alert');
        els.statusText.textContent = ev.phase === 'RESOLVED' ? 'STAND-DOWN' : 'TRACKING';
      }
    }

    const { phase, sepKm, dt, predMissKm, a, b, relVelKmS } = ev;
    const pairLabel = `${a.id} × ${b.id}`;
    const canSlew = (phase === 'IDLE' || phase === 'WATCH') && dt > 420 && sky.getRate() > 0;

    if (phase === 'IDLE' || phase === 'WATCH') {
      els.conjChip.dataset.state = phase === 'WATCH' ? 'watch' : 'idle';
      els.conjChip.disabled = !canSlew;
      els.conjChip.innerHTML =
        `<span class="chip-k">${phase === 'WATCH' ? 'CONJUNCTION WATCH' : 'NEXT CONJUNCTION'}</span>` +
        `<span class="chip-v">T−${fmtHMS(dt)}</span>` +
        `<span class="chip-d">${pairLabel} · PRED. MISS ${fmtKm(predMissKm)}</span>` +
        (canSlew ? `<span class="chip-hint">SLEW TO T−06:00 →</span>` : '');
    } else {
      els.conjChip.disabled = true;
    }

    const showAlert = phase === 'ALERT' || phase === 'RESOLVED';
    els.alert.classList.toggle('is-on', showAlert);
    els.alert.dataset.state = phase.toLowerCase();
    if (showAlert) {
      if (phase === 'ALERT') {
        els.alertTitle.textContent = 'CONJUNCTION ALERT';
        els.alertBody.innerHTML =
          `<div class="al-row al-row--pair"><span>${a.name}</span><em>×</em><span>${b.name}</span></div>` +
          `<div class="al-row"><span class="al-k">RANGE</span><span class="al-v">${fmtKm(sepKm)}</span>` +
          `<span class="al-k">PRED. MISS</span><span class="al-v">${fmtKm(predMissKm)}</span>` +
          `<span class="al-k">T−TCA</span><span class="al-v">${fmtHMS(dt)}</span>` +
          `<span class="al-k">REL VEL</span><span class="al-v">${relVelKmS.toFixed(2)} KM/S</span></div>`;
      } else {
        els.alertTitle.textContent = 'STANDING DOWN';
        els.alertBody.innerHTML =
          `<div class="al-row al-row--pair"><span>${a.name}</span><em>×</em><span>${b.name}</span></div>` +
          `<div class="al-row"><span class="al-k">SEPARATION</span><span class="al-v">${fmtKm(sepKm)} ↑</span>` +
          `<span class="al-k">CLOSEST</span><span class="al-v">${fmtKm(predMissKm)}</span>` +
          `<span class="al-k">STATUS</span><span class="al-v">PASSED CLEAR</span></div>`;
      }
      els.conjChip.dataset.state = phase === 'ALERT' ? 'alert' : 'resolved';
      els.conjChip.innerHTML =
        `<span class="chip-k">${phase === 'ALERT' ? 'ALERT' : 'STAND-DOWN'}</span>` +
        `<span class="chip-v">${fmtKm(sepKm)}</span>` +
        `<span class="chip-d">${pairLabel}</span>`;
    }
  }

  /* chip click → slew orbital time to six minutes before the event */
  els.conjChip.addEventListener('click', () => {
    if (!lastEv || els.conjChip.disabled) return;
    if (lastEv.phase === 'IDLE' || lastEv.phase === 'WATCH') {
      sky.slewTo(sky.getSimT() + lastEv.dt - 360);
      if (!sky.isReduced()) {
        els.conjChip.disabled = true;
        els.conjChip.dataset.state = 'watch';
        els.conjChip.innerHTML =
          '<span class="chip-k">SLEWING</span>' +
          '<span class="chip-v">T−00:06:00</span>' +
          '<span class="chip-d">RATE RAMP · ON APPROACH</span>';
      }
    }
  });

  /* ---------- boot sequence ---------- */
  const bootLine = $('#boot-line');
  function boot() {
    const seq = ['.hud-top', '.hud-rail', '.hero-title-block', '.hud-console'];
    if (sky.isReduced()) {
      seq.forEach((s) => document.querySelectorAll(s).forEach((el) => el.classList.add('is-armed')));
      bootLine.textContent = `CATALOG LOCKED · ${c.total} OBJECTS`;
      document.body.classList.add('is-booted');
      return;
    }
    seq.forEach((sel, i) => {
      setTimeout(() => {
        document.querySelectorAll(sel).forEach((el) => el.classList.add('is-armed'));
      }, 350 + i * 260);
    });
    const msg = `ACQUIRING CATALOG ··· ${c.total} OBJECTS ··· TRACK LOCK`;
    let i = 0;
    const type = setInterval(() => {
      i += 2;
      bootLine.textContent = msg.slice(0, i);
      if (i >= msg.length) {
        clearInterval(type);
        setTimeout(() => { bootLine.classList.add('is-dim'); }, 1600);
      }
    }, 28);
    setTimeout(() => document.body.classList.add('is-booted'), 400);
  }
  boot();

  return {
    onTick(simT) {
      els.simElapsed.textContent = 'T+' + fmtSimElapsed(simT);
    },
    onHover(o, x, y) {
      if (!o) { hideCard(); return; }
      showCard(o, x, y);
    },
    onHoverMove(x, y) {
      if (cardVisible) positionCard(x, y);
    },
    onConjunction,
  };
}

/* TEMBLOR — the 1989 replay. Physically correct arrival timing:
   R = sqrt(42.3² + 9.2²) = 43.28 km, α = 6.1 km/s → tP = 7.10 s,
   β = 3.55 km/s → tS = 12.19 s. The page itself shakes with the S wave. */

export const EPI_KM   = 42.3;
export const DEPTH_KM = 9.2;
export const R_KM     = Math.hypot(EPI_KM, DEPTH_KM);   // 43.29
export const VP       = 6.1;
export const VS       = 3.55;
export const T_P      = R_KM / VP;                      // 7.097
export const T_S      = R_KM / VS;                      // 12.194
const CODA_END        = T_S + 24;

const fmt = (x, d = 1) => x.toFixed(d);

export class Replay {
  constructor(opts) {
    this.page    = opts.page;                 // shake target
    this.drum    = opts.drum;
    this.map     = opts.map || null;
    this.hud     = opts.hud;                  // {root, clock, phase, frontP, frontS}
    this.status  = opts.status;               // status <p> in the rail
    this.button  = opts.button;
    this.reduced = opts.reduced;
    this.onDone  = opts.onDone || null;
    this.onAlert = opts.onAlert || null;      // topbar state fn(bool)

    this.active = false;
    this.t0 = 0;
    this.phS = Math.random() * 6.28;

    // register with drum
    this.drum.eventSource = (tWall) => this.signal(tWall);
    this._tick = this._tick.bind(this);
  }

  trigger() {
    if (this.active) return;
    this.active = true;
    this.t0 = this.drum.now();          // drum-op time of origin
    this.wall0 = performance.now();
    this.pDone = false; this.sDone = false;
    this._lastStatus = null;
    this.button.disabled = true;
    this.button.classList.add('is-running');
    this.page.classList.add('is-quaking');
    this.button.querySelector('.btn-line').textContent = 'PLAYBACK RUNNING…';
    this.hud.root.hidden = false;
    if (this.onAlert) this.onAlert(true);
    if (this.map) this.map.startReplay();
    requestAnimationFrame(this._tick);
  }

  /* drum feed — px units, wall-time seconds since drum start */
  signal(tWall) {
    if (!this.active) return null;
    const te = tWall - this.t0;
    if (te < 0 || te > CODA_END) return null;
    const lh = this.drum.lineHeight || 56;
    let v = 0;

    if (te >= T_P) {
      const tp = te - T_P;
      const env = (1 - Math.exp(-tp / 0.18)) * Math.exp(-tp / 3.4);
      v += lh * 0.34 * env * (Math.sin(2 * Math.PI * 7.3 * te)
           + 0.55 * Math.sin(2 * Math.PI * 10.1 * te + 1.3));
    }
    if (te >= T_S) {
      const ts = te - T_S;
      const env = (1 - Math.exp(-ts / 0.33)) * Math.exp(-ts / 3.6);
      v += lh * 1.5 * env * (Math.sin(2 * Math.PI * 2.25 * te + this.phS)
           + 0.7 * Math.sin(2 * Math.PI * 3.4 * te + 2.1)
           + 0.35 * Math.sin(2 * Math.PI * 1.3 * te + 0.7));
      // long-period coda tail
      v += lh * 0.5 * Math.exp(-ts / 9) * Math.sin(2 * Math.PI * 0.55 * te + 1.9) * Math.min(1, ts / 2);
    }

    let phase = null;
    if (te >= T_S) phase = (te < T_S + 10) ? 's' : (te < CODA_END - 4 ? 'coda' : null);
    else if (te >= T_P) phase = 'p';
    if (phase === 'coda') phase = null; // coda returns to ink
    return { v, phase };
  }

  /* page shake — true envelope */
  _shakeOffset(te) {
    let x = 0, y = 0, rot = 0;
    if (te >= T_P && te < T_S + 2) {
      const tp = te - T_P;
      const env = (1 - Math.exp(-tp / 0.1)) * Math.exp(-tp / 1.6);
      y += 1.7 * env * Math.sin(2 * Math.PI * 9.5 * te);
      x += 0.8 * env * Math.sin(2 * Math.PI * 11.2 * te + 0.9);
    }
    if (te >= T_S) {
      const ts = te - T_S;
      const env = (1 - Math.exp(-ts / 0.28)) * Math.exp(-ts / 3.1);
      const A = 15 * env;
      x += A * Math.sin(2 * Math.PI * 2.3 * te + this.phS);
      y += A * 0.72 * Math.sin(2 * Math.PI * 3.15 * te + 1.4);
      rot = 0.0016 * A * Math.sin(2 * Math.PI * 1.65 * te);
    }
    return { x, y, rot };
  }

  _tick(now) {
    if (!this.active) return;
    const te = (now - this.wall0) / 1000;

    /* HUD */
    this.hud.clock.textContent = 'T + ' + te.toFixed(2).padStart(5, '0') + ' s';
    const rP = VP * te, rS = VS * te;
    const surfP = rP > DEPTH_KM ? Math.sqrt(rP * rP - DEPTH_KM * DEPTH_KM) : 0;
    const surfS = rS > DEPTH_KM ? Math.sqrt(rS * rS - DEPTH_KM * DEPTH_KM) : 0;
    this.hud.frontP.style.left = Math.min(100, (rP / R_KM) * 100) + '%';
    this.hud.frontS.style.left = Math.min(100, (rS / R_KM) * 100) + '%';

    // rail status is role="status": whole-second countdowns, written only on
    // change, so screen readers hear ~1 announcement/s instead of every frame
    let phaseTxt, statusTxt, statusCls = '';
    if (te < T_P) {
      phaseTxt = `P WAVEFRONT ${fmt(Math.max(0, R_KM - rP))} KM FROM STATION · ARRIVES T+${fmt(T_P, 2)} s`;
      statusTxt = `RUPTURE AT CERRO COLORADO\nP WAVE INBOUND · ${Math.ceil(Math.max(0, T_P - te))} s`;
      statusCls = 'is-p';
    } else if (te < T_S) {
      phaseTxt = `P ON STATION — SHARP KNOCK · S WAVEFRONT ${fmt(Math.max(0, R_KM - rS))} KM OUT`;
      statusTxt = `P ARRIVED +${fmt(T_P, 2)} s\nS WAVE INBOUND · ${Math.ceil(Math.max(0, T_S - te))} s`;
      statusCls = 'is-p';
    } else if (te < T_S + 10) {
      const pgv = 8.4 * Math.exp(-(te - T_S) / 3.1);
      phaseTxt = `S WAVES ON STATION · GROUND VELOCITY ${fmt(Math.max(0.1, pgv))} cm/s`;
      statusTxt = `S ARRIVED +${fmt(T_S, 2)} s\nPEN CLIPPING · ENVELOPE DECAYING`;
      statusCls = 'is-s';
    } else if (te < CODA_END) {
      phaseTxt = 'CODA DECAYING · SCATTERED ENERGY RINGING IN THE CRUST';
      statusTxt = 'CODA · RETURNING TO MICROSEISM';
      statusCls = 'is-s';
    }
    if (phaseTxt) this.hud.phase.textContent = phaseTxt;
    if (statusTxt && statusTxt !== this._lastStatus) {
      this._lastStatus = statusTxt;
      this.status.textContent = statusTxt;
      this.status.classList.remove('is-p', 'is-s');
      if (statusCls) this.status.classList.add(statusCls);
    }

    /* map wavefronts */
    if (this.map) this.map.setWavefronts(surfP, surfS, te);

    /* page shake */
    if (!this.reduced) {
      const { x, y, rot } = this._shakeOffset(te);
      if (Math.abs(x) + Math.abs(y) > 0.05) {
        this.page.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(4)}rad)`;
      } else {
        this.page.style.transform = '';
      }
    }

    if (te >= CODA_END) { this._finish(); return; }
    requestAnimationFrame(this._tick);
  }

  _finish() {
    this.active = false;
    this.page.style.transform = '';
    this.page.classList.remove('is-quaking');
    this.hud.root.hidden = true;
    if (this.map) this.map.endReplay();
    if (this.onAlert) this.onAlert(false);
    this.button.disabled = false;
    this.button.classList.remove('is-running');
    this.button.querySelector('.btn-line').textContent = 'REPLAY — 1989 M 6.7';
    this.status.textContent = 'RECORD COMPLETE · M 6.7 ASSIGNED · DRUM ARMED';
    this.status.classList.remove('is-p', 'is-s');
    if (this.onDone) this.onDone();
  }
}

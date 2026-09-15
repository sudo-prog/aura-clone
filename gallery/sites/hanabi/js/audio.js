/* HANABI — the sound of the show, synthesized. Off until asked for.
   Mortar pom at launch; the break arrives late, the way it does across water;
   kamuro and kiku crackle as they hang. All WebAudio, no samples. */
(() => {
  'use strict';

  const btn = document.getElementById('sound-toggle');
  if (!btn) return;

  let ac = null, master = null, noise = null, on = false;

  function ensure() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 18;
    comp.ratio.value = 7;
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(comp);
    comp.connect(ac.destination);
    // one shared noise buffer
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function pom(cal) {
    if (!on || !ac) return;
    const t0 = ac.currentTime + 0.02;
    const src = ac.createBufferSource();
    src.buffer = noise;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, t0);
    lp.frequency.exponentialRampToValueAtTime(70, t0 + 0.16);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.10 + cal * 0.006, t0);
    g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.22);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t0, Math.random() * 1.2, 0.3);
  }

  function boom(type, cal) {
    if (!on || !ac) return;
    const t0 = ac.currentTime + 0.24 + cal * 0.015; // sound lags the light
    const big = cal / 12;
    // chest thump
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(84 - cal * 2.4, t0);
    o.frequency.exponentialRampToValueAtTime(30, t0 + 0.5 + big * 0.25);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.34 + big * 0.3, t0 + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.8 + big * 0.5);
    o.connect(og); og.connect(master);
    o.start(t0); o.stop(t0 + 1.6);
    // air body
    const src = ac.createBufferSource();
    src.buffer = noise;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520 + big * 260, t0);
    lp.frequency.exponentialRampToValueAtTime(55, t0 + 0.7 + big * 0.4);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(0.30 + big * 0.22, t0 + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.9 + big * 0.5);
    src.connect(lp); lp.connect(ng); ng.connect(master);
    src.start(t0, Math.random() * 0.9, 1.4);
    // hanging crackle for the tailed shells
    if (type === 'kiku' || type === 'kamuro' || type === 'shirogiku') {
      const cs = ac.createBufferSource();
      cs.buffer = noise;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3300;
      bp.Q.value = 0.7;
      const cg = ac.createGain();
      const dur = type === 'kamuro' ? 2.6 : 1.3;
      cg.gain.setValueAtTime(0.0001, t0 + 0.1);
      cg.gain.exponentialRampToValueAtTime(0.045 + big * 0.03, t0 + 0.35);
      cg.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
      cs.connect(bp); bp.connect(cg); cg.connect(master);
      cs.start(t0 + 0.1, Math.random() * 0.4, dur);
    }
  }

  addEventListener('hanabi:launch', e => pom(e.detail.cal));
  addEventListener('hanabi:burst', e => boom(e.detail.type, e.detail.cal));

  btn.addEventListener('click', () => {
    ensure();
    if (!ac) return;
    on = !on;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(on ? 0.5 : 0, t + 0.4);
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
  });
})();

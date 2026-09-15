/* LIDO SOLARE — La Torre.
   Scroll-scrubbed 10 m dive: the silhouette leaves the board, pikes,
   straightens, enters the water; a dotted trajectory appears just ahead
   of him; splash rings ride out. Scroll back and time reverses.
   The composition re-frames itself for portrait screens. */
(function () {
  'use strict';

  var scene = document.getElementById('diveScene');
  if (!scene || typeof gsap === 'undefined') return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var svgns = 'http://www.w3.org/2000/svg';

  /* ---- ladder rungs ---- */
  var rungs = document.getElementById('rungs');
  if (rungs) {
    var rfrag = '';
    for (var y = 220; y <= 840; y += 34) {
      rfrag += '<line x1="158" y1="' + y + '" x2="176" y2="' + y + '"/>';
    }
    rungs.innerHTML = rfrag;
  }

  /* ---- spray droplets ---- */
  var spray = document.getElementById('spray');
  var drops = [];
  if (spray) {
    var sfrag = '';
    for (var i = 0; i < 10; i++) {
      var r = 4 + (i % 3) * 2.4;
      sfrag += '<circle cx="760" cy="848" r="' + r + '" opacity="0"/>';
    }
    spray.innerHTML = sfrag;
    drops = Array.prototype.slice.call(spray.querySelectorAll('circle'));
  }

  /* ---- underwater ghost + bubbles ---- */
  var underGhost = document.getElementById('underGhost');
  var bubblesG = document.getElementById('bubbles');
  var bubbles = [];
  if (bubblesG) {
    var bfrag = '';
    for (var b = 0; b < 7; b++) {
      bfrag += '<circle cx="0" cy="0" r="' + (2.2 + (b % 3) * 1.4) + '" opacity="0"/>';
    }
    bubblesG.innerHTML = bfrag;
    bubbles = Array.prototype.slice.call(bubblesG.querySelectorAll('circle'));
  }

  var inner = document.getElementById('diverInner');
  var tower = document.getElementById('tower');
  var splash = document.getElementById('splash');
  var hint = document.querySelector('.torre__hint');
  var poses = {
    stand: document.getElementById('poseStand'),
    launch: document.getElementById('poseLaunch'),
    pike: document.getElementById('posePike'),
    entry: document.getElementById('poseEntry')
  };

  /* ---- trajectory dots (built in JS, placed along the bezier) ---- */
  var DOTN = 24;
  var dotsGroup = document.createElementNS(svgns, 'g');
  dotsGroup.setAttribute('fill', '#F7F3E9');
  scene.insertBefore(dotsGroup, document.getElementById('diver'));
  var dots = [];
  for (var d = 0; d < DOTN; d++) {
    var c = document.createElementNS(svgns, 'circle');
    c.setAttribute('r', '3.2');
    c.setAttribute('opacity', '0');
    dotsGroup.appendChild(c);
    dots.push(c);
  }

  /* ---- composition: wide vs compact (portrait) ---- */
  var P0, P1, P2, P3;
  var compact = null;

  function bez(t) {
    var mt = 1 - t;
    return {
      x: mt * mt * mt * P0.x + 3 * mt * mt * t * P1.x + 3 * mt * t * t * P2.x + t * t * t * P3.x,
      y: mt * mt * mt * P0.y + 3 * mt * mt * t * P1.y + 3 * mt * t * t * P2.y + t * t * t * P3.y
    };
  }

  function bezTangent(t) {
    var mt = 1 - t;
    var dx = 3 * mt * mt * (P1.x - P0.x) + 6 * mt * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
    var dy = 3 * mt * mt * (P1.y - P0.y) + 6 * mt * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  function configure() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var wantW = Math.round(1000 * vw / vh);
    var isCompact = wantW < 1300;
    if (isCompact === compact) return false;
    compact = isCompact;

    if (compact) {
      var W = Math.max(462, Math.min(1299, wantW));
      scene.setAttribute('viewBox', '0 0 ' + W + ' 1000');
      /* smaller tower, seated on the water line, dive down the middle */
      tower.setAttribute('transform', 'translate(-75,331) scale(0.61)');
      splash.setAttribute('transform', 'translate(-408,0)');
      P0 = { x: 235, y: 439 };
      P1 = { x: 290, y: 250 };
      P2 = { x: 360, y: 560 };
      P3 = { x: 352, y: 950 };
    } else {
      scene.setAttribute('viewBox', '0 0 1600 1000');
      tower.removeAttribute('transform');
      splash.removeAttribute('transform');
      P0 = { x: 508, y: 178 };
      P1 = { x: 610, y: 40 };
      P2 = { x: 745, y: 300 };
      P3 = { x: 760, y: 950 };
    }

    /* re-seat trajectory dots along the new arc */
    for (var i = 0; i < DOTN; i++) {
      var p = bez((i + 1) / DOTN);
      dots[i].setAttribute('cx', p.x);
      dots[i].setAttribute('cy', Math.min(p.y, 838));
    }
    return true;
  }

  function setPose(name) {
    for (var k in poses) {
      if (poses[k]) poses[k].style.opacity = (k === name) ? 1 : 0;
    }
  }

  function place(x, y, rot) {
    inner.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(' + rot + ')');
  }

  function renderFlight(f) {
    if (f <= 0.001) {
      place(P0.x, P0.y, 0);
      setPose('stand');
      return;
    }
    var p = bez(f);
    var rot;
    if (f < 0.26) {
      setPose('launch');
      rot = gsap.utils.mapRange(0, 0.26, -8, 26, f);
    } else if (f < 0.6) {
      setPose('pike');
      rot = gsap.utils.mapRange(0.26, 0.6, 0, 55, f);
    } else {
      setPose('entry');
      rot = bezTangent(f) - 90; /* entry pose is drawn head-down */
    }
    place(p.x, p.y, rot);
  }

  function renderTraj(f, s) {
    /* the arc fades away once the splash takes over — no debris in the sky */
    var kill = 1 - Math.min(1, (s || 0) * 1.6);
    for (var i = 0; i < DOTN; i++) {
      var appear = (i + 1) / DOTN;
      var vis = (f * 1.18 >= appear ? 0.8 : 0) * kill;
      dots[i].setAttribute('opacity', vis);
    }
  }

  var rings = Array.prototype.slice.call(document.querySelectorAll('#rings .ring'));
  var plume = document.getElementById('plume');

  function renderSplash(s) {
    rings.forEach(function (ring, idx) {
      var local = gsap.utils.clamp(0, 1, (s - idx * 0.16) / 1.08);
      var rx = 10 + local * (250 + idx * 95);
      var ry = 3 + local * (13 + idx * 5);
      ring.setAttribute('rx', rx);
      ring.setAttribute('ry', ry);
      ring.style.opacity = local > 0.004 ? Math.max(0, (1 - local)) * 0.8 : 0;
    });
    if (plume) {
      var up = s < 0.38 ? s / 0.38 : 1 - (s - 0.38) / 0.62 * 0.9;
      var sy = Math.max(0.001, up);
      plume.style.opacity = s > 0.02 ? Math.min(1, sy * 1.5) : 0;
      plume.setAttribute('transform', 'translate(0 ' + (850 * (1 - sy)) + ') scale(1 ' + sy + ')');
    }
    drops.forEach(function (dEl, idx) {
      var ang = (idx / drops.length) * Math.PI - Math.PI * 0.05;
      var speed = 130 + (idx % 4) * 55;
      var local = gsap.utils.clamp(0, 1, s * 1.5 - idx * 0.03);
      var dx = Math.cos(ang) * speed * local * (idx % 2 ? 1 : -1);
      var dy = -Math.sin(ang) * speed * local * 1.25 + 190 * local * local;
      dEl.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
      dEl.style.opacity = local > 0.004 && local < 0.85 ? (1 - local) * 0.95 : 0;
    });

    /* the pale figure keeps going, decelerating into la fossa */
    if (underGhost) {
      var g = gsap.utils.clamp(0, 1, (s - 0.3) / 0.7);
      if (g <= 0.001) {
        underGhost.setAttribute('opacity', 0);
      } else {
        var ge = 1 - Math.pow(1 - g, 3);
        var ty = 800 + ge * 130;
        var sway = Math.sin(g * 5) * 5;
        underGhost.setAttribute('transform', 'translate(' + (P3.x + sway) + ' ' + ty + ')');
        underGhost.setAttribute('opacity', Math.min(1, g * 5) * (1 - 0.62 * g) * 0.55);
      }
    }
    bubbles.forEach(function (bEl, idx) {
      var local = gsap.utils.clamp(0, 1, (s - 0.34 - idx * 0.05) / 0.5);
      if (local <= 0.001 || local >= 1) { bEl.style.opacity = 0; return; }
      var sy = 892 + (idx % 3) * 26;
      var by = sy - local * (sy - 852);
      var bx = P3.x + (idx - 3) * 7 + Math.sin(local * 9 + idx * 1.7) * 4;
      bEl.setAttribute('transform', 'translate(' + bx + ' ' + by + ')');
      bEl.style.opacity = Math.min(1, local * 6) * (1 - local * 0.75) * 0.85;
    });
  }

  configure();

  if (reduceMotion) {
    /* composed still: diver mid-pike at the apex, arc drawn, first ring faint */
    var apex = bez(0.32);
    setPose('pike');
    place(apex.x, apex.y, 10);
    renderTraj(1, 0);
    renderSplash(0.12);
    if (hint) hint.classList.add('is-hidden');
    window.addEventListener('resize', function () {
      if (configure()) {
        var a = bez(0.32);
        place(a.x, a.y, 10);
        renderTraj(1, 0);
        renderSplash(0.12);
      }
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var proxy = { flight: 0, splash: 0 };

  function renderAll() {
    renderFlight(proxy.flight);
    renderTraj(proxy.flight, proxy.splash);
    renderSplash(proxy.splash);
  }

  renderAll();

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#torre',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.9,
      onUpdate: function (self) {
        if (hint) hint.classList.toggle('is-hidden', self.progress > 0.06);
      }
    },
    defaults: { ease: 'none' }
  });

  /* 0–14%: he stands and considers his choices */
  tl.to(proxy, { flight: 0, duration: 0.14 });
  /* 14–72%: the dive (gravity easing) */
  tl.to(proxy, {
    flight: 1,
    duration: 0.58,
    ease: 'power1.in',
    onUpdate: renderAll,
    onReverseComplete: renderAll
  });
  /* the splash overlaps the entry */
  tl.to(proxy, {
    splash: 1,
    duration: 0.34,
    onUpdate: renderAll
  }, '-=0.10');

  window.addEventListener('resize', function () {
    if (configure()) renderAll();
  });

  /* pennant flutters gently, independent of scroll —
     paused whenever the torre is offscreen so no work runs out of view */
  var pennant = document.querySelector('#pennant path');
  if (pennant) {
    var flutter = gsap.to(pennant, {
      scaleX: 0.82,
      transformOrigin: '196px 144px',
      duration: 0.9,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      paused: true
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { flutter.play(); } else { flutter.pause(); }
      }, { threshold: 0.01 }).observe(scene);
    } else {
      flutter.play();
    }
  }
})();

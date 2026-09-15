/* LIDO SOLARE — page choreography: nav state, scroll reveals, depth gauge. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav: limewash bar once past the water ---- */
  var nav = document.getElementById('nav');
  var lastScrolled = null;

  function navState() {
    var s = window.scrollY > window.innerHeight * 0.72;
    if (s !== lastScrolled) {
      nav.classList.toggle('scrolled', s);
      lastScrolled = s;
    }
  }

  /* ---- scroll reveals ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- depth gauge: page depth = pool depth ----
     Calibrated to the section depth tiles: the marker reads 1,2 m at
     Il Lido, 2,2 m at the Regolamento, 3,4 m at the Tessere, 4,9 m at
     La Torre's pit, 5,0 m at the drain. */
  var gauge = document.getElementById('gauge');
  var marker = document.getElementById('gaugeMarker');
  var label = document.getElementById('gaugeLabel');
  var torre = document.getElementById('torre');
  var MAXD = 5.0;
  var anchors = [[0, 0]];

  function buildAnchors() {
    var doc = document.documentElement;
    var maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    var defs = [['lido', 1.2], ['regolamento', 2.2], ['tessere', 3.4], ['torre', 4.9]];
    anchors = [[0, 0]];
    var prev = 0;
    defs.forEach(function (d) {
      var el = document.getElementById(d[0]);
      if (!el) return;
      var y = Math.min(maxScroll - 1, Math.max(prev + 1, el.offsetTop - window.innerHeight * 0.38));
      anchors.push([y, d[1]]);
      prev = y;
    });
    anchors.push([maxScroll, MAXD]);
  }

  function depthAt(y) {
    for (var i = 1; i < anchors.length; i++) {
      if (y <= anchors[i][0]) {
        var a = anchors[i - 1], b = anchors[i];
        var f = (y - a[0]) / Math.max(1, b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, f));
      }
    }
    return MAXD;
  }

  function gaugeState() {
    if (!gauge || !marker) return;
    var depth = depthAt(window.scrollY);
    marker.style.setProperty('--gy', (depth / MAXD * marker.parentElement.clientHeight) + 'px');
    if (label) label.textContent = depth.toFixed(1).replace('.', ',') + ' m';

    /* the gauge surfaces once you leave the water */
    gauge.classList.toggle('past-hero', window.scrollY > window.innerHeight * 0.55);

    /* white gauge over the cobalt sky */
    if (torre) {
      var r = torre.getBoundingClientRect();
      var mid = window.innerHeight * 0.5;
      gauge.classList.toggle('on-sky', r.top < mid && r.bottom > mid);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      navState();
      gaugeState();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { buildAnchors(); onScroll(); }, { passive: true });
  window.addEventListener('load', function () { buildAnchors(); gaugeState(); });
  buildAnchors();
  navState();
  gaugeState();

  /* ---- the thermometer wobbles, like real thermometers do ---- */
  var temp = document.querySelector('.nav__temp');
  if (temp) {
    setInterval(function () {
      temp.textContent = 'ACQUA 26,5°';
      setTimeout(function () { temp.textContent = 'ACQUA 26,4°'; }, 4200);
    }, 26000);
  }
})();

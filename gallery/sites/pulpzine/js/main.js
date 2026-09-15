/* PULP #7 — NIGHT SHIFT · press operator script (no libraries) */
(function () {
  'use strict';

  var docEl = document.documentElement;
  docEl.classList.add('js');

  var motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionMQ.matches;

  /* ── tab visibility: pause ambient animation ─────────────────── */
  document.addEventListener('visibilitychange', function () {
    docEl.classList.toggle('tab-hidden', document.hidden);
  });

  /* ── ticker: duplicate the run once for a seamless loop ──────── */
  var track = document.getElementById('tickerTrack');
  if (track) {
    var set = track.querySelector('.tk-set');
    var clone = set.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    // speed proportional to length: ~85 px/s (re-measured once real fonts land)
    var setTickerSpeed = function () {
      var setWidth = track.scrollWidth / 2;
      track.style.setProperty('--roll-dur', Math.max(30, Math.round(setWidth / 85)) + 's');
    };
    setTickerSpeed();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setTickerSpeed);
  }

  /* ── the press: two-drum print choreography ──────────────────── */
  var masthead = document.querySelector('.masthead');
  var pressTimers = [];

  function clearPress() {
    if (!masthead) return;
    pressTimers.forEach(clearTimeout);
    pressTimers = [];
    masthead.classList.remove('printing', 'p1', 'p2', 'done');
  }

  function runPress() {
    if (reduceMotion || !masthead) return;
    clearPress();
    // force reflow so re-runs restart animations
    masthead.classList.add('printing');
    void masthead.offsetWidth;
    pressTimers.push(setTimeout(function () { masthead.classList.add('p1'); }, 250));   // blue drum
    pressTimers.push(setTimeout(function () { masthead.classList.add('p2'); }, 1400));  // pink drum
    pressTimers.push(setTimeout(function () { masthead.classList.add('done'); }, 2500)); // hand work
    pressTimers.push(setTimeout(function () {
      masthead.classList.remove('printing', 'p1', 'p2');
    }, 4600));
  }

  runPress();

  var replay = document.getElementById('replayBtn');
  if (replay) {
    replay.hidden = reduceMotion; // no press show under reduced motion — no dead button
    replay.addEventListener('click', function () {
      if (reduceMotion) return;
      runPress();
    });
  }

  /* ── scroll reveals ───────────────────────────────────────────── */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── the shelf: snap, drag, arrows, position readout ─────────── */
  var shelf = document.getElementById('shelf');
  var posEl = document.getElementById('shelfPos');
  var spreads = shelf ? Array.prototype.slice.call(shelf.querySelectorAll('.spread')) : [];
  var folios = ['PP. 2–3', 'PP. 4–5', 'PP. 8–9', 'PP. 12–13', 'PP. 16–17', 'PP. 20–21', 'PP. 22–23', 'P. 24'];

  function currentIndex() {
    var mid = shelf.scrollLeft + shelf.clientWidth / 2;
    var best = 0, bestDist = Infinity;
    spreads.forEach(function (sp, i) {
      var c = sp.offsetLeft + sp.offsetWidth / 2;
      var d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function updatePos() {
    if (!posEl) return;
    var i = currentIndex();
    posEl.textContent = (folios[i] || '—') + ' OF 24';
  }

  function goTo(i) {
    i = Math.max(0, Math.min(spreads.length - 1, i));
    var sp = spreads[i];
    var target = sp.offsetLeft + sp.offsetWidth / 2 - shelf.clientWidth / 2;
    shelf.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  if (shelf) {
    var posTick = null;
    shelf.addEventListener('scroll', function () {
      if (posTick) return;
      posTick = setTimeout(function () { posTick = null; updatePos(); }, 80);
    }, { passive: true });
    updatePos();

    document.getElementById('shelfPrev').addEventListener('click', function () { goTo(currentIndex() - 1); });
    document.getElementById('shelfNext').addEventListener('click', function () { goTo(currentIndex() + 1); });

    /* drag to flip through */
    var dragging = false, dragStartX = 0, dragStartScroll = 0, moved = false;
    shelf.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return; // touch scrolls natively
      dragging = true; moved = false;
      dragStartX = e.clientX;
      dragStartScroll = shelf.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 6 && !moved) {
        moved = true;
        shelf.classList.add('dragging');
        if (window.getSelection) window.getSelection().removeAllRanges();
      }
      if (moved) shelf.scrollLeft = dragStartScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        shelf.classList.remove('dragging');
        goTo(currentIndex()); // settle onto the nearest spread
      }
    });

    /* keyboard on the shelf region */
    shelf.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex() - 1); }
    });
  }

  /* card links → scroll the shelf to the right spread */
  Array.prototype.forEach.call(document.querySelectorAll('.card-link'), function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('data-spread');
      var idx = spreads.findIndex(function (sp) { return sp.id === id; });
      if (idx < 0 || !shelf) return;
      e.preventDefault();
      document.getElementById('spreads').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { goTo(idx); }, reduceMotion ? 0 : 450);
    });
  });

  /* ── touch = the hand on the page ("rest a hand… " means it) ─── */
  Array.prototype.forEach.call(document.querySelectorAll('.card, .spread'), function (el) {
    var offT = null;
    el.addEventListener('touchstart', function () {
      clearTimeout(offT);
      el.classList.add('reg');
    }, { passive: true });
    el.addEventListener('touchend', function () {
      clearTimeout(offT);
      offT = setTimeout(function () { el.classList.remove('reg'); }, 900);
    });
    el.addEventListener('touchcancel', function () {
      clearTimeout(offT);
      el.classList.remove('reg');
    });
  });

  /* ── press drift: fast scrolling shakes the registration ─────── */
  var driftNow = 1, driftTarget = 1, driftRaf = null;
  var lastY = window.pageYOffset, lastT = performance.now();
  function stopDrift() {
    if (driftRaf) { cancelAnimationFrame(driftRaf); driftRaf = null; }
    driftNow = 1; driftTarget = 1;
    docEl.style.setProperty('--drift', '1');
  }
  var driftTick = function () {
    driftTarget = Math.max(1, driftTarget - 0.045);       // press settles
    driftNow += (driftTarget - driftNow) * 0.14;
    docEl.style.setProperty('--drift', driftNow.toFixed(3));
    if (driftTarget > 1 || Math.abs(driftNow - 1) > 0.012) {
      driftRaf = requestAnimationFrame(driftTick);
    } else {
      driftNow = 1;
      driftRaf = null;
      docEl.style.setProperty('--drift', '1');
    }
  };
  window.addEventListener('scroll', function () {
    if (reduceMotion) return;
    var y = window.pageYOffset, now = performance.now();
    var v = Math.abs(y - lastY) / Math.max(16, now - lastT); // px per ms
    lastY = y; lastT = now;
    driftTarget = Math.min(2.4, Math.max(driftTarget, 1 + v * 0.55));
    if (!driftRaf && !document.hidden) driftRaf = requestAnimationFrame(driftTick);
  }, { passive: true });

  /* ── looping decor sleeps while it can't be seen ──────────────── */
  if ('IntersectionObserver' in window) {
    var sleeper = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('asleep', !en.isIntersecting);
      });
    });
    var tickerBar = document.querySelector('.ticker');
    if (tickerBar) sleeper.observe(tickerBar);
    var centerfold = document.getElementById('spread-map');
    if (centerfold) sleeper.observe(centerfold);
  }

  /* ── honor live changes to the motion preference ──────────────── */
  function onMotionChange() {
    reduceMotion = motionMQ.matches;
    if (replay) replay.hidden = reduceMotion;
    if (reduceMotion) { clearPress(); stopDrift(); }
  }
  if (motionMQ.addEventListener) motionMQ.addEventListener('change', onMotionChange);
  else if (motionMQ.addListener) motionMQ.addListener(onMotionChange);

  /* ── mailing list (fictional, like everything else) ──────────── */
  var mailForm = document.getElementById('mailForm');
  if (mailForm) {
    mailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var done = document.getElementById('mailDone');
      done.hidden = false;
      mailForm.querySelector('.stamp-btn').disabled = true;
      mailForm.querySelector('.stamp-btn').style.opacity = '.45';
    });
  }
})();

/* ORIKATA — the page that folds.
   One master clock drives the crane; one observer drives every fold-in;
   one scrubber unfolds the letter. All motion is transform/opacity. */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");

  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ss = (u) => u * u * (3 - 2 * u); // smoothstep

  /* ============================================================
     Fold-into-view — the page grammar
     ============================================================ */
  const folds = [...document.querySelectorAll(".fold")];
  const openAllFolds = () => folds.forEach((f) => f.classList.add("open", "done"));

  /* A folded panel's transformed box hugs its top hinge, so intersection
     observers miss it after fast jumps. All folds hinge at the top, so
     rect.top is transform-stable — a plain scroll check is the honest tool. */
  let pending = folds.slice();
  function checkFolds() {
    if (!pending.length) return;
    const line = window.innerHeight * 0.88;
    pending = pending.filter((el) => {
      const top = el.getBoundingClientRect().top;
      if (top > line) return true;
      el.classList.add("open");
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--fd")) || 0;
      setTimeout(() => el.classList.add("done"), 1150 + d * 1000);
      return false;
    });
  }

  if (rm.matches) {
    openAllFolds();
    pending = [];
  } else {
    let foldRaf = false;
    const onScroll = () => {
      if (foldRaf) return;
      foldRaf = true;
      requestAnimationFrame(() => { foldRaf = false; checkFolds(); });
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    checkFolds();
  }

  /* ============================================================
     The crane — keyframe tracks on a 22 s loop
     ============================================================ */
  const stage = document.getElementById("craneStage");
  const letter = document.getElementById("letter");

  /* Chromium never repaints a composited 3D layer whose background image
     finishes decoding after the layer's first raster — the sheet's printed
     crease pattern would stay blank forever (transform/opacity changes are
     composite-only and don't help). Decode both sheet textures, then touch a
     paint-only property (transparent outline) on every textured face to force
     the one repaint that picks the decoded images up. */
  (() => {
    const uris = [];
    for (const sel of [".sh1-bot", ".sh2-right"]) {
      const m = getComputedStyle(stage.querySelector(sel))
        .backgroundImage.match(/url\("([^"]+)"/);
      if (m) uris.push(m[1]);
    }
    Promise.all(
      uris.map((u) => {
        const img = new Image();
        img.src = u;
        return img.decode().catch(() => {});
      })
    ).then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          stage
            .querySelectorAll(".sh1-bot, .sh1-flap .face, .sh2-right, .sh2-flap .face")
            .forEach((el) => { el.style.outline = "1px solid transparent"; });
        })
      )
    );
  })();

  const track = (keys) => (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, v0] = keys[i - 1];
        const [t1, v1] = keys[i];
        const u = ss((t - t0) / (t1 - t0));
        return v0 + (v1 - v0) * u;
      }
    }
    return keys[keys.length - 1][1];
  };

  const T = {
    f1:    track([[0.08, 0], [0.17, 180], [0.9748, 180], [0.999, 0]]),
    f2:    track([[0.20, 0], [0.29, 180], [0.9500, 180], [0.9746, 0]]),
    o1:    track([[0.1699, 1], [0.1701, 0], [0.9744, 0], [0.9746, 1]]),
    o2:    track([[0.1699, 0], [0.1701, 1], [0.2979, 1], [0.2981, 0],
                  [0.9478, 0], [0.9480, 1], [0.9744, 1], [0.9746, 0]]),
    oc:    track([[0.2979, 0], [0.2981, 1], [0.9478, 1], [0.9480, 0]]),
    bloom: track([[0.298, 0.62], [0.35, 1.06], [0.385, 1], [0.9, 1], [0.947, 0.62]]),
    lie:   track([[0.345, -90], [0.43, 6], [0.455, 0], [0.9, 0], [0.945, -90]]),
    splay: track([[0.43, 0], [0.53, 26], [0.87, 26], [0.906, 0]]),
    tail:  track([[0.44, 86], [0.54, 38], [0.87, 38], [0.906, 86]]),
    neck:  track([[0.50, -84], [0.60, -30], [0.868, -30], [0.902, -84]]),
    head:  track([[0.56, 0], [0.64, -108], [0.862, -108], [0.896, 0]]),
    wing:  track([[0.58, 0], [0.665, 74], [0.875, 74], [0.908, 0]]),
    env:   track([[0.67, 0], [0.72, 1], [0.83, 1], [0.87, 0]]),
    spin:  track([[0, -14], [0.3, -8], [0.42, -22], [0.66, -22], [0.84, 26], [0.92, 8], [1, -14]]),
    sdx:   track([[0.10, 0], [0.29, -58], [0.9746, -58], [0.999, 0]]),
    /* shadow follows the paper's footprint: left with the sheet during fold 1,
       back to centre as fold 2 stacks the paper over the origin */
    shx:   track([[0.10, 0], [0.185, -50], [0.29, 0],
                  [0.948, 0], [0.9746, -50], [0.999, 0]]),
    shs:   track([[0, 0.96], [0.3, 0.82], [0.45, 0.78], [0.9, 0.78], [0.95, 0.96]]),
    sha:   track([[0, 0.2], [0.3, 0.3], [0.45, 0.33], [0.9, 0.33], [0.95, 0.2]]),
  };

  const DUR = 22000;
  /* start just before the bloom: a visitor sees the bird form within the
     first seconds; the full sheet→fold narrative still plays every loop */
  let clock = 0.31 * DUR;
  let last = 0;
  let raf = null;
  let craneVisible = true;
  let letterNear = false;

  const setVar = (k, v) => stage.style.setProperty("--" + k, v);

  function pose(t, elapsedMs) {
    for (const k in T) {
      if (k === "env") continue;
      setVar(k, T[k](t));
    }
    const env = T.env(t);
    const ph = (elapsedMs / 1000) * Math.PI * 2 * 1.15;
    setVar("flap", env * 13 * Math.sin(ph));
    setVar("bob", env * -3.2 * Math.sin(ph));
  }

  function scrubLetter() {
    const r = letter.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.92 - r.top) / (vh * 0.85), 0, 1);
    const a2 = 176 * (1 - ss(clamp(p / 0.58, 0, 1)));
    const a3 = -176 * (1 - ss(clamp((p - 0.42) / 0.56, 0, 1)));
    letter.style.setProperty("--a2", a2);
    letter.style.setProperty("--a3", a3);
    letter.style.setProperty("--a3n", Math.abs(a3));
  }

  const shouldRun = () =>
    !rm.matches && !document.hidden && (craneVisible || letterNear);

  function loop(now) {
    raf = null;
    if (!shouldRun()) return;
    clock += now - last;
    last = now;
    if (craneVisible) pose((clock % DUR) / DUR, clock);
    if (letterNear) scrubLetter();
    raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (raf || !shouldRun()) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // ?t=0.75 freezes the loop at that phase (design verification aid)
  const fixedT = parseFloat(new URLSearchParams(location.search).get("t"));
  if (!Number.isNaN(fixedT)) {
    pose(fixedT % 1, fixedT * DUR);
  } else if (!rm.matches) {
    new IntersectionObserver(
      (es) => { craneVisible = es[0].isIntersecting; kick(); },
      { rootMargin: "60px" }
    ).observe(stage);

    new IntersectionObserver(
      (es) => { letterNear = es[0].isIntersecting; kick(); },
      { rootMargin: "25% 0px 25% 0px" }
    ).observe(letter);

    document.addEventListener("visibilitychange", kick);
    kick();
  }

  rm.addEventListener?.("change", () => {
    if (rm.matches) {
      openAllFolds();
      // CSS :root defaults are the finished pose — clear inline overrides
      stage.removeAttribute("style");
      letter.style.setProperty("--a2", 0);
      letter.style.setProperty("--a3", 0);
      letter.style.setProperty("--a3n", 0);
    } else {
      kick();
    }
  });

  /* ============================================================
     Schedule scroll cue — the right-edge fade lifts at the end
     ============================================================ */
  const sched = document.querySelector(".sched");
  const schedScroll = document.querySelector(".sched-scroll");
  if (sched && schedScroll) {
    const atEnd = () => {
      const scrollable = schedScroll.scrollWidth > schedScroll.clientWidth + 1;
      // only a tab stop while it actually scrolls (keyboard access to Seats/Price)
      if (scrollable) schedScroll.setAttribute("tabindex", "0");
      else schedScroll.removeAttribute("tabindex");
      sched.classList.toggle(
        "at-end",
        !scrollable ||
          schedScroll.scrollLeft + schedScroll.clientWidth >= schedScroll.scrollWidth - 4
      );
    };
    schedScroll.addEventListener("scroll", atEnd, { passive: true });
    addEventListener("resize", atEnd, { passive: true });
    atEnd();
  }

  /* ============================================================
     Basket + newsletter — small joys
     ============================================================ */
  const basket = document.getElementById("basket");
  const count = document.getElementById("basketCount");
  let items = 0;

  document.querySelectorAll(".btn-add").forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener("click", () => {
      items += 1;
      count.textContent = items;
      basket.classList.remove("bump");
      void basket.offsetWidth;
      basket.classList.add("bump");
      btn.classList.add("added");
      btn.textContent = "In the basket";
      setTimeout(() => {
        btn.classList.remove("added");
        btn.textContent = label;
      }, 1500);
    });
  });

  const form = document.getElementById("newsForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.innerHTML =
      '<p class="news-done">Folded in. The September pattern is yours.</p>';
  });
})();

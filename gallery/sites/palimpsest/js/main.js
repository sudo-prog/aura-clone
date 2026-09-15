/* ============================================================
   PALIMPSEST LAB — wavelength engine
   Maps λ (365–940 nm) onto layer opacities, ink chemistry,
   instrument readouts and the room's own light.
   ============================================================ */
(() => {
  "use strict";

  const html = document.documentElement;
  html.classList.add("js");

  const $ = (s) => document.querySelector(s);

  const slider = $("#lambdaSlider");
  const stage = $("#stage");
  const well = $(".well");
  const furn = $(".furniture");
  const els = {
    washUV: $("#washUV"),
    washIR: $("#washIR"),
    washVis: $("#washVis"),
    washIRgrey: $("#washIRgrey"),
    irGlow: $("#irGlow"),
    uvVignette: $("#uvVignette"),
    pageFluor: $("#pageFluor"),
    underGhost: $("#underGhost"),
    underFluor: $("#underFluor"),
    structure: $("#L-structure"),
    overtext: $("#L-over"),
    annoUV: $("#annoUV"),
    annoIR: $("#annoIR"),
    roLambda: $("#roLambda"),
    roBand: $("#roBand"),
    roSource: $("#roSource"),
    roBarrier: $("#roBarrier"),
    roExposure: $("#roExposure"),
    roLeg: $("#roLeg"),
    legFill: $("#legFill"),
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- boot choreography ---------- */
  const boot = () => html.classList.add("booted");
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(boot));
  }
  setTimeout(boot, 1800); // safety net

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;

  const hex2rgb = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const rgb2hex = (c) =>
    "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (h1, h2, t) => {
    const a = hex2rgb(h1), b = hex2rgb(h2);
    return rgb2hex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
  };

  const C = {
    vellum: "#E9DDC2",
    fluor: "#C8D6FF",
    madder: "#CF6A50",
    iron: "#3B2A16",
    ironUV: "#0B0916",
    ironIR: "#0D0601",
    well: "#0F0B07",
    wellUV: "#0C0920",
    wellIR: "#190B06",
  };

  const BANKS = [365, 385, 420, 450, 490, 550, 570, 615, 660, 735, 850, 940];

  /* ---------- the core: apply a wavelength ---------- */
  let lambda = 550;

  function apply(nm) {
    lambda = nm;

    // coefficients: how UV / how IR is the lamp right now
    const uvK = smooth(clamp((430 - nm) / 65, 0, 1));
    const irK = smooth(clamp((nm - 700) / 240, 0, 1));

    // narrowband LED cast inside the visible band: the folio is seen
    // in the colour of the lamp, cooling toward 430 nm, heating toward 700 nm
    const coolK = smooth(clamp((550 - nm) / 120, 0, 1)) * (1 - uvK);
    const warmK = smooth(clamp((nm - 550) / 150, 0, 1)) * (1 - irK);
    const castK = Math.max(coolK, warmK);
    const castColor =
      coolK >= warmK
        ? mix("#4FA85B", "#4C63D6", clamp((550 - nm) / 100, 0, 1))
        : mix("#C3B23F", "#B3462B", clamp((nm - 570) / 120, 0, 1));

    // --- folio layers ---
    els.washUV.setAttribute("opacity", (0.85 * uvK).toFixed(3));
    els.uvVignette.setAttribute("opacity", uvK.toFixed(3));
    els.pageFluor.setAttribute("opacity", (0.3 * uvK).toFixed(3));
    els.washIRgrey.setAttribute("opacity", (0.5 * irK).toFixed(3));
    els.washIR.setAttribute("opacity", (0.3 * irK).toFixed(3));
    els.washVis.setAttribute("fill", castColor);
    els.washVis.setAttribute("opacity", (0.34 * coolK + 0.28 * warmK).toFixed(3));
    els.irGlow.setAttribute("opacity", (0.7 * irK).toFixed(3));
    els.underFluor.setAttribute("opacity", Math.pow(uvK, 1.3).toFixed(3));
    // the ghost gains contrast as the lamp cools — blue light is how you
    // first suspect a palimpsest before UV confirms it
    els.underGhost.setAttribute(
      "opacity",
      ((0.3 + 0.26 * coolK) * (1 - uvK) * (1 - 0.45 * irK)).toFixed(3)
    );
    els.structure.setAttribute("opacity", (0.9 * irK).toFixed(3));

    // iron-gall overtext: deepens in IR, blocks violet-black in UV
    let ink = C.iron;
    if (uvK > 0) ink = mix(ink, C.ironUV, uvK);
    if (irK > 0) ink = mix(ink, C.ironIR, irK);
    els.overtext.setAttribute("fill", ink);

    // minium rubrics & versals are carbon-free: they drop out in IR —
    // and red ink under a red lamp already sinks into the skin
    const redDrop = smooth(clamp((nm - 590) / 110, 0, 1));
    html.style.setProperty("--irk", Math.max(irK, redDrop).toFixed(3));

    // --- annotations (instrument overlay) ---
    els.annoUV.style.opacity = clamp((uvK - 0.5) / 0.5, 0, 1).toFixed(3);
    els.annoIR.style.opacity = clamp((irK - 0.5) / 0.5, 0, 1).toFixed(3);

    // --- the room ---
    let wellBg = C.well;
    if (uvK > 0) wellBg = mix(wellBg, C.wellUV, uvK);
    if (irK > 0) wellBg = mix(wellBg, C.wellIR, irK);
    well.style.setProperty("--wellbg", wellBg);

    // bench furniture takes the cast of the lamp
    if (castK > Math.max(uvK, irK)) {
      furn.style.setProperty("--furnColor", castColor);
      furn.style.setProperty("--furnO", (0.32 * castK).toFixed(3));
    } else if (uvK >= irK) {
      furn.style.setProperty("--furnColor", "#2E2478");
      furn.style.setProperty("--furnO", (0.55 * uvK).toFixed(3));
    } else {
      furn.style.setProperty("--furnColor", "#7E2A1D");
      furn.style.setProperty("--furnO", (0.45 * irK).toFixed(3));
    }

    // accent colour for thumb ring, λ readout, legibility
    let accent = C.vellum;
    if (uvK > 0) accent = mix(accent, C.fluor, uvK);
    if (irK > 0) accent = mix(accent, C.madder, irK);
    html.style.setProperty("--accent", accent);

    // band identity for preset outlines
    const prevBand = stage.dataset.band;
    stage.dataset.band = uvK > 0.4 ? "uv" : irK > 0.4 ? "ir" : "vis";

    // one-shot lamp strike when the UV tube first fires
    if (stage.dataset.band === "uv" && prevBand !== "uv") {
      well.classList.remove("strike");
      void well.offsetWidth; // restart the animation
      well.classList.add("strike");
    }

    // --- readouts ---
    els.roLambda.textContent = Math.round(nm);
    let bandName, barrier, exposure;
    if (nm < 420) {
      bandName = "ULTRAVIOLET · fluorescence";
      barrier = "long-pass 420 nm";
      exposure = "4.0 s · f/5.6 · stack of 12";
    } else if (nm < 700) {
      bandName = "VISIBLE · reflectance";
      barrier = "—";
      exposure = "1/8 s · f/5.6 · 12 frames";
    } else {
      bandName = "INFRARED · transmissive";
      barrier = "—";
      exposure = "1/2 s · f/5.6 · 12 frames";
    }
    els.roBand.textContent = bandName;
    els.roBarrier.textContent = barrier;
    els.roExposure.textContent = exposure;

    // the readout tells the truth about the lamp: a single narrowband bank
    // when λ sits on one, a metameric mix of the two neighbours when it doesn't
    let bi = 0;
    for (let i = 1; i < BANKS.length; i++)
      if (Math.abs(BANKS[i] - nm) < Math.abs(BANKS[bi] - nm)) bi = i;
    if (Math.abs(BANKS[bi] - nm) <= 10) {
      els.roSource.textContent =
        "LED bank " + String(bi + 1).padStart(2, "0") + "/12 · " + BANKS[bi] + " nm ±10";
    } else {
      let lo = 0;
      for (let i = 0; i < BANKS.length; i++) if (BANKS[i] < nm) lo = i;
      els.roSource.textContent =
        "LED banks " + String(lo + 1).padStart(2, "0") + "+" + String(lo + 2).padStart(2, "0") +
        " · " + Math.round(nm) + " nm mix";
    }

    const leg = Math.round(4 + 87 * uvK + 18 * irK * (1 - uvK));
    els.roLeg.textContent = String(leg).padStart(2, "0") + "%";
    els.legFill.style.transform = "scaleX(" + (leg / 100).toFixed(3) + ")";

    // presets pressed-state
    document.querySelectorAll(".preset").forEach((b) => {
      b.setAttribute("aria-pressed", Math.abs(+b.dataset.nm - nm) < 5 ? "true" : "false");
    });

    // the twelve band chips acknowledge the lamp they set
    document.querySelectorAll(".band[data-nm]").forEach((b) => {
      b.setAttribute("aria-pressed", Math.abs(+b.dataset.nm - nm) <= 10 ? "true" : "false");
    });

    slider.setAttribute(
      "aria-valuetext",
      Math.round(nm) + " nanometres — " + bandName.toLowerCase().replace(" ·", ",")
    );
  }

  /* ---------- interaction ---------- */
  let tweenId = null;

  slider.addEventListener("input", () => {
    if (tweenId) { cancelAnimationFrame(tweenId); tweenId = null; }
    apply(+slider.value);
  });

  // PgUp/PgDn hop the lamp bank to bank (← → step 5 nm natively)
  slider.addEventListener("keydown", (e) => {
    if (e.key !== "PageUp" && e.key !== "PageDown") return;
    e.preventDefault();
    const dir = e.key === "PageUp" ? 1 : -1;
    let bi = 0;
    for (let i = 1; i < BANKS.length; i++)
      if (Math.abs(BANKS[i] - lambda) < Math.abs(BANKS[bi] - lambda)) bi = i;
    const target = BANKS[clamp(bi + dir, 0, BANKS.length - 1)];
    tweenTo(target);
  });

  function tweenTo(target) {
    if (tweenId) cancelAnimationFrame(tweenId);
    if (reduceMotion.matches || document.hidden) {
      slider.value = target;
      apply(target);
      return;
    }
    const from = lambda;
    const dur = 900;
    const t0 = performance.now();
    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const v = lerp(from, target, easeInOut(p));
      slider.value = v;
      apply(v);
      if (p < 1) tweenId = requestAnimationFrame(step);
      else tweenId = null;
    };
    tweenId = requestAnimationFrame(step);
  }

  document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", () => tweenTo(+btn.dataset.nm));
  });

  // the twelve capture bands double as lamp controls
  document.querySelectorAll(".band[data-nm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tweenTo(+btn.dataset.nm);
      document.getElementById("folio").scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && tweenId) {
      cancelAnimationFrame(tweenId);
      tweenId = null;
    }
  });

  /* ---------- scroll reveals ---------- */
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("in"));
  }

  /* ---------- init ---------- */
  apply(550);
})();

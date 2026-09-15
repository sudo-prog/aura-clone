/* PLATE II — the same terrain spoken in three map languages:
   contour linework, Lehmann hachures, continuous shaded relief. */

import { Terrain } from "./terrain.js";
import { contoursOf, thresholdsFor, makePath, paintHachures, paintRelief, svgEl } from "./carto.js";

const VB_W = 1080, VB_H = 660;
const GW = 150, GH = 92;
const SEED = 1907;

const CAPTIONS = {
  contour: "The alphabet itself. Every line joins points of equal height; every fifth line is drawn heavier and carries its elevation. Nothing is shaded, nothing is implied — the mountain is stated.",
  hachure: "The old voice. Short strokes run downhill, thicker where the ground falls faster — the method of Lehmann (1799) and the Dufour map of Switzerland. Steepness becomes darkness.",
  relief: "The modern whisper. Light falls from the northwest at 42 degrees, a second lamp fills from the southeast, and the terrain simply appears — Imhof's trick, done in sepia.",
};

export function initLanguages(reduced) {
  const section = document.getElementById("languages");
  if (!section || !window.d3) return;
  const svg = document.getElementById("langContour");
  const cvHach = document.getElementById("langHachure");
  const cvRelief = document.getElementById("langRelief");
  const caption = document.getElementById("langCaption");
  const tabs = Array.from(section.querySelectorAll(".lang-tab"));

  const terrain = new Terrain(GW, GH, SEED);
  const SX = VB_W / (GW - 1), SY = VB_H / (GH - 1);
  let built = false;

  function build() {
    if (built) return;
    built = true;

    /* contour language (SVG linework) */
    const levels = thresholdsFor(24, 0.05, 0.96);
    const pathGen = makePath(SX, SY);
    const cts = contoursOf(terrain.field, GW, GH, levels);
    const g = svgEl("g");
    svg.appendChild(g);
    const paths = cts.map((c, i) => {
      const isIndex = i % 4 === 0;
      const p = svgEl("path", {
        d: pathGen(c) || "M0,0",
        fill: "none", stroke: "#6b4f2e",
        "stroke-width": isIndex ? 1.6 : 0.7,
        "stroke-opacity": isIndex ? 0.9 : 0.45,
        "stroke-linejoin": "round",
      });
      g.appendChild(p);
      return p;
    });

    /* the translation plate draws itself too, more briskly */
    if (!reduced) {
      paths.forEach((p, i) => {
        let L; try { L = p.getTotalLength(); } catch { L = 0; }
        if (!L || !isFinite(L)) return;
        p.style.strokeDasharray = `${L}`;
        p.style.strokeDashoffset = `${L}`;
        const anim = p.animate(
          [{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
          {
            duration: Math.max(360, Math.min(950, L * 0.12)),
            delay: 80 + i * 34,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          },
        );
        anim.onfinish = () => {
          p.style.strokeDasharray = "none";
          p.style.strokeDashoffset = "0";
        };
      });
    }

    /* hachure language */
    cvHach.width = VB_W; cvHach.height = VB_H;
    paintHachures(cvHach.getContext("2d"), terrain, [0, 0, VB_W, VB_H], {
      levels: 30, spacing: 7, slopeGain: 15, lenMin: 3, lenMax: 10, weight: 1.7,
    });

    /* shaded relief language */
    cvRelief.width = VB_W; cvRelief.height = VB_H;
    paintRelief(cvRelief.getContext("2d"), terrain, [0, 0, VB_W, VB_H], { z: 30, upscale: 6 });
  }

  const layers = { contour: svg, hachure: cvHach, relief: cvRelief };

  function select(lang) {
    tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.lang === lang)));
    for (const [k, el] of Object.entries(layers)) {
      el.classList.toggle("active", k === lang);
    }
    caption.innerHTML = CAPTIONS[lang];
    if (!reduced) {
      caption.animate(
        [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  }

  tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.lang)));

  // build when the plate is genuinely in view, so the draw-on is witnessed
  select("contour");
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      build();
      io.disconnect();
    }
  }, { threshold: 0.22 });
  io.observe(section.querySelector(".lang-frame"));
}

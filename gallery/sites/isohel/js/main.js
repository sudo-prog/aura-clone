/* ISOHEL boot: hero plate, language plate, catalogue thumbs, scroll reveals. */

import { initHero } from "./hero.js";
import { initLanguages } from "./languages.js";
import { initProducts } from "./products.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function boot() {
  initHero(reduced);
  initLanguages(reduced);
  initProducts();

  // plate reveals
  const plates = document.querySelectorAll(".plate:not(.plate-hero)");
  if (!reduced && "IntersectionObserver" in window) {
    plates.forEach((p) => p.classList.add("will-reveal"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("seen");
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    plates.forEach((p) => io.observe(p));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

/* ==========================================================================
   VELODROMO D'INVERNO — page choreography + scoreboard
   ========================================================================== */
(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- section planes: skew in, settle ---------- */
  const planes = document.querySelectorAll(".plane");
  if ("IntersectionObserver" in window && !REDUCED) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("settled");
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12 });
    planes.forEach(p => io.observe(p));
  } else {
    planes.forEach(p => p.classList.add("settled"));
  }

  /* ---------- scoreboard ---------- */
  const NIGHTS = [
    {
      caption: "VELOCITÀ · SAB 13 GENNAIO · FINALE AL MEGLIO DI TRE",
      rows: [
        ["1", "BASSI", "S.C. CORSIA NORD", "b. Delvaux 2–1 · 11″9"],
        ["2", "DELVAUX", "VÉLO-CLUB ANVERSOIS", "12″0"],
        ["3", "FERRAGUTI", "PEDALE AMBROSIANO", "b. Occhipinti · 12″1"],
        ["4", "OCCHIPINTI", "U.S. CREMONESE", "12″2"],
        ["5", "BONOMELLI", "CICLISTICA BERGAMASCA", "12″3"],
        ["6", "CATTANEO", "S.C. CORSIA NORD", "12″6"]
      ]
    },
    {
      caption: "INSEGUIMENTO 4.000 M · SAB 27 GENNAIO",
      rows: [
        ["1", "MALINVERNI", "VELOCE CLUB SEMPIONE", "5′22″4"],
        ["2", "OCCHIPINTI", "U.S. CREMONESE", "5′24″1"],
        ["3", "SARTORELLI", "PEDALE AMBROSIANO", "5′26″8"],
        ["4", "CATTANEO", "S.C. CORSIA NORD", "5′29″0"],
        ["5", "FERRAGUTI", "PEDALE AMBROSIANO", "5′30″2"],
        ["6", "BONOMELLI", "CICLISTICA BERGAMASCA", "5′31″7"]
      ]
    },
    {
      caption: "ELIMINAZIONE · SAB 10 FEBBRAIO · OGNI DUE GIRI, L'ULTIMO A CASA",
      rows: [
        ["1", "OCCHIPINTI", "U.S. CREMONESE", "VINCITORE"],
        ["2", "BASSI", "S.C. CORSIA NORD", "EL. ULTIMO GIRO"],
        ["3", "DELVAUX", "VÉLO-CLUB ANVERSOIS", "EL. 16º GIRO"],
        ["4", "BONOMELLI", "CICLISTICA BERGAMASCA", "EL. 14º GIRO"],
        ["5", "SARTORELLI", "PEDALE AMBROSIANO", "EL. 12º GIRO"],
        ["6", "FERRAGUTI", "PEDALE AMBROSIANO", "EL. 10º GIRO"]
      ]
    }
  ];

  const board = document.getElementById("board");
  const tabs = [0, 1, 2].map(i => document.getElementById(`tab-${i}`)).filter(Boolean);
  let current = 0;
  let boardSeen = false;

  function renderBoard(idx, animate) {
    if (!board) return;
    current = idx;
    const night = NIGHTS[idx];
    const flip = animate && !REDUCED ? " flip" : "";
    board.innerHTML =
      `<p class="board-caption" lang="it">${night.caption}</p>` +
      `<ol class="board-list" style="list-style:none">` +
      night.rows.map((r, i) =>
        `<li class="board-row${i === 0 ? " is-first" : ""}${flip}" style="--r:${i}">` +
        `<span class="board-pos" aria-hidden="true">${r[0]}.</span>` +
        `<span class="board-name">${r[1]}<span class="board-club">${r[2]}</span></span>` +
        `<span class="board-lead" aria-hidden="true"></span>` +
        `<span class="board-res">${r[3]}</span>` +
        `</li>`
      ).join("") +
      `</ol>`;
    board.setAttribute("aria-labelledby", `tab-${idx}`);
    tabs.forEach((t, i) => {
      t.classList.toggle("is-active", i === idx);
      t.setAttribute("aria-selected", i === idx ? "true" : "false");
      t.tabIndex = i === idx ? 0 : -1;
    });
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => renderBoard(i, true));
    t.addEventListener("keydown", (e) => {
      let n = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        n = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      } else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tabs.length - 1;
      if (n >= 0) {
        e.preventDefault();
        tabs[n].focus();
        renderBoard(n, true);
      }
    });
  });

  renderBoard(0, false);

  if (board && "IntersectionObserver" in window && !REDUCED) {
    const bio = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !boardSeen) {
        boardSeen = true;
        renderBoard(current, true);
        bio.disconnect();
      }
    }, { threshold: 0.25 });
    bio.observe(board);
  }
})();

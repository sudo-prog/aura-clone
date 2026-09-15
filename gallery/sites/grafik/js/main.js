/* GRAFIK — Halle 10 · raster toggle + museum-grade FLIP zoom
   No libraries. Nothing runs when idle. */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- load choreography ---------- */
  function loaded() { html.classList.add('loaded'); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(loaded); }
  setTimeout(loaded, 900);

  /* ---------- catalogue data (single source of truth) ---------- */
  var WERKE = [
    {
      cat: 'GR-10.01', title: '«musik unserer zeit»',
      designer: 'Rudolf Bänninger, Basel (1921–1998)', year: '1961',
      client: 'Stadttheater Basel', printer: 'Lithographie Frey AG, Basel',
      tech: 'Offsetlithografie', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2024.117',
      note: 'Bänninger scores the season rather than illustrating it: seven quarter-rings expand from the corner of the sheet, each radius roughly 1.6 times the last, the gaps widening in the same progression. Loud and soft, black and red — a crescendo you can measure with a ruler. The programme details keep to the quiet corner the geometry leaves free.'
    },
    {
      cat: 'GR-10.02', title: '«das neue kino»',
      designer: 'Verena Loew, Zürich (1934–2011)', year: '1963',
      client: 'Filmklub im Museum Zürich', printer: 'Offsetdruck Meyer & Cie, Zürich',
      tech: 'Offsetlithografie, Duplex', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2025.031',
      note: 'A cinema built from three devices: a beam of light, a red disc, a strip of empty frames. Loew’s “photograph” was never taken — the duotone is pure gradient, the grain is printed noise — yet the sheet remembers a screening room precisely. The red tab with the year was added for the second run and kept ever since.'
    },
    {
      cat: 'GR-10.03', title: '«typographie»',
      designer: 'Hans Peter Frei, Basel (1927–1983)', year: '1959',
      client: 'Allgemeine Gewerbeschule Basel', printer: 'Buchdruckerei zum Rheintor, Basel',
      tech: 'Buchdruck (letterpress)', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2024.212',
      note: 'One lowercase e, enlarged until counter and stem become architecture, cropped without apology at two edges. Frei, then an instructor of the evening class, let the letter do all the persuading; the course announcement withdraws into the corner the letterform leaves behind. Printed from a zinc plate in a single afternoon, according to the school’s records.'
    },
    {
      cat: 'GR-10.04', title: '«ballett 65»',
      designer: 'Margrit Stauffer, Bern (1930–2019)', year: '1965',
      client: 'Stadttheater Basel', printer: 'Siebdruck Hartmann, Bern',
      tech: 'Siebdruck (silkscreen)', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2026.008',
      note: 'Stauffer reduces a dancer to three facts: the after-image of a turn (a white crescent), balance (a six-millimetre line), and the point of contact (a red dot, exactly where the sheet ends its argument). The theatre requested a photograph; Stauffer declined by registered letter. The poster ran unchanged for the full season.'
    },
    {
      cat: 'GR-10.05', title: '«konstruktive grafik»',
      designer: 'Otto Krebs, Winterthur (1919–1975)', year: '1958',
      client: 'Kunsthalle Winterthur', printer: 'Buchdruckerei Vogt, Winterthur',
      tech: 'Buchdruck (letterpress)', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2025.144',
      note: 'Here text is the only image. The title climbs the left edge at ninety degrees, ten exhibitors stand in a single flush-left column, and the sole “picture” — a red square — refuses to depict anything at all. Krebs set the sheet in two sizes of one grotesque and considered a third size a moral failure, as he wrote to the Kunsthalle’s director.'
    },
    {
      cat: 'GR-10.06', title: '«im zweifel: halt!»',
      designer: 'Kurt Amrein, Luzern (1925–2002)', year: '1957',
      client: 'Schweizer Strassenhilfe', printer: 'Lithographie Frey AG, Basel',
      tech: 'Offsetlithografie', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2024.089',
      note: 'A road-safety commission answered with the style’s full violence: a black road cuts the red field at thirty-one degrees, and the car is already gone — two thinning streaks of light are all that remain of it. Amrein tilted the horizon until the sheet itself feels like braking distance. Of the six posters in the campaign this is the only one without a photograph — and it tested best.'
    },
    {
      cat: 'GR-10.07', title: '«chemie + wasser»',
      designer: 'Lise Widmer, Basel (1938– )', year: '1967',
      client: 'Schweizer Mustermesse Basel', printer: 'Offsetdruck Meyer & Cie, Zürich',
      tech: 'Offsetlithografie', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2026.052',
      note: 'Fifteen squares, each rotated 4.5 degrees and reduced to nine tenths of the one before — industry, the square, dissolving into water, the vortex. Widmer, the youngest designer in this room by a decade, built the figure programmatically: one rule, applied fifteen times. The red marks the fifth and tenth iteration; the last square is solid, like a stone reaching the bottom.'
    },
    {
      cat: 'GR-10.08', title: '«winter in graubünden»',
      designer: 'Peter Gass (1933–2020) & Silvia Gass-Caflisch (1936– ), Chur', year: '1968',
      client: 'Verkehrsverein Graubünden', printer: 'Graphische Anstalt Chur',
      tech: 'Offsetlithografie', size: '90.5 × 128 cm (Weltformat F4)',
      coll: 'Plakatsammlung · Inv. 2025.201',
      note: 'Tourism was the pictorial poster’s last stronghold; the Gasses replied with an Alps of four flat tones and a sun without rays. Only the grain of the sky admits that photography exists. The Verkehrsverein printed forty thousand — the largest run in this room — and the sheet hung in Swiss railway stations for three winters.'
    }
  ];

  /* ---------- the celebrated grid ---------- */
  var rasterToggles = Array.prototype.slice.call(
    document.querySelectorAll('#rasterBtn, [data-raster-toggle]')
  );
  function setRaster(on) {
    if (on) { html.setAttribute('data-raster', 'on'); }
    else { html.removeAttribute('data-raster'); }
    rasterToggles.forEach(function (b) { b.setAttribute('aria-pressed', String(on)); });
  }
  function toggleRaster() { setRaster(!html.hasAttribute('data-raster')); }
  rasterToggles.forEach(function (b) { b.addEventListener('click', toggleRaster); });

  /* ---------- detail dialog: FLIP ---------- */
  var dialog = document.getElementById('detail');
  var fig = document.getElementById('dPoster');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('.werk-thumb'));
  var fields = {
    cat: document.getElementById('dCat'),
    title: document.getElementById('d-title'),
    designer: document.getElementById('dDesigner'),
    year: document.getElementById('dYear'),
    client: document.getElementById('dClient'),
    printer: document.getElementById('dPrinter'),
    tech: document.getElementById('dTech'),
    size: document.getElementById('dSize'),
    coll: document.getElementById('dColl'),
    note: document.getElementById('dNote'),
    count: document.getElementById('dCount')
  };
  var current = -1;
  var busy = false;
  var inAnim = null;

  function populate(i) {
    var w = WERKE[i];
    fields.cat.textContent = w.cat;
    fields.title.textContent = w.title;
    fields.designer.textContent = w.designer;
    fields.year.textContent = w.year;
    fields.client.textContent = w.client;
    fields.printer.textContent = w.printer;
    fields.tech.textContent = w.tech;
    fields.size.textContent = w.size;
    fields.coll.textContent = 'Stiftung Neue Grafik, ' + w.coll;
    fields.note.textContent = w.note;
    fields.count.textContent = ('0' + (i + 1)) + ' / 08';
    var svg = thumbs[i].querySelector('svg').cloneNode(true);
    svg.setAttribute('aria-hidden', 'true');
    /* the clone must not duplicate gradient/filter ids already in the wall */
    Array.prototype.forEach.call(svg.querySelectorAll('[id]'), function (el) {
      var old = el.id;
      var nu = old + '-dlg';
      el.id = nu;
      Array.prototype.forEach.call(
        svg.querySelectorAll('[fill="url(#' + old + ')"], [stroke="url(#' + old + ')"], [filter="url(#' + old + ')"]'),
        function (ref) {
          ['fill', 'stroke', 'filter'].forEach(function (a) {
            if (ref.getAttribute(a) === 'url(#' + old + ')') {
              ref.setAttribute(a, 'url(#' + nu + ')');
            }
          });
        }
      );
    });
    while (fig.firstChild) { fig.removeChild(fig.firstChild); }
    fig.appendChild(svg);
  }

  function open(i) {
    if (busy || dialog.open) { return; }
    busy = true;
    current = i;
    populate(i);
    dialog.classList.remove('renav');
    html.classList.add('locked');
    dialog.showModal();
    dialog.focus();

    if (reduced.matches) {
      thumbs[i].classList.add('is-hidden');
      dialog.classList.add('open', 'shown');
      busy = false;
      return;
    }

    var first = thumbs[i].getBoundingClientRect();
    thumbs[i].classList.add('is-hidden');
    dialog.classList.add('open');

    requestAnimationFrame(function () {
      var last = fig.getBoundingClientRect();
      var dx = first.left - last.left;
      var dy = first.top - last.top;
      var s = first.width / last.width;
      fig.classList.add('no-trans');
      fig.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      void fig.offsetWidth; /* commit the inverted state */
      fig.classList.remove('no-trans');
      fig.style.transform = '';
      dialog.classList.add('shown');
      setTimeout(function () { busy = false; }, 430);
    });
  }

  function close() {
    if (busy || !dialog.open) { return; }
    busy = true;
    var thumb = thumbs[current];

    function finish() {
      dialog.close();
      dialog.classList.remove('open', 'shown', 'renav');
      fig.style.transform = '';
      fig.style.transition = '';
      thumb.classList.remove('is-hidden');
      html.classList.remove('locked');
      thumb.focus({ preventScroll: true });
      busy = false;
    }

    if (reduced.matches) { finish(); return; }

    var first = fig.getBoundingClientRect();
    var target = thumb.getBoundingClientRect();
    var dx = target.left - first.left;
    var dy = target.top - first.top;
    var s = target.width / first.width;
    dialog.classList.remove('shown');
    dialog.classList.remove('open');
    dialog.classList.remove('renav'); /* marks/dims fade with the flight, no hold */
    fig.style.transition = 'transform 320ms cubic-bezier(0.32, 0, 0.06, 1)';
    fig.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
    setTimeout(finish, 330);
  }

  function goto(dir) {
    if (busy || !dialog.open) { return; }
    busy = true;
    var ni = (current + dir + WERKE.length) % WERKE.length;
    thumbs[current].classList.remove('is-hidden');
    thumbs[ni].classList.add('is-hidden');

    if (reduced.matches) {
      populate(ni);
      current = ni;
      busy = false;
      return;
    }

    dialog.classList.add('renav');
    dialog.classList.remove('shown');
    if (inAnim) { inAnim.cancel(); }
    var out = fig.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-24 * dir) + 'px)' }],
      { duration: 170, easing: 'cubic-bezier(0.32, 0, 0.06, 1)', fill: 'forwards' }
    );
    out.onfinish = function () {
      populate(ni);
      current = ni;
      out.cancel();
      dialog.classList.add('shown');
      inAnim = fig.animate(
        [{ opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' }, { opacity: 1, transform: 'none' }],
        { duration: 220, easing: 'cubic-bezier(0.32, 0, 0.06, 1)' }
      );
      inAnim.onfinish = function () { inAnim = null; };
      busy = false;
    };
  }

  thumbs.forEach(function (t) {
    t.addEventListener('click', function () { open(parseInt(t.dataset.werk, 10)); });
  });
  document.getElementById('dClose').addEventListener('click', close);
  document.getElementById('dX').addEventListener('click', close);
  document.getElementById('dPrev').addEventListener('click', function () { goto(-1); });
  document.getElementById('dNext').addEventListener('click', function () { goto(1); });

  dialog.addEventListener('cancel', function (e) {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('click', function (e) {
    var t = e.target;
    if (t === dialog || t.classList.contains('d-scrim') ||
        t.classList.contains('d-wrap') || t.classList.contains('d-stage')) {
      close();
    }
  });
  /* safety net: if the dialog closes by any other path, restore state */
  dialog.addEventListener('close', function () {
    html.classList.remove('locked');
    thumbs.forEach(function (t) { t.classList.remove('is-hidden'); });
  });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { return; }
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') { return; }
    /* key auto-repeat must not strobe the overlay */
    if ((e.key === 'g' || e.key === 'G') && !e.repeat) { toggleRaster(); return; }
    if (dialog.open) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goto(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goto(-1); }
    }
  });
})();

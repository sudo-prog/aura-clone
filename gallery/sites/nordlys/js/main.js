// NORDLYS — page choreography, expedition rows, yard clock

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// --- load sequence ---
function markLoaded() {
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(markLoaded);
  setTimeout(markLoaded, 1200); // safety
} else {
  window.addEventListener('load', markLoaded);
}

// --- header: solid backing once content slides beneath it ---
const siteHead = document.querySelector('.site-head');
if (siteHead) {
  const onHeadScroll = () =>
    siteHead.classList.toggle('is-scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onHeadScroll, { passive: true });
  onHeadScroll();
}

// --- scroll reveals ---
const revealEls = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

// --- hero parallax-out ---
const heroCore = document.querySelector('.hero-core');
const heroStrip = document.querySelector('.hero-strip');
if (heroCore && !reduceMotion.matches) {
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        const k = Math.min(1, y / (vh * 0.7));
        heroCore.style.opacity = String(1 - k * 0.9);
        heroCore.style.transform = `translateY(${y * -0.12}px)`;
        if (heroStrip) heroStrip.style.opacity = String(1 - k * 0.8);
        ticking = false;
      });
    },
    { passive: true }
  );
}

// --- expedition rows ---
document.querySelectorAll('.exp-head').forEach((btn) => {
  btn.addEventListener('click', () => {
    const exp = btn.closest('.exp');
    const open = exp.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
});

// --- manifest checklist: tick the kit as you pack it ---
document.querySelectorAll('.manifest .chk').forEach((btn) => {
  const row = btn.closest('tr');
  const item = row.cells[2] ? row.cells[2].textContent.trim() : 'item';
  btn.setAttribute('aria-label', `Mark “${item}” as packed`);
  btn.addEventListener('click', () => {
    const on = row.classList.toggle('is-checked');
    btn.setAttribute('aria-pressed', String(on));
  });
});

// --- yard clock (Tromsø, CET) ---
const clockEl = document.querySelector('[data-clock]');
if (clockEl) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    minute: '2-digit',
  });
  const tick = () => {
    clockEl.textContent = fmt.format(new Date());
  };
  tick();
  setInterval(tick, 30000);
}

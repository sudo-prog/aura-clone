/* SHORTWAVE — station registry + traffic scripts
   Frequencies in kHz. All stations, schedules and traffic are fictional. */

export const BAND = { min: 5800, max: 7500 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STATIONS = [
  {
    id: 'V-08', name: 'CANARIA', freq: 5912, kind: 'voice',
    width: 7, power: 0.92, pitch: 214, seed: 8,
    decodeLabel: 'DECODE — V-08 · 5-FIG GROUPS · ES',
  },
  {
    id: 'G-04', name: 'MUSIKDOSE', freq: 6214, kind: 'voice',
    width: 6, power: 0.66, pitch: 258, seed: 4,
    decodeLabel: 'DECODE — G-04 · 5-FIG GROUPS · DE',
  },
  {
    id: 'E-17', name: 'MAGPIE', freq: 6630, kind: 'voice',
    width: 7, power: 0.85, pitch: 180, seed: 17,
    decodeLabel: 'DECODE — E-17 · 5-FIG GROUPS · EN',
  },
  {
    id: 'M-12', name: 'TAPPER', freq: 7039, kind: 'morse',
    width: 2.2, power: 0.7, pitch: 0, seed: 12,
    decodeLabel: 'DECODE — M-12 · CUT NUMBERS · CW',
  },
  {
    id: 'S-30', name: 'THE LATHE', freq: 7311, kind: 'buzzer',
    width: 5, power: 0.98, pitch: 108, seed: 30,
    decodeLabel: 'DECODE — S-30 · CHANNEL MARKER',
  },
];

/* ------------------------------------------------------------------ */
/* melodies                                                            */

export const SIX_NOTE_TUNE = [659.26, 587.33, 493.88, 440.0, 493.88, 659.26];

export const MUSIC_BOX_TUNE = [
  880.0, 987.77, 1046.5, 987.77, 880.0, 659.26,
  880.0, 1046.5, 1318.5, 1046.5, 987.77, 880.0,
];

/* ------------------------------------------------------------------ */
/* morse                                                               */

const MORSE = {
  T: '-', A: '.-', U: '..-', V: '...-', '4': '....-',
  E: '.', '6': '-....', B: '-...', D: '-..', N: '-.',
  R: '.-.', K: '-.-', '+': '.-.-.',
};
const CUT = ['T', 'A', 'U', 'V', '4', 'E', '6', 'B', 'D', 'N'];
const MORSE_UNIT = 62; // ms

function morseGap(code) {
  let units = 0;
  for (const c of code) units += (c === '-' ? 3 : 1) + 1;
  return units * MORSE_UNIT + 2 * MORSE_UNIT;
}

/* ------------------------------------------------------------------ */
/* voice helpers                                                       */

const VOWELS = {
  A: [780, 1220], E: [430, 2100], I: [300, 2300], O: [500, 900], U: [350, 750],
  'Á': [780, 1220], 'É': [430, 2100], 'Ó': [500, 900],
};

/* type a word char-by-char; vowels get a formant syllable so speech
   cadence survives even when the text is not digits */
function* word(w, st, gap = 62) {
  for (const ch of w) {
    const v = VOWELS[ch];
    yield {
      txt: ch, gap,
      snd: v ? { k: 'syll', f1: v[0], f2: v[1], pitch: st.pitch, len: 0.1 } : null,
    };
  }
}

function* spokenDigits(str, st, gap = 310) {
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      yield { txt: ch, gap, snd: { k: 'digit', d: +ch, pitch: st.pitch } };
    } else {
      yield { txt: ch, gap: 140, snd: null };
    }
  }
}

function* groupBlock(st, rnd, groups, perDigit = 300, betweenGroups = 780) {
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < 5; i++) {
      const d = Math.floor(rnd() * 10);
      yield { txt: String(d), gap: perDigit, snd: { k: 'digit', d, pitch: st.pitch } };
    }
    yield { txt: '  ', gap: betweenGroups, snd: null };
  }
}

/* ------------------------------------------------------------------ */
/* per-station infinite traffic scripts                                */

export function* trafficScript(st) {
  const rnd = mulberry32(st.seed * 7919 + 17);

  while (true) {
    if (st.id === 'E-17') {
      yield { txt: '', gap: 500, snd: null };
      for (let rep = 0; rep < 2; rep++) {
        for (const f of SIX_NOTE_TUNE) {
          yield { txt: '• ', gap: 430, snd: { k: 'note', f, timbre: 'reed' } };
        }
        yield { txt: ' ', gap: 700, snd: null };
      }
      for (let r = 0; r < 3; r++) {
        yield* spokenDigits('86', st, 330);
        yield { txt: ' ', gap: 480, snd: null };
      }
      yield { txt: '· ', gap: 650, snd: null };
      yield* word('COUNT ', st, 70);
      yield* spokenDigits('24', st, 330);
      yield { txt: '  ', gap: 950, snd: null };
      yield* groupBlock(st, rnd, 8);
      yield* word('END END', st, 80);
      yield { txt: '   ', gap: 2600, snd: null };
    }

    else if (st.id === 'V-08') {
      for (let r = 0; r < 3; r++) {
        yield* word('¡ATENCIÓN! ', st, 74);
        yield { txt: '', gap: 420, snd: null };
      }
      yield { txt: ' ', gap: 700, snd: null };
      yield* groupBlock(st, rnd, 7, 280, 700);
      yield { txt: '· · ·  ', gap: 1800, snd: null };
    }

    else if (st.id === 'G-04') {
      yield* word('[SPIELUHR] ', st, 55);
      for (const f of MUSIC_BOX_TUNE) {
        yield { txt: '• ', gap: 340, snd: { k: 'note', f, timbre: 'box' } };
      }
      yield { txt: ' ', gap: 800, snd: null };
      yield* word('ACHTUNG ', st, 72);
      yield* spokenDigits('04 271', st, 320);
      yield { txt: '  ', gap: 950, snd: null };
      yield* groupBlock(st, rnd, 6, 320, 820);
      yield* word('ENDE', st, 90);
      yield { txt: '   ', gap: 2800, snd: null };
    }

    else if (st.id === 'M-12') {
      for (let g = 0; g < 5; g++) {
        for (let i = 0; i < 5; i++) {
          const d = Math.floor(rnd() * 10);
          const c = CUT[d];
          const code = MORSE[c];
          yield { txt: c, gap: morseGap(code) + 90, snd: { k: 'morse', code } };
        }
        yield { txt: ' ', gap: 620, snd: null };
      }
      yield { txt: '+ ', gap: morseGap(MORSE['+']) + 200, snd: { k: 'morse', code: MORSE['+'] } };
      yield { txt: '  ', gap: 2400, snd: null };
    }

    else if (st.id === 'S-30') {
      const rasps = 9 + Math.floor(rnd() * 8);
      for (let i = 0; i < rasps; i++) {
        yield { txt: '• ', gap: 2350, snd: { k: 'rasp' } };
      }
      if (rnd() < 0.6) {
        const words = ['KROT', 'GLINA', 'SOSNA', 'VETER', 'BRONYA'];
        const wpick = words[Math.floor(rnd() * words.length)];
        yield { txt: ' ', gap: 900, snd: null };
        yield* word('LATHE LATHE ', st, 85);
        yield { txt: '· ', gap: 300, snd: null };
        yield* word(wpick + ' ', st, 85);
        yield* spokenDigits(
          `${Math.floor(rnd() * 90 + 10)} ${Math.floor(rnd() * 90 + 10)}`, st, 340);
        yield { txt: '  ', gap: 500, snd: null };
        yield* spokenDigits(String(Math.floor(rnd() * 90000 + 10000)), st, 340);
        yield { txt: '   ', gap: 1600, snd: null };
      }
    }
  }
}

/* LEGERDEMAIN — Das kleine Orakel
   The classic 21-card elimination, implemented honestly.
   Gather with the named pile in the middle, redeal by rows, three times:
   the thought-of card is then provably at stack index 10 (the exact centre).
   Verified by simulation for all 21 starting positions. */
import { Deck, EASE, wait, REDUCED, stackPose } from './deck.js';
import { FULL_DECK, cardName, SUITS } from './cards.js';

const QUESTIONS = [
  'Question the first — which pile keeps your card?',
  'Question the second — where does it live now?',
  'And the last — where has it settled?',
];

export class Oracle {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('#oracleStage');
    this.line = root.querySelector('#oracleLine');
    this.steps = [...root.querySelectorAll('.q-steps span')];
    this.hitsWrap = root.querySelector('.pile-hits');
    this.hits = [...root.querySelectorAll('.pile-hit')];
    this.actions = root.querySelector('#oracleActions');
    this.againBtn = root.querySelector('#oracleAgain');
    this.deck = null;
    this.busy = true;
    this.dealt = false;
    this.hits.forEach((b, p) => b.addEventListener('click', () => this.answer(p)));
    this.againBtn.addEventListener('click', () => { if (!this.busy) this.start(true); });
    addEventListener('resize', () => {
      clearTimeout(this._rz);
      this._rz = setTimeout(() => this.reposition(), 160);
    });
  }

  metrics() {
    const w = this.stage.parentElement.clientWidth;
    const cw = Math.max(58, Math.min(96, w * 0.105));
    this.stage.style.setProperty('--cw', cw + 'px');
    const gap = Math.min(cw * 1.62, (w - cw) / 2.04);
    const overlap = Math.max(26, cw * 0.42);
    /* keep the click zones registered with the dealt piles */
    this.hitsWrap.style.maxWidth = (gap * 2 + cw * 2.4) + 'px';
    return { cw, gap, overlap };
  }

  paintSteps() {
    this.steps.forEach((s, i) => {
      s.classList.toggle('done', i < this.round);
      s.classList.toggle('now', i === this.round && this.round < 3);
    });
  }

  pilePose(p, row, m) {
    return {
      x: (p - 1) * m.gap,
      y: (row - 3) * m.overlap + 14,
      z: row * 1.1 + 2,
      rz: (p - 1) * 1.1,
      faceUp: true,
    };
  }

  /* deal 21 into 3 piles by rows; stack[0] is dealt first */
  piles() {
    const p = [[], [], []];
    this.stack.forEach((id, k) => p[k % 3].push(id));
    return p;
  }

  async start(reshuffle) {
    this.busy = true;
    this.dealt = true;
    this.round = 0;
    this.actions.hidden = true;
    this.root.classList.remove('revealed');
    if (this.deck) this.deck.destroy();
    const pool = [...FULL_DECK];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.specs = pool.slice(0, 21);
    this.deck = new Deck(this.stage, this.specs);
    this.stack = this.specs.map((_, i) => i);
    const m = this.metrics();
    /* squared face-down stack first */
    this.deck.formation((i, n) => stackPose(i, n), { dur: 10 });
    this.setLine(reshuffle
      ? 'A fresh twenty-one. Think of another card — even the same one; it will not help you.'
      : 'Twenty-one cards. Think of one. Keep it.');
    this.paintSteps();
    await wait(reshuffle ? 700 : 900);
    await this.dealOut(m, 46);
    this.setLine(QUESTIONS[0]);
    this.paintSteps();
    this.armHits(true);
    this.busy = false;
  }

  async dealOut(m, stagger) {
    const rowOf = new Map();
    this.piles().forEach((pile, p) =>
      pile.forEach((id, row) => rowOf.set(id, [p, row])));
    const seq = this.stack.map((id) => id);
    seq.forEach((id, k) => {
      const [p, row] = rowOf.get(id);
      this.deck.set(this.deck.cards[id], this.pilePose(p, row, m),
        { dur: 620, delay: k * stagger, ease: EASE.deal });
    });
    await wait(620 + stagger * 20 + 60);
  }

  armHits(on) {
    this.hits.forEach((b) => { b.disabled = !on; });
    this.root.classList.toggle('awaiting', on);
  }

  async answer(p) {
    if (this.busy) return;
    this.busy = true;
    this.armHits(false);
    const piles = this.piles();
    const others = [0, 1, 2].filter((i) => i !== p);
    /* the honest move: named pile goes in the MIDDLE */
    this.stack = [...piles[others[0]], ...piles[p], ...piles[others[1]]];
    this.round++;
    /* gather to a squared stack, in new stack order */
    const posIn = new Map(this.stack.map((id, k) => [id, k]));
    const n = 21;
    this.deck.cards.forEach((c) => {
      const k = posIn.get(c.i);
      this.deck.set(c, stackPose(k, n), { dur: 560, delay: k * 16, ease: EASE.soft });
    });
    await wait(560 + 16 * 21 + 120);
    this.paintSteps();
    if (this.round === 3) return this.reveal();
    const m = this.metrics();
    await this.dealOut(m, 40);
    this.setLine(QUESTIONS[this.round]);
    this.armHits(true);
    this.busy = false;
  }

  async reveal() {
    const id = this.stack[10]; /* always. that is the trick. */
    const spec = this.specs[id];
    this.setLine('…');
    /* loose ribbon, face down, the chosen card still hidden among them */
    const w = Math.min(this.stage.parentElement.clientWidth * 0.86, 620);
    this.deck.cards.forEach((c) => {
      const k = this.stack.indexOf(c.i), t = k / 20;
      this.deck.set(c, {
        x: -w / 2 + t * w, y: 78, z: k * 0.6,
        rz: -4 + t * 8, faceUp: false,
      }, { dur: 640, delay: k * 14, ease: EASE.soft });
    });
    await wait(1050);
    /* the rise: chosen card lifts, pirouettes, lands face up at scale */
    const chosen = this.deck.cards[id];
    this.deck.set(chosen, { x: 0, y: -145, z: 210, ry: 360, s: 1.12, faceUp: false },
      { dur: 850, ease: EASE.lift });
    await wait(880);
    this.deck.set(chosen, { x: 0, y: -78, z: 260, ry: 720, s: 1.55, faceUp: true },
      { dur: 900, ease: EASE.tossOut, flipDur: 620 });
    /* the rest bow out */
    this.deck.cards.forEach((c) => {
      if (c === chosen) return;
      const k = this.stack.indexOf(c.i), t = k / 20;
      this.deck.set(c, {
        x: (-w / 2 + t * w) * 1.06, y: 132, z: k * 0.5,
        rz: -5 + t * 10, faceUp: false,
      }, { dur: 700, delay: 120 + k * 10, ease: EASE.soft });
      c.el.classList.add('dimmed');
    });
    await wait(950);
    const red = SUITS[spec.suit].red;
    this.line.innerHTML =
      `You were thinking of <strong class="${red ? 'suit-red' : 'suit-blk'}">${cardName(spec)}</strong>.`;
    this.root.classList.add('revealed');
    this.actions.hidden = false;
    setTimeout(() => {
      this.deck.cards.forEach((c) => c.el.classList.remove('dimmed'));
    }, 2600);
    this.busy = false;
  }

  setLine(html) { this.line.innerHTML = html; }

  reposition() {
    if (!this.deck || this.busy || !this.dealt || this.round >= 3) return;
    const m = this.metrics();
    const rowOf = new Map();
    this.piles().forEach((pile, p) => pile.forEach((id, row) => rowOf.set(id, [p, row])));
    this.deck.cards.forEach((c) => {
      const pr = rowOf.get(c.i);
      if (pr) this.deck.set(c, this.pilePose(pr[0], pr[1], m), { dur: 300 });
    });
  }
}

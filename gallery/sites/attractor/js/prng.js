// Seeds and deterministic randomness.
// Every artwork's state is fully determined by one 32-bit seed
// drawn from device entropy at the moment of arrival.

export function newSeed(){
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return u[0] >>> 0;
}

// mulberry32 — small, fast, good-enough distribution for pigment.
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 3-digit groups with thin spaces, museum-label style.
export function fmtSeed(n){
  return String(n >>> 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

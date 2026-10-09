// Level 99 "Bazaar": a very hard level. A hex world of 56 x 64 cells, an endless plane: a covered market.
// Stalls stand packed on a lattice wherever they leave the road free, so the road winds down narrow alleys
// with a wall two cells off on either hand. It goes down four wells into the cellars and runs the store
// rooms underneath. The thread is uneven: stages wait up to the edge of sight, crystals lead on down the
// alleys, and at some bends only the painted road shows the turn.
//   - a stall: a hex of radius two, its counter a ring of wall with one gap, rugs (slow pads) inside and
//     the merchant (a spike) in the middle; the stall's awning is coloured by its trade;
//   - the alleys: the crowd (spikes) here and there from two cells out, spilt spice (boost pads) in pinches;
//   - the cellars: rows of crates (walls) with gaps, barrels (spikes), sacks of grain (slow pads);
//   - the wells: a hole of radius one one step past each dive, ringed by wet stone (slow pads).
// Colour concept: a spice market. On top a gold road through rose alleys under raspberry and violet
// awnings, underneath a pale blue road through chocolate cellars; the wells glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 64, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 56];
const R = road(g, [...start, 'N'],
  'N12 NE8 N10 NW6 N8 NE16 SE10 S8 D'          // top: up the west alleys, a crook, north-east over the market and into a well
  + ' N8 NE6 N10 NW8 D'                        // cellars: back up, north-east, north and off over the edge
  + ' SE6 S6 SE8 S3 SW5 S5 SE5 S3 SW10 D'      // top: back, down the east alleys with a crook and into a third well
  + ' NE6 SE6 S6 SW40 S2 D'                    // cellars: back, east, south and the long diagonal south-west into the last
  + ' N7');                                    // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the wells: a hole of radius one one step past each dive, through both faces.
const wells = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const well = new Set(), wet = new Set();
for (const w of wells) for (const q of g.disk(...w, 1)) { g.hole(...q); well.add(key(...q)); }
for (const w of wells) for (const q of g.ring(...w, 2)) wet.add(key(...q));
for (const p of R.cells) if (!p.hole && well.has(key(p.c, p.r))) throw new Error(`the road runs into a well at ${p.c},${p.r}`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const free = k => !well.has(k) && !wet.has(k) && !runout.top.has(k);

// ---- the stalls: on a lattice, wherever the whole stall stands two cells clear of the road on top.
const stall = new Map();                                     // cell -> {n, part: 'counter' | 'door' | 'rug' | 'merchant'}
let stalls = 0;
for (let i = 0; i < W / 7; i++) for (let j = 0; j < H / 8; j++) {
  const c = 7 * i + 3, r = mod(8 * j + 3 + (i % 2) * 4, H);
  const disk = g.disk(c, r, 2);
  if (!disk.every(q => R.local(T, ...q).d >= 2 && free(key(...q)))) continue;
  const door = Math.floor(hash(stalls * 17 + 3) * 12);
  g.ring(c, r, 2).forEach((q, n) => stall.set(key(...q), {n: stalls, part: n === door ? 'door' : 'counter'}));
  g.ring(c, r, 1).forEach(q => stall.set(key(...q), {n: stalls, part: 'rug'}));
  stall.set(key(c, r), {n: stalls, part: 'merchant'});
  stalls++;
}

// ---- the market and the cellars.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (well.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (wet.has(k)) ch = '=';
  else if (side === T) {
    const s = stall.get(k);
    if (s) ch = {counter: '#', door: '.', rug: '=', merchant: '^'}[s.part];
    else if (q.d >= 2 && n < 0.07) ch = '^';                                                           // the crowd
    else if (q.d >= 2 && hash(Math.floor(c / 4) * 13 + Math.floor(r / 4) * 31) < 0.1 && n < 0.5) ch = '>';  // spilt spice
  } else {
    if (q.d >= 3 && mod(c, 4) === 0 && mod(r, 5) !== 0) ch = '#';                                     // a row of crates
    else if (q.d >= 2 && n < 0.06) ch = '^';                                                          // a barrel
    else if (q.d >= 2 && mod(c, 4) === 2 && mod(r, 3) === 0) ch = '=';                                // sacks of grain
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [4, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [8, 3, 11, 5, 2, 9], crumbs: 2, steps: [6, 10, 4, 11], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a spice market.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (well.has(k) || wet.has(k)) return '#ff0066';
  if (side === B) return mod(c, 4) === 0 && q.d >= 3 ? '#b41e46' : '#993300';
  const s = stall.get(k);
  if (s) return s.n % 2 ? '#6600cc' : '#ff0066';
  return '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'bazaar', name: 'Level 99', kind: 'Bazaar', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

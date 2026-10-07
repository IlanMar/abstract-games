// Level 71 "Piano": a hard square level. A square world of 56 x 40: a keyboard of twelve white keys (four
// cells wide, thirty long) in a frame of void, and its eight black keys are holes right through it, from
// the back edge two thirds of the way to the front. The road plays the keyboard: it runs along the front of
// the keys, turns up under a black key and drops into it, comes back out on the other face, runs on to the
// next black key and drops into that one, eight notes, every one on the other face from the last; then it
// runs home along the front edge on top.
//   - the grooves between the white keys are walls on top in front of the black keys, a spike every
//     fifth cell, clear near the road; behind them, between the black keys, spikes on the key tops;
//   - underneath, the strings: a line of slow pads down the middle of every key;
//   - the front edge of the keys is lit with boost pads, the keys the road does not take are dark;
//   - long chains, '>=' gates between chains.
// Colour style, a concert hall: pink and raspberry keys by octave with violet grooves, a gold road;
// underneath wine and chocolate with a pink road.
// Stages: a chain through every note (up to the black key and back out), lead-in chains to the holes.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 40, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, Y0 = 4, Y1 = 33, KEYS = 12, BACK = 20;           // keys x 4..51, rows 4..33, black keys to row 20
g.floor(X0, Y0, X0 + 4 * KEYS - 1, Y1);
const BLACK = [0, 1, 3, 4, 5, 7, 8, 10];                          // a black key after these white keys
const cols = BLACK.map(i => X0 + 4 * i + 3);                     // the road's column under each black key
for (const c of cols) g.hole(c, Y0, c + 1, BACK);
const start = [30, 31];
let runs = `W26 N4 E3 N6 D`;                                     // top: along the front, up under the first black key
for (let k = 1; k < cols.length; k++) runs += ` S7 E${cols[k] - cols[k - 1]} N6 D`;   // out on the other face and on to the next
runs += ` S11 W17`;                                               // top: back to the front edge and home
const R = road(g, [...start, 'W'], runs);
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the keyboard, face by face.
for (let r = Y0; r <= Y1; r++) for (let c = X0; c < X0 + 4 * KEYS; c++) {
  if (g.get(T, c, r) === ' ') continue;
  const x = mod(c - X0, 4);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (side === T && x === 3 && r > BACK + 1 && r < Y1 - 1) ch = mod(r, 5) === 0 ? '^' : '#';   // the grooves
    else if (side === T && r <= BACK && (x === 1 || x === 2) && mod(r, 4) === 2) ch = '^';      // the key tops between the black keys
    else if (side === B && x === 1 && r > Y0 && r < Y1) ch = '=';                               // the strings
    else if (r === Y1 && mod(c, 2) === 0) ch = '>';                                             // the front lights
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, a concert hall: a shade per octave, violet grooves, a gold road.
const KEY = {top: ['#ff0088', '#ff0066'], bottom: ['#b41e46', '#993300']};
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (mod(c - X0, 4) === 3) return side === T ? '#550077' : '#550077';
  return KEY[side][Math.floor((c - X0) / 28) % 2];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'piano', name: 'Level 71', kind: 'Piano', start: [...start, 'W'], colors, grid: g};
if (require.main === module) console.log(g.print());

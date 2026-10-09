// Level 120 "Motherboard": a very hard level, a long one. A square world of 76 x 76 cells, an endless plane:
// a circuit board seen up close. The road is the main bus across it; chips of every size crowd the board,
// their bodies in wall and their legs in spikes, capacitors stand between them, traces of boost pads run
// in straight lines from chip to chip and vias (holes) pierce the board. The road goes through the board at
// four plated holes and runs the solder side, with its joints and its own traces. The thread is uneven:
// stages wait up to the edge of sight, crystals lead on along the bus, and at some bends only the painted
// road shows the turn.
//   - the chips: rectangles of wall (4 x 6 up to 8 x 12, and square processors with legs on all four sides)
//     laid wherever they stand clear of the road, with a leg (a spike) on every other cell along the long
//     sides, one cell out, and a row of empty board round them;
//   - capacitors: rings of wall round a spike, where a 5 x 5 square is clear;
//   - traces: boost pads on every sixth row and column in runs between the chips; vias: lone holes far from
//     the road;
//   - the solder side: a joint (a spike) under every leg, traces of slow pads;
//   - the plated holes: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a board under a lamp. On top a pink bus over a violet board with dark teal chips and
// olive capacitors, underneath a pale blue bus over chocolate; the holes glow wine.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 76, H = 76, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 70];
const R = road(g, [...start, 'N'],
  'N30 E16 N20 E30 S12 E14 N16 W8 N7 D'      // top: up the west, east, north, the long bus east, a jog and into a hole
  + ' S8 E14 S40 W30 N9 D'                   // the solder side: back, east, the long way south, west and up the second
  + ' S10 E28 N16 W10 S7 D'                  // top: back, east along the south, north, west and into the third
  + ' N6 W54 S33 D'                          // the solder side: back, the long bus west and south to the last
  + ' N6');                                  // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the plated holes: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
const glow = new Set();
const shine = k => { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); };
gap.forEach(shine);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const clear = (c, r) => R.local(T, mod(c, W), mod(r, H)).d >= 2 && !runout.top.has(key(mod(c, W), mod(r, H))) && !glow.has(key(mod(c, W), mod(r, H)));

// ---- the chips and the capacitors, laid greedily.
const SIZES = [[4, 6], [6, 4], [4, 8], [8, 4], [6, 10], [10, 6], [8, 8], [8, 12], [12, 8]];
const used = new Set(), body = new Set(), leg = new Set(), cap = new Map();
const free = cells => cells.every(([c, r]) => clear(c, r) && !used.has(key(mod(c, W), mod(r, H))));
const mark = (set, c, r, v) => set instanceof Map ? set.set(key(mod(c, W), mod(r, H)), v) : set.add(key(mod(c, W), mod(r, H)));
for (let n = 0; n < 2400; n++) {
  const c0 = Math.floor(hash(n * 4 + 1) * W), r0 = Math.floor(hash(n * 4 + 2) * H);
  const [w, h] = SIZES[Math.floor(hash(n * 4 + 3) * SIZES.length)], square = w === h;
  const area = [];
  for (let r = r0 - 2; r < r0 + h + 2; r++) for (let c = c0 - 2; c < c0 + w + 2; c++) area.push([c, r]);
  if (!free(area)) continue;
  area.forEach(([c, r]) => mark(used, c, r));
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) mark(body, c, r);
  const long = w >= h || square, tall = h >= w || square;
  if (long) for (let c = c0; c < c0 + w; c += 2) { mark(leg, c, r0 - 1); mark(leg, c, r0 + h); }
  if (tall) for (let r = r0; r < r0 + h; r += 2) { mark(leg, c0 - 1, r); mark(leg, c0 + w, r); }
}
for (let n = 0; n < 900; n++) {
  const c0 = Math.floor(hash(n * 4 + 7001) * W), r0 = Math.floor(hash(n * 4 + 7002) * H), area = [];
  for (let r = r0 - 2; r <= r0 + 2; r++) for (let c = c0 - 2; c <= c0 + 2; c++) area.push([c, r]);
  if (!free(area)) continue;
  area.forEach(([c, r]) => mark(used, c, r));
  for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) mark(cap, c, r, c === c0 && r === r0 ? '^' : '#');
}
// Vias: lone holes far from the road and off the chips.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) >= 4 && !used.has(key(c, r)) && hash(c * 53 + r * 97 + 11) < 0.012) gap.add(key(c, r));
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
gap.forEach(shine);

// ---- the board and its solder side.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (body.has(k)) ch = '#';
    else if (leg.has(k)) ch = '^';
    else if (cap.has(k)) ch = cap.get(k);
    else if (!used.has(k) && q.d >= 2 && (mod(r, 6) === 3 || mod(c, 6) === 3) && hash(Math.floor(c / 6) * 17 + Math.floor(r / 6) * 29 + (mod(r, 6) === 3 ? 1 : 2)) < 0.5) ch = '>';   // a trace
  } else {
    if (leg.has(k)) ch = '^';                                                                          // a joint
    else if (q.d >= 2 && (mod(r, 8) === 5 || mod(c, 8) === 5) && hash(Math.floor(c / 8) * 23 + Math.floor(r / 8) * 31) < 0.45) ch = '=';   // a trace
    else if (q.d >= 3 && n < 0.02) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [4, 9, 11, 6, 2, 10], crumbs: 2, steps: [8, 11, 7, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a board under a lamp.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#b41e46';
  if (side === B) return '#993300';
  if (body.has(k)) return '#444444';
  if (cap.has(k)) return '#993300';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'motherboard', name: 'Level 120', kind: 'Motherboard', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

// Level 30 "Barcode": a middle level. A square world of 48 x 48 cells, an endless plane printed with a
// barcode: on top the bars run north to south, underneath east to west, so whichever way the road goes on
// a face it keeps crossing them. The road dives through four scanner slots (a hole three cells across) and
// comes back on the other face, so half the run is underneath.
//   - thin bars are boost pads all the way, across the road too where the next bend is far ahead;
//   - thick bars are walls out in the field and slow pads near the road, and slow pads across the road:
//     the snake brakes through every thick bar it meets;
//   - a price tag (a ring of wall with spikes at its corners round a boost pad) on each wide empty patch.
// Colour concept: a neon shop at night. On top a pale pink road over violet with wine bars, underneath a
// caramel road over chocolate with wine bars; the price tags in raspberry.
// Stages: long chains, a chain through every pair of close bends, a lead-in chain right up to each slot
// and the next chain where the snake comes out, a launch on the longest straights.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 40];
const R = road(g, [...start, 'N'],
  'N22 E14 D'                   // top: up the west side and east into the first slot
  + ' W6 N10 E24 S20 D'         // underside: back, up, along the north and down the east into the second
  + ' N6 W12 S14 E12 D'         // top: back up, west, down the middle and east into the third
  + ' W8 S6 W20 N6 D'           // underside: back, down, the long south run west and up into the fourth
  + ' S8 W6 N4');               // top: down, west and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the scanner slots: the dive cell and its two neighbours across the road.
const slot = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) slot.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && slot.has(key(p.c, p.r))) throw new Error(`the road runs over a slot at ${p.c},${p.r}`);
for (const k of slot) g.hole(...k.split(',').map(Number));

// The barcode: bar n covers a band of columns (top) or lines (underside); kind 1 thin, 2 thick, 0 gap.
const code = [];
for (let x = 0; x < W;) {
  const gap = 2 + Math.floor(hash(x * 7 + 1) * 3), thick = hash(x * 13 + 5) < 0.4;
  for (let k = 0; k < gap && x < W; k++) code[x++] = 0;
  for (let k = 0; k < (thick ? 2 : 1) && x < W; k++) code[x++] = thick ? 2 : 1;
}
const bar = (side, c, r) => code[side === T ? c : r];

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- price tags: on the widest empty patches of each face, far from the road on both faces.
const tags = [];
for (const side of [T, B]) {
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const d = Math.min(R.local(side, c, r).d, R.local(OTHER[side], c, r).d + 2);
    if (d >= 5) cand.push([c, r, d]);
  }
  cand.sort((a, b) => b[2] - a[2] || hash(a[0] * 97 + a[1]) - hash(b[0] * 97 + b[1]));
  for (const [c, r] of cand) {
    if (tags.filter(t => t.side === side).length >= 3) break;
    if (tags.some(t => Math.abs(mod(t.c - c + W / 2, W) - W / 2) <= 9 && Math.abs(mod(t.r - r + H / 2, H) - H / 2) <= 9)) continue;
    let near = false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (slot.has(key(mod(c + dx, W), mod(r + dy, H)))) near = true;
    if (!near) tags.push({side, c, r});
  }
}
const tagAt = (side, c, r) => tags.find(t => t.side === side && Math.abs(mod(c - t.c + W / 2, W) - W / 2) <= 2 && Math.abs(mod(r - t.r + H / 2, H) - H / 2) <= 2);

// ---- the print, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (slot.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const b = bar(side, c, r);
  if (b === 1) ch = '>';
  else if (b === 2) ch = q.d >= 3 ? '#' : '=';
  const t = tagAt(side, c, r);
  if (t) {
    const dx = Math.abs(mod(c - t.c + W / 2, W) - W / 2), dy = Math.abs(mod(r - t.r + H / 2, H) - H / 2), ring = Math.max(dx, dy);
    ch = ring === 2 ? (dx === 2 && dy === 2 ? '^' : (dx === 0 || dy === 0) ? '.' : '#') : ring === 0 ? '>' : '.';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [6, 4], launch: 18, pair: 3, gate: i => R.at(i).side === T});
placeStages(g, R, stages);
putPads(g, R, pads);
// The bars across the road itself, on free road cells: slow pads always, boost pads only where the next
// bend or slot is at least eight cells ahead.
const nextMark = i => { for (let k = 1; k < R.length; k++) if (R.corners.includes(mod(i + k, R.length)) || R.at(i + k).hole) return k; return R.length; };
for (let i = 0; i < R.length; i++) {
  const p = R.at(i);
  if (p.hole || g.get(p.side, p.c, p.r) !== '.' || i < 11) continue;
  const b = bar(p.side, p.c, p.r);
  if (b === 2 || (b === 1 && nextMark(i) >= 8)) g.set(p.side, p.c, p.r, b === 2 ? '=' : '>');
}

// ---- colours: a neon shop at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (tagAt(side, c, r)) return '#ff0066';
  if (q.d === 1) return side === T ? '#ff0088' : '#b41e46';
  return bar(side, c, r) ? '#b41e46' : side === T ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'barcode', name: 'Level 30', kind: 'Barcode', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

// Level 102 "Kintsugi": a very hard level. A square world of 64 x 64 cells, an endless plane: a glazed
// bowl that broke into shards and was mended with gold. The road is the golden seam: it runs where the
// pieces were joined, and everywhere else the cracks are still open, lines of holes through the bowl, so a
// snake that strays off the seam soon drops through a crack to the other face. The road dives through four
// wide gaps and runs the unglazed underside of the bowl. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on along the seam, and at some bends only the gold shows the turn.
//   - the cracks: the edges of 46 shards (cells about as near two seeds), holes wherever they stand two
//     cells clear of the road on both faces; nearer the road they are mended (gold floor);
//   - the shards: each has its own glaze and its own motif, chosen by its seed: dots of slow pads, stripes
//     of boost pads, chipped edges (spikes along the cracks) or a plain glaze;
//   - the underside: the foot ring of the bowl, a ring of wall with gaps, and drips of glaze (slow pads);
//   - the gaps: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: kintsugi. On top a gold seam over shards of violet, wine and dark teal glaze with gold
// mends at the cracks, underneath a beige seam over chocolate clay; the gaps glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 64, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [10, 56];
const R = road(g, [...start, 'N'],
  'N20 E12 N16 W6 N8 E10 S4 E10 N4 E10 S10 D'   // top: up the west, east, a crook north and a step east into a gap
  + ' N8 E10 S12 W5 S6 E5 S12 W14 S8 D'         // underside: back, east, south with a jog and west up a gap
  + ' N8 W14 S6 D'                              // top: back, west and down into a third
  + ' N6 W18 S15 D'                             // underside: back, west and south into the last
  + ' N7');                                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wrapD = (a, b, n) => { const d = Math.abs(a - b); return Math.min(d, n - d); };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the gaps: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the shards: nearest seed; a crack where the two nearest seeds are about as near.
const seeds = [];
for (let n = 0; seeds.length < 46; n++) {
  const x = hash(n * 2 + 7) * W, y = hash(n * 2 + 8) * H;
  if (seeds.every(([u, v]) => Math.hypot(wrapD(x, u, W), wrapD(y, v, H)) >= 6)) seeds.push([x, y]);   // no two seeds too close
}
const shardOf = (c, r) => {
  let a = Infinity, b = Infinity, s = 0;
  seeds.forEach(([x, y], n) => { const d = Math.hypot(wrapD(c, x, W), wrapD(r, y, H)); if (d < a) { b = a; a = d; s = n; } else if (d < b) b = d; });
  return {s, crack: b - a < 0.85};
};
const shard = [], crack = new Set(), mend = new Set();
for (let r = 0; r < H; r++) { shard.push([]); for (let c = 0; c < W; c++) {
  const x = shardOf(c, r), k = key(c, r);
  shard[r].push(x.s);
  if (!x.crack) continue;
  if (near(c, r) >= 2 && !runout.top.has(k) && !runout.bottom.has(k) && !glow.has(k)) crack.add(k); else mend.add(k);
} }
for (const k of crack) gap.add(k);
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a gap at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const motif = c => ['dots', 'stripes', 'chips', 'plain'][Math.floor(hash(c * 3 + 1) * 4)];
const byCrack = (c, r) => R.nbrs(c, r).some(q => crack.has(key(...q)));

// ---- the glaze and the clay.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    const m = motif(shard[r][c]);
    if (m === 'dots' && mod(c, 3) === 1 && mod(r, 3) === 1) ch = '=';
    else if (m === 'stripes' && mod(c + r, 5) === 0 && q.d >= 2) ch = '>';
    else if (m === 'chips' && byCrack(c, r) && n < 0.5) ch = '^';
  } else {
    const ring = Math.hypot(wrapD(c, 32, W), wrapD(r, 32, H));
    if (Math.abs(ring - 20) < 0.6 && mod(Math.round(Math.atan2(r - 32, c - 32) * 8), 5) !== 0) ch = '#';   // the foot ring
    else if (byCrack(c, r) && n < 0.35) ch = '=';                                                            // a drip of glaze
    else if (q.d >= 3 && n < 0.03) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [6, 11, 3, 9, 2, 7], crumbs: 2, steps: [8, 11, 5, 10], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: kintsugi.
const GLAZE = ['#6600cc', '#b41e46', '#444444'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (glow.has(k)) return '#ff0066';
  if (mend.has(k)) return side === T ? '#ff6600' : '#ff5a28';
  if (side === B) return '#993300';
  return GLAZE[shard[r][c] % 3];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'kintsugi', name: 'Level 102', kind: 'Kintsugi', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

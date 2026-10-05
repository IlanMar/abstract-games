// Level 27 "Undertow": a middle classic level in the manner of Wave, Honeycomb and Twisted. A hex world,
// an endless plane (the 40 x 44 tile repeats) pierced by four wells. The road dives into every well and
// comes back on the other face under itself, so it runs twice on top and twice underneath:
//   - on top the surface: waves of slow pads with boost-pad crests roll across the whole plane, the road
//     included (Wave), and spikes stand like rocks beside the road every few cells (Twisted);
//   - underneath the depths: every well sits in a honeycomb ring of wall with gaps, and small cells of
//     wall round a boost pad lie on the open floor (Honeycomb), with ribbons of slow pads beside the road.
// Colour concept: the surface is pale blue water over violet, the depths are dark chocolate and wine with
// a caramel road; a raspberry glow round every well on both faces.
// Stages: long chains, one chain through every wiggle, a lead-in chain right up to each well and the next
// chain where the snake comes out underneath or on top; '>=' gates on the road on top between stages.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 40, H = 44, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 37];
const R = road(g, [...start, 'N'],
  'N13 NE6 N8 D'                     // top: up, a lean north-east, up into the first well
  + ' S7 SE8 S10 SE6 NE6 N16 D'       // underside: back down, south-east, a dip and up into the second well
  + ' S8 SE6 S10 D'                   // top: down the east side into the third well
  + ' N7 NE4 SE4 S11 D'               // underside: up, a wiggle round the east edge, down into the fourth
  + ' N6');                           // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sameCell = ([a, b], [c, d]) => a === c && b === d;

// ---- the wells: a disc of radius one one step past each dive cell, cut through both faces.
const wells = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const wellCell = new Set();
for (const w of wells) for (const q of g.disk(...w, 1)) { g.hole(...q); wellCell.add(key(...q)); }
for (const p of R.cells) if (!p.hole && wellCell.has(key(p.c, p.r))) throw new Error(`the road runs into a well at ${p.c},${p.r}`);
const ringOf = (c, r) => { for (const w of wells) for (let k = 2; k <= 3; k++) if (g.ring(...w, k).some(q => sameCell(q, [c, r]))) return k; return 0; };

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the surface: waves across the plane, rocks beside the road.
const xy = (c, r) => [c * 0.866, r + 0.5 * (c & 1)];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (wellCell.has(key(c, r))) continue;
  const q = R.local(T, c, r);
  const [x, y] = xy(c, r), wave = mod(Math.round(y + 0.6 * x), 7);
  let ch = '.';
  if (wave === 0) ch = mod(Math.round(x / 0.866), 4) === 0 ? '>' : '=';      // a wave with a crest every fourth cell
  if (q.d === 3 && mod(q.u, 5) === 0) ch = '^';                            // a rock
  if (q.d >= 6 && hash(c, r) < 0.03) ch = '^';
  if (ringOf(c, r) === 2) ch = '.';
  if (q.d === 0 || (/[#^]/.test(ch) && (q.d <= 1 || runout.top.has(key(c, r))))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
// ---- the depths: honeycomb rings round the wells, cells of wall on the open floor, ribbons beside the road.
const cells = [];
{
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, R.local(B, c, r).d]);
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  for (const [c, r, d] of cand) {
    if (d < 4) break;
    if (ringOf(c, r) || wells.some(w => g.disk(...w, 4).some(q => sameCell(q, [c, r])))) continue;
    if (cells.some(m => g.disk(...m, 4).some(q => sameCell(q, [c, r])))) continue;
    cells.push([c, r]);
  }
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (wellCell.has(key(c, r))) continue;
  const q = R.local(B, c, r);
  let ch = '.';
  const ring = ringOf(c, r);
  if (ring === 2) {
    const w = wells.find(w => g.ring(...w, 2).some(o => sameCell(o, [c, r])));
    ch = mod(g.ring(...w, 2).findIndex(o => sameCell(o, [c, r])), 3) === 1 ? '.' : '#';
  } else if (ring === 3) ch = '>';
  else if (q.d === 2 && mod(q.u, 4) < 3) ch = '=';
  const m = cells.find(m => g.disk(...m, 1).some(o => sameCell(o, [c, r])));
  if (m) ch = sameCell(m, [c, r]) ? '>' : mod(c + r, 3) === 0 ? '.' : '#';
  if (q.d === 0 || (/[#^]/.test(ch) && (q.d <= 1 || runout.bottom.has(key(c, r))))) ch = '.';
  if (ch !== '.') g.set(B, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [5, 3], pair: 3, gate: i => R.at(i).side === T});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours.
const glow = new Set();
for (const w of wells) for (const q of [...g.ring(...w, 2), ...g.ring(...w, 3)]) glow.add(key(...q));
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === T) { const [x, y] = xy(c, r); return mod(Math.round(y + 0.6 * x), 7) < 2 ? '#ff00ff' : q.d === 1 ? '#ff44aa' : '#6600cc'; }
  return q.d === 1 ? '#b41e46' : mod(Math.floor(q.d / 3), 2) ? '#993300' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'undertow', name: 'Level 27', kind: 'Undertow', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

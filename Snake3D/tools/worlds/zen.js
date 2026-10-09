// Level 109 "Zen Garden": a hard level. A hex world of 64 x 72 cells, an endless plane: a raked gravel garden
// by moonlight. The road is a path of stepping stones. Everywhere else the gravel is raked: in long wavy lines
// of slow pads across the garden, and round every rock in rings, so a snake that strays drags through the
// rake marks. Rocks stand in groups, stone lanterns here and there, and the path goes down into four koi
// ponds (holes) and runs the earth under the garden. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on along the stones, and at some bends only the stones show the turn.
//   - a rock: a hex of radius one in walls, with rings of rake marks (slow pads) at radius three and five;
//     rocks stand where the whole ring of five is clear of the road;
//   - the gravel: rake lines every third half-row (they wave with the hex columns), cut by the rings;
//   - the ponds: a hole of radius one one step past each dive, lily pads (boost pads) round it, moss round
//     that;
//   - stone lanterns (spikes) and moss (colour) here and there;
//   - underneath: roots (walls) in veins, pebbles (spikes), worm tracks (slow pads).
// Colour concept: a garden by moonlight. On top gold stepping stones over violet gravel with dark teal rocks
// and olive moss, underneath a pale blue path through chocolate earth; the ponds glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'N'],
  'N6 NW5 N6 NE5 N3 NE12 N4 NW5 N4 NE5 N3 NW6 N6 NE16 SE8 S10 D'   // top: up the west between the rocks, north-east, a crook and into a pond
  + ' N6 NE8 SE10 S8 SE5 S8 SW5 S9 SW6 D'                         // underneath: back, over to the east and down a winding way into the second
  + ' NE6 SE6 S4 SW4 S4 SE4 S2 SW10 D'                            // top: back, south-east, a wavering way down and into the third
  + ' NE10 SE12 S1 D'                                             // underneath: back over the edge into the last
  + ' N7');                                                       // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the ponds: a hole of radius one one step past each dive, lily pads and moss round it.
const ponds = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const pond = new Set(), lily = new Set(), moss = new Set();
for (const w of ponds) {
  for (const q of g.disk(...w, 1)) pond.add(key(...q));
  for (const q of g.ring(...w, 2)) lily.add(key(...q));
  for (const q of g.ring(...w, 3)) moss.add(key(...q));
}
for (const p of R.cells) if (!p.hole && pond.has(key(p.c, p.r))) throw new Error(`the road runs into a pond at ${p.c},${p.r}`);
for (const k of pond) g.hole(...k.split(',').map(Number));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the rocks and their rings.
const rocks = [];
for (let r = 2; r < H; r += 3) for (let c = 2; c < W; c += 2) {
  if (g.disk(c, r, 5).every(q => R.local(T, ...q).d >= 2 && !pond.has(key(...q)) && !lily.has(key(...q))) && rocks.every(([x, y]) => !g.disk(x, y, 10).some(q => key(...q) === key(c, r)))) rocks.push([c, r]);
}
const rock = new Set(), ring = new Set();
for (const [c, r] of rocks) {
  g.disk(c, r, 1).forEach(q => rock.add(key(...q)));
  for (const rad of [3, 5]) g.ring(c, r, rad).forEach(q => ring.add(key(...q)));
}
const inRings = new Set();
for (const [c, r] of rocks) g.disk(c, r, 6).forEach(q => inRings.add(key(...q)));
const rake = (c, r) => mod(Math.round(2 * r + (c % 2)), 6) === 0;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (hash(Math.floor(c / 6) * 13 + Math.floor(r / 6) * 31 + 4) < 0.12) moss.add(key(c, r));

// ---- the garden and the earth under it.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (pond.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (rock.has(k)) ch = '#';
    else if (lily.has(k)) ch = mod(c + r, 2) === 0 ? '>' : '.';                                   // lily pads
    else if (ring.has(k)) ch = '=';                                                               // a raked ring
    else if (!inRings.has(k) && rake(c, r)) ch = '=';                                             // a raked line
    else if (!inRings.has(k) && q.d >= 3 && n < 0.012) ch = '^';                                  // a stone lantern
  } else {
    if (q.d >= 3 && mod(c + 3 * r, 13) === 0 && n < 0.75) ch = '#';                              // a root
    else if (q.d >= 2 && n < 0.04) ch = '^';                                                      // a pebble
    else if (q.d >= 2 && mod(2 * c + r, 9) === 0 && n < 0.5) ch = '=';                            // a worm track
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {first: 13, lengths: [11, 14], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [4, 10, 7, 11, 2, 8], crumbs: 2, steps: [6, 10, 11, 7], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a garden by moonlight.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (pond.has(k) || lily.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (rock.has(k)) return '#444444';
  if (moss.has(k)) return '#993300';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'zen', name: 'Level 109', kind: 'Zen Garden', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

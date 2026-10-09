// Level 110 "Manhattan": a very hard level, a long one. A square world of 84 x 84 cells, an endless plane: a
// city on a grid. Avenues run north to south every twelve cells and streets east to west every six, and
// between them stand the buildings, solid blocks of wall with a sidewalk round them. The road drives only
// along the avenues and streets, turns only at the crossings, skirts Central Park and goes down into the
// subway at four entrances, the crossings themselves, to run the tunnels underneath. The thread is uneven:
// stages wait up to the edge of sight, crystals lead on down the long avenues, and at some bends only the
// painted road shows the turn.
//   - the city: a building on every block (the cells two clear of the street lines), here and there a
//     plaza with a fountain (a ring of boost pads round a spike) or a parking lot (rows of slow pads);
//     yellow cabs (walls of two cells) and crossings (slow pads) on the streets the road does not take;
//   - Central Park: a big block without streets or buildings, a lake (a hole where it is clear of the
//     road on both faces), trees (spikes) and winding paths (slow pads);
//   - the subway: the road's four entrances (the dive cell, its neighbours across and the cell past it),
//     tracks (slow pads) under every avenue and pillars (spikes) along the platforms.
// Colour concept: the city at night. On top a gold road on dark teal asphalt, rose sidewalks round violet
// blocks, an olive park, underneath a pale blue road through dark tunnels with chocolate platforms; the
// entrances and the lake glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 84, H = 84, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [2, 74];
const R = road(g, [...start, 'N'],
  'N36 E24 N18 E36 N12 E11 D'        // top: up the first avenue, east, up past the park, along its north side and into the subway
  + ' W12 S48 W24 N5 D'              // subway: back, the long tunnel south, west and up at the next entrance
  + ' S12 E24 S12 W23 D'             // top: down, east, down and west into the third
  + ' E6 S4 W42 S1 D'                // subway: back and the long tunnel west to the last
  + ' N6');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const avenue = c => mod(c, 12) === 2, street = r => mod(r, 6) === 2;
const park = (c, r) => c >= 27 && c <= 61 && r >= 21 && r <= 37;
const block = (c, r) => ({bx: Math.floor((c - 2) / 12), by: Math.floor((r - 2) / 6)});
const building = (c, r) => !park(c, r) && mod(c - 2, 12) >= 2 && mod(c - 2, 12) <= 10 && mod(r - 2, 6) >= 2 && mod(r - 2, 6) <= 4;

// ---- the subway entrances: the dive cell, its neighbours across and the cell past it.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
  gap.add(key(...g.move(p.c, p.r, p.h)));
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
// The lake: an ellipse in the park, where it stands two cells clear of the road on both faces.
const lake = new Set();
for (let r = 21; r <= 37; r++) for (let c = 27; c <= 61; c++) {
  const k = key(c, r);
  if (((c - 47) / 7) ** 2 + ((r - 30) / 3.5) ** 2 <= 1 && near(c, r) >= 2 && !runout.top.has(k) && !runout.bottom.has(k)) lake.add(k);
}
for (const k of lake) gap.add(k);
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const kindOf = (c, r) => { const {bx, by} = block(c, r), n = hash(bx * 17 + by * 31 + 9); return n < 0.1 ? 'plaza' : n < 0.18 ? 'lot' : 'tower'; };

// ---- the city and the subway.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (park(c, r)) {
      if (q.d >= 2 && n < 0.06) ch = '^';                                                         // a tree
      else if (mod(r - Math.round(29 + 5 * Math.sin(c / 4)), 9) === 0) ch = '=';                   // a path
    } else if (building(c, r)) {
      const kind = kindOf(c, r), x = mod(c - 2, 12) - 6, y = mod(r - 2, 6) - 3;
      if (kind === 'tower') ch = '#';
      else if (kind === 'plaza') ch = x === 0 && y === 0 ? '^' : Math.abs(x) <= 1 && Math.abs(y) <= 1 ? '>' : '.';   // a fountain
      else ch = y === 0 ? '=' : '.';                                                                // a parking lot
    } else if ((avenue(c) || street(r)) && q.d >= 2) {
      if (avenue(c) && street(r)) ch = '=';                                                         // a crossing
      else if (n < 0.08) ch = '#';                                                                  // a cab
    }
  } else {
    if (avenue(c) && q.d >= 2) ch = mod(r, 2) === 0 ? '=' : '.';                                    // the tracks
    else if (mod(c - 2, 12) === 4 && mod(r, 5) === 0 && q.d >= 2) ch = '^';                        // a pillar
    else if (building(c, r) && kindOf(c, r) === 'tower' && mod(c - 2, 12) >= 4 && mod(c - 2, 12) <= 8 && q.d >= 2) ch = '#';  // foundations
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [6, 11, 3, 9, 2, 8], crumbs: 2, steps: [11, 6, 9, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: the city at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k) || lake.has(k)) return '#ff0066';
  if (side === B) return avenue(c) ? '#993300' : '#444444';
  if (park(c, r)) return '#993300';
  if (building(c, r)) return kindOf(c, r) === 'tower' ? '#6600cc' : '#b41e46';
  if (avenue(c) || street(r)) return '#444444';
  return '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'manhattan', name: 'Level 110', kind: 'Manhattan', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

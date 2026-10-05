// Level 49 "Skyway": a hard hex level with relief, in the manner of the late classic levels (Shrivel,
// Zig-Zag, Absolute): islands over the void joined by bridges three cells wide, half the play on the
// underside, long chains and hundreds of pads. The islands stand at different heights, so every bridge
// is a ramp: the road climbs from the low start island up three steps to a summit four and a half cells
// high, runs off the end of the summit bridge, comes back underneath and down through the islands, and
// drops off a second bridge to come home on top.
//   - the bridges are lit like a train line: boost pads beside the road where it climbs, slow pads
//     where it runs downhill, every other cell;
//   - every island is a plaza ringed by spikes with walls between them, open where the road passes;
//   - on long straights a crystal, a boost strip and a long chain; between chains '>=' gates.
// Colour style, altitude: a white road; the floor runs from deep violet low down through purple and
// magenta to a gold summit; underneath the same in darker tones.
// Stages: long chains, a chain through every bend, a lead-in chain right up to each bridge end and the
// next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [6, 48];
const runs =
  'N14 NE10 SE8 NE8 N16 D'          // top: up the islands to the summit and off the end of its bridge
  + ' S10 SW8 S12 SE8 NE8 N12 D'    // underside: back down through the islands and off a bridge end
  + ' S16 SW25 NW9 N1';             // top: back south and round to the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the land: bridges (the road and one cell either side on either face) and an island at every bend.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const land = new Set(), island = new Map();
for (const p of probe.cells) if (!p.hole) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
const ISLAND = 3;
for (const k of probe.corners) { const p = probe.at(k); for (const q of g.disk(p.c, p.r, ISLAND)) { land.add(key(...q)); if (!island.has(key(...q))) island.set(key(...q), [p.c, p.r]); } }
// A dive needs the void: the dive cell and the one past it.
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- relief: fixed heights on some islands, the rest of the land relaxed between them, so every
// bridge is an even ramp.
const SUMMITS = [[[6, 40], 0], [[6, 34], 0], [[16, 29], 1.5], [[24, 33], 3], [[32, 29], 4.5], [[40, 38], 1.5], [[32, 42], 0.5], [[15, 53], 0]];
const fixed = new Map();
for (const [[c, r], h] of SUMMITS) for (const q of g.disk(c, r, 2)) if (land.has(key(...q))) fixed.set(key(...q), h);
const hgt = new Map([...land].map(k => [k, fixed.has(k) ? fixed.get(k) : 1.5]));
const nb = new Map([...land].map(k => [k, g.disk(...k.split(',').map(Number), 1).slice(1).map(q => key(...q)).filter(q => land.has(q))]));
for (let it = 0; it < 3000; it++) for (const k of land) {
  if (fixed.has(k)) continue;
  const list = nb.get(k);
  if (list.length) hgt.set(k, list.reduce((a, q) => a + hgt.get(q), 0) / list.length);
}
const quarter = v => Math.round(v * 4) / 4;
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (land.has(key(c, r)) ? quarter(hgt.get(key(c, r))) : 0)));
const hAt = (c, r) => height[r][c];

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the land, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const isl = island.get(k);
    const ring = isl ? g.ring(...isl, ISLAND).some(o => o[0] === c && o[1] === r) : false;
    if (ring && q.d >= 2) ch = mod(c + r, 2) ? '^' : '#';                       // the plaza's ring
    else if (q.d === 1) {
      // Train lights: boost where the road climbs, slow where it runs down.
      const a = R.at(q.i), b = R.at(q.i + 1);
      const rise = b.hole || a.hole ? 0 : hAt(b.c, b.r) - hAt(a.c, a.r);
      if (mod(q.u, 2) === 0) ch = rise > 0 ? '>' : rise < 0 ? '=' : '.';
    } else if (isl && q.d >= 2 && hash(c * 3 + (side === T ? 0 : 1), r) < 0.12) ch = side === T ? '>' : '=';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: long chains as in the late classic levels, launches and gates.
const {stages, pads} = autoStages(R, {lengths: [12, 16], lead: [6, 4], launch: 15, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, altitude: violet low down, purple, magenta, a gold summit; a white road.
const BANDS = {top: ['#6600cc', '#cc00ff', '#ff0088', '#ff6600'], bottom: ['#444444', '#6600cc', '#b41e46', '#993300']};
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  return BANDS[side][Math.min(3, Math.floor(hAt(c, r) / 1.5 + 0.25))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'skyway', name: 'Level 49', kind: 'Skyway', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) { const a = R.at(i), b = R.at(i + 1); if (!a.hole && !b.hole) worst = Math.max(worst, Math.abs(hAt(b.c, b.r) - hAt(a.c, a.r))); }
  console.log('steepest step on the road:', worst);
}

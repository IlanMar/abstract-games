// Level 37 "Docks": a middle-to-hard level. A square world of 48 x 40 cells: a quay along the south and
// four long piers reaching north into the dark water (the void). The road runs out along a pier to its
// end, falls off it, comes back along the other face of the same pier, crosses the quay to the next pier
// and goes out along that one: every pier is driven both ways, once on each face. The last pier brings it
// back on top, and the quay leads home along its south edge.
//   - piers five cells wide with bollards (walls) along both edges every fourth cell;
//   - the quay stacked with crates (walls) on top and coiled ropes (slow pads) underneath, away from the
//     road, with boost-pad mooring lights along its north edge;
//   - two short slipways between the piers, dead ends with a ramp of boost pads on top and a spike at the
//     tip underneath, and boats moored out in the water: islands with a sail of boost pads.
// Colour concept: a harbour at night. On top caramel planks over chocolate piers and a wine quay;
// underneath a pale lilac road over violet; the boats raspberry.
// Stages: long chains along the piers, a lead-in chain right up to each pier end and the next chain where
// the snake comes out; a launch on the long home run along the quay.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 40, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 36];
const R = road(g, [...start, 'N'],
  'N26 D'                     // top: out along the first pier and off its end
  + ' S24 E10 N20 D'          // underside: back, along the quay, out along the second pier
  + ' S21 E10 N24 D'          // top: back, along the quay, out along the third pier
  + ' S25 E10 N18 D'          // underside: back, along the quay, out along the fourth pier
  + ' S22 W30');              // top: back down to the quay's south edge and home along it
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const PIERS = [6, 16, 26, 36], SLIPS = [11, 31], QUAY = [31, 38];

// ---- the land.
const land = new Set();
for (let r = QUAY[0]; r <= QUAY[1]; r++) for (let c = 0; c < W; c++) land.add(key(c, r));
const tip = new Map(PIERS.map(c => [c, Math.min(...R.cells.filter(p => p.hole && p.c === c).map(p => p.r)) + 1]));
for (const c of PIERS) for (let r = tip.get(c); r < QUAY[0]; r++) for (let dc = -2; dc <= 2; dc++) land.add(key(c + dc, r));
for (const c of SLIPS) for (let r = 22; r < QUAY[0]; r++) for (let dc = -1; dc <= 1; dc++) land.add(key(c + dc, r));
// Boats: islands out in the water, clear of the road on both faces.
const boats = [[21, 14], [43, 18], [21, 4]];
const boatAt = new Map();
for (const [bc, br] of boats) for (let dr = -3; dr <= 3; dr++) for (let dc = -1; dc <= 1; dc++) {
  if (Math.abs(dr) === 3 && dc !== 0) continue;                       // a pointed bow and stern
  boatAt.set(key(bc + dc, br + dr), {dc, dr}); land.add(key(bc + dc, br + dr));
}
for (const p of R.cells) if (p.hole) { land.delete(key(p.c, p.r)); }
for (const p of R.cells) if (!p.hole && !land.has(key(p.c, p.r))) throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const k of boatAt.keys()) { const [c, r] = k.split(',').map(Number); if (Math.min(R.local(T, c, r).d, R.local(B, c, r).d) < 3) throw new Error(`a boat at ${k} is moored too near the road`); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- what stands on the land, face by face.
const pierOf = c => PIERS.find(x => Math.abs(c - x) <= 2), slipOf = c => SLIPS.find(x => Math.abs(c - x) <= 1);
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const boat = boatAt.get(k);
    if (boat) ch = boat.dc === 0 && Math.abs(boat.dr) <= 1 ? '>' : boat.dr === 3 || boat.dr === -3 ? (side === T ? '=' : '^') : '.';
    else if (r < QUAY[0] && pierOf(c) !== undefined) {
      if (Math.abs(c - pierOf(c)) === 2 && mod(r, 4) === 0) ch = '#';          // bollards
    } else if (r < QUAY[0] && slipOf(c) !== undefined) {
      if (side === T) ch = c === slipOf(c) && mod(r, 2) === 0 ? '>' : '.';     // a ramp
      else ch = r === 22 && c === slipOf(c) ? '^' : '=';
    } else if (r >= QUAY[0]) {
      if (r === QUAY[0]) ch = mod(c, 3) === 0 ? '>' : '.';                      // mooring lights
      else if (side === T) ch = mod(c, 6) < 2 ? '#' : '.';                       // crates
      else ch = mod(c + r, 4) === 0 ? '=' : '.';                                 // coiled ropes
    }
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [6, 4], launch: 16, pair: 3});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a harbour at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (boatAt.has(key(c, r))) return '#ff0066';
  if (r >= QUAY[0]) return mod(Math.floor(c / 6), 2) ? '#b41e46' : (side === T ? '#993300' : '#6600cc');
  return side === T ? '#993300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'docks', name: 'Level 37', kind: 'Docks', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

// Level 59 "Archipelago": a very hard hex level in the manner of the late classic levels Absolute and
// Shrivel. A hex world of 48 x 56, all void but islands three cells round at every bend, joined by bridges:
// every other bridge is a tightrope one cell wide, the rest are three cells wide with a wall right beside
// the road on one side (Absolute's staircase walls along the diagonals). The road crosses the islands on
// top, drops off the end of a bridge in the middle, crosses them again underneath and drops off the south
// end home.
//   - breadcrumbs as in Absolute: a trail of crystals four cells apart over every long tightrope;
//   - every island is ringed with slow pads, with spikes inside the ring where the road does not pass;
//   - stages of several groups at once, as in Snake Road: every fourth stage takes two chains together.
// Colour style, classic Twisted: bands of the violet-to-olive gradient by line, an orange road.
// Stages: long chains, a chain through every bend, lead-in chains to the ends, crystal trails.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [8, 48];
const runs =
  'N12 NE10 N10 NW6 N6 NE12 SE10 S14 SW6 S6 D'        // top: north over the islands, east and down into the middle
  + ' N8 NE6 N14 NW10 SW8 S10 SW6 S22 SW2 S6 D'        // underside: back north, round the north and down the west
  + ' N4';                                             // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the islands and bridges.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const runLen = s => probe.seg.filter((x, i) => x === s && !probe.at(i).hole).length;
const TIGHT = new Set();
const land = new Set();
probe.cells.forEach((p, i) => {
  if (p.hole) return;
  land.add(key(p.c, p.r));
  const s = probe.seg[i];
  if (mod(s, 2) === 1 && runLen(s) >= 9) { TIGHT.add(s); return; }
  for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
});
const ISLE = 3, isles = [];
for (const k of probe.corners) { const p = probe.at(k); isles.push([p.c, p.r]); for (const q of g.disk(p.c, p.r, ISLE)) land.add(key(...q)); }
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);
// The bridges of the real road: its stretches are numbered as the probe's.
const tightAt = i => TIGHT.has(R.seg[mod(i, R.length)]);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const turn = i => R.corners.includes(i) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };
const isleRing = (c, r) => isles.some(([ic, ir]) => g.ring(ic, ir, ISLE).some(([a, b]) => a === c && b === r));
const inIsle = (c, r) => isles.some(([ic, ir]) => g.disk(ic, ir, ISLE - 1).some(([a, b]) => a === c && b === r));

// ---- the land, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 1 && shielded(q.i) && !tightAt(q.i) && q.v === (mod(q.s, 2) ? -1 : 1)) ch = mod(q.u, 5) === 0 ? '^' : '#';   // staircase walls
    else if (isleRing(c, r) && q.d >= 1) ch = '=';
    else if (inIsle(c, r) && q.d >= 2 && mod(c + r, 3) === 0) ch = '^';
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: autoStages, crystal trails over the tightropes, two chains together every fourth stage.
let {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 0});
stages = stages.map(s => s.map(([kind, ...ix]) => {
  if (kind !== 'chain' || !tightAt(ix[0]) || !tightAt(ix[1]) || ix[1] - ix[0] < 9) return [kind, ...ix];
  return ['gems', ...Array.from({length: Math.floor((ix[1] - ix[0]) / 4) + 1}, (_, n) => ix[0] + 4 * n)];
}));
const merged = [];
for (let k = 0; k < stages.length; k++) {
  if (k % 4 === 2 && k + 1 < stages.length && stages[k].every(gr => gr[0] === 'chain') && stages[k + 1].every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > stages[k][0][1] && d < stages[k + 1][0][1])) { merged.push([...stages[k], ...stages[k + 1]]); k++; }
  else merged.push(stages[k]);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic Twisted: violet to olive by line, an orange road.
// The violet-to-olive half of Twisted: its blue end would hide the chains.
const TWISTED = ['#7744bb', '#7755aa', '#886699', '#887788', '#998877', '#aa9966', '#aaaa55'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  const b = Math.min(TWISTED.length - 1, Math.abs(r - 28) >> 2);
  return TWISTED[side === T ? TWISTED.length - 1 - b : b];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'archipelago', name: 'Level 59', kind: 'Archipelago', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

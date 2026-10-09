// Level 128 "Tortoise": a very hard hex level in the manner of the late classic levels Skeletal and Riddled,
// over the void. A hex world of 64 x 64 cells, all void but a tortoise seen from above: a round shell, and
// its head, tail and four legs reaching out along the six hex directions as ropes one cell wide, bent at
// the neck, the elbows and the knees. The road goes out along every limb on one face and drops off its tip
// to come back along it on the other, so each limb is a pier walked there and back; inside the shell it
// steps from limb to limb along the sides of a hexagon, radius six on top and nine underneath, the two
// faces taking turns. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the
// limbs, and at some bends only the painted road shows the turn.
//   - the shell: a hex disk of radius 14; on top the scutes: a ring groove at radius 4 and 10 and six
//     grooves out from the middle between the limbs (walls), growth rings of slow pads at radius 2, 7 and
//     12; underneath the plastron: seams of slow pads across, the middle seam in walls;
//   - the limbs: the road alone, bent beyond the shell; a foot (a disk of radius 2) near the end of each
//     leg with claws (spikes) and the head (a disk of radius 3) with eyes (walls); crystals four cells apart
//     along the ropes instead of chains;
//   - the dives: off the tip of every limb, six in all.
// Colour concept: a tortoise in the dark. On top a gold road over chocolate and rose scutes, violet skin;
// underneath a pale blue road over the dark teal plastron with chocolate seams.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads, BACK} = require('../road');
const kit = require('../worldkit');
const W = 64, H = 64, T = 'top', B = 'bottom';
const {mod, key, unkey, hash} = kit;
const C0 = [32, 32], RIM = 14, IN = {top: 6, bottom: 9};
// Each limb beyond the shell, as runs out from the rim; the last run carries on to the dive.
const LIMBS = {N: [['N', 4], ['NW', 2], ['N', 7]], NW: [['NW', 4], ['N', 3], ['NW', 6]], SW: [['SW', 5], ['S', 2], ['SW', 6]],
  S: [['S', 3], ['SE', 2], ['S', 6]], SE: [['SE', 5], ['S', 2], ['SE', 6]], NE: [['NE', 4], ['N', 3], ['NE', 6]]};
// The walk round: out along a limb on one face, back on the other, along a side of that face's hexagon to
// the next limb (each side heads from one limb's direction to the next's: N + SW = NW and so on).
const ORDER = [['N', T, 'SW'], ['NW', B, 'S'], ['SW', T, 'SE'], ['S', B, 'NE'], ['SE', T, 'N'], ['NE', B, 'NW']];
const out = [];
const add = (m, n) => { if (out.length && out[out.length - 1][0] === m) out[out.length - 1][1] += n; else out.push([m, n]); };
ORDER.forEach(([d, face, side], k) => {
  const back = k % 2 ? T : B;                       // the face the limb is walked back on
  add(d, RIM - IN[face]);
  LIMBS[d].forEach(([m, n]) => add(m, n));
  out.push(['D', 0]);
  [...LIMBS[d]].reverse().forEach(([m, n]) => add(BACK[m], n));
  add(BACK[d], RIM - IN[back]);
  add(side, IN[back]);
});
// The walk begins on top one cell out along the head's ray; it ends coming round to it.
const runsAll = out.map(([m, n]) => (m === 'D' ? 'D' : m + n));
const g0 = new Grid(W, H, true);
let s0 = C0;
for (let n = 0; n < IN.top + 1; n++) s0 = g0.step(...s0, 'N');
const start = s0;
const runs = ['N' + (+runsAll[0].slice(1) - 1), ...runsAll.slice(1), 'N1'].join(' ');

// ---- the land: the shell, the limbs (the road alone), the feet and the head.
const probe = road(g0, [...start, 'N'], runs);
const shell = new Set(g0.disk(...C0, RIM).map(q => key(...q)));
const land = new Set(shell), feet = new Set(), head = new Set();
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
probe.dives.forEach(i => {
  const isHead = probe.at(i).h === 'N' && probe.at(i).side === T, q = [probe.at(i - (isHead ? 4 : 3)).c, probe.at(i - (isHead ? 4 : 3)).r];
  for (const o of g0.disk(...q, isHead ? 3 : 2)) { land.add(key(...o)); (isHead ? head : feet).add(key(...o)); }
});
for (const p of probe.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not over the void`);
const g = new Grid(W, H, true);
for (const k of land) g.set('both', ...unkey(k), '.');
const R = road(g, [...start, 'N'], runs);
const tight = i => { const p = R.at(i); const k = key(p.c, p.r); return !shell.has(k) && !feet.has(k) && !head.has(k); };
const runout = kit.runouts(g, R);
const DIST = new Map([[key(...C0), 0]]);                  // hex distance from the middle
for (let d = 1; d <= RIM; d++) for (const q of g.ring(...C0, d)) DIST.set(key(...q), d);
const angle = (c, r) => mod(Math.atan2(-((r + mod(c, 2) / 2) - (C0[1] + mod(C0[0], 2) / 2)), (c - C0[0]) * Math.sqrt(3) / 2) * 180 / Math.PI, 360);
const groove = (c, r) => {
  const d = DIST.get(key(c, r));
  if (d === 4 || d === 10) return true;
  const off = Math.min(mod(angle(c, r), 60), 60 - mod(angle(c, r), 60));     // degrees off a groove between two limbs
  return d > 4 && off * d * Math.PI / 180 < 0.6;
};
const scute = (c, r) => { const d = DIST.get(key(c, r)); return d < 4 ? 0 : 1 + Math.floor(angle(c, r) / 60) + (d > 10 ? 6 : 0); };

// ---- the shell, the plastron and the limbs.
kit.paint(g, R, {cells: land, runout}, (side, c, r, q, n) => {
  const k = key(c, r), d = DIST.get(k);
  if (feet.has(k)) return q.d >= 2 ? '^' : '.';                                             // claws
  if (head.has(k)) return side === T && q.d === 2 ? '#' : '.';                               // eyes
  if (!shell.has(k)) return '.';
  if (side === T) {
    if (groove(c, r)) return '#';
    if (d === 2 || d === 7 || d === 12) return '=';                                         // growth rings
    return q.d >= 3 && n < 0.04 ? '^' : '.';
  }
  const y = r - C0[1];
  if (c === C0[0] || c === C0[0] - 1) return '#';                                           // the middle seam
  if ([-9, -4, 2, 7, 11].includes(y)) return '=';                                           // the seams across
  return q.d >= 3 && n < 0.03 ? '^' : '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread, trails of crystals along the limbs, two chains at once.
let {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [6, 10, 3, 8, 11, 5], crumbs: 3, steps: [9, 7, 11, 6], rails: 3});
const limb = i => tight(i) && !R.dives.some(d => mod(d - i, R.length) <= 4);   // not the lead-in to a dive
stages = kit.merge(R, kit.trails(stages, limb, 5));
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a tortoise in the dark.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (!shell.has(k)) return '#6600cc';
  if (side === B) return [-9, -4, 2, 7, 11].includes(r - C0[1]) ? '#993300' : '#444444';
  return scute(c, r) % 2 ? '#993300' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'tortoise', name: 'Level 128', kind: 'Tortoise', start: [...start, 'N'], colors, grid: g};
if (require.main === module) { console.log(g.print()); console.log(runs); }

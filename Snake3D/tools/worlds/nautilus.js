// Level 125 "Nautilus": a very hard hex level in the manner of the late classic level Spiral, over the
// void. A hex world of 72 x 72 cells, all void but a chambered nautilus shell, its head and a tentacle. On
// top the road comes up out of the head into the mouth of the shell and winds in along the siphuncle, the
// thread through the middle of every chamber, a turn and a quarter of a spiral through the doors of the
// septa, down to the first chamber of all, where it drops through. Underneath it cuts straight out across
// the back of the shell over its tiger stripes, through the head and down the tentacle, and drops off the
// tip; on top it comes back up the tentacle into the head. The thread is uneven: stages wait up to the edge
// of sight, crystals lead on down the tentacle, and at some bends only the painted road shows the turn.
//   - the shell: every cell within five of the spiral, and all it closes in; the spiral is a hex spiral of
//     sides 36 down to 5, shorter by two each time, so the whorls lie twelve columns apart;
//   - on top, the chambers: the sutures between the whorls in walls, septa across the whorl every 6 to 12
//     cells (longer outwards) in walls from two cells off the road, with a neck of slow pads round the road;
//     the chambers by turns hold gas (boost pads in bubbles), water (waves of slow pads) and deposits
//     (spikes);
//   - underneath, the back of the shell: tiger stripes of slow pads across the whorls, the darker ones in
//     walls away from the road, and pearls (spikes);
//   - the head: a disk of radius five with an eye (a wall in a ring of boost pads) and a hood of walls; the
//     tentacle is one cell wide, with three more curling off the head that the road does not take;
//   - the dive: the first chamber, a hole of radius one.
// Colour concept: a nautilus in the deep. On top a gold siphuncle through violet and rose chambers with
// chocolate septa, a caramel head; underneath a pale blue road over dark teal with chocolate tiger stripes.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 72, H = 72, T = 'top', B = 'bottom';
const {mod, key, unkey, hash} = kit;
const start = [10, 64];
const runs =
  'N36 NE22 SE20 S18 SW16 NW14 N12 NE10 SE8 S5 D'   // top: out of the head and in along the spiral to the first chamber
  + ' N6 NW6 SW10 S20 SW14 S13 D'                   // the back: straight out across the whorls, through the head and down the tentacle
  + ' N12';                                         // top: up the tentacle into the head
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const SPIRAL0 = 11;                                  // the spiral begins eleven cells up from the start
const dive = probe.dives[0];
const spiral = probe.cells.slice(SPIRAL0, dive);
const HEAD = [15, 60];

// ---- the land: the shell (the spiral's band and all it closes in), the head and the tentacles.
const g0 = new Grid(W, H, true);
const dist = new Map();                              // distance to the spiral
let front = spiral.map(p => [p.c, p.r]);
front.forEach(q => dist.set(key(...q), 0));
for (let d = 1; front.length && d <= 7; d++) {
  const next = [];
  for (const q of front) for (const o of g0.disk(...q, 1)) if (!dist.has(key(...o))) { dist.set(key(...o), d); next.push(o); }
  front = next;
}
const land = new Set();
for (const [k, d] of dist) if (d <= 6) land.add(k);
{ // fill what the shell closes in: everything the outside cannot reach
  const out = new Set(), stack = [[0, 0]];
  while (stack.length) {
    const q = stack.pop(), k = key(...q);
    if (out.has(k) || land.has(k)) continue;
    out.add(k);
    for (const o of g0.disk(...q, 1)) stack.push(o);
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!out.has(key(c, r))) land.add(key(c, r));
}
const shell = new Set(land);
const head = new Set(g0.disk(...HEAD, 5).map(q => key(...q)));
for (const k of head) land.add(k);
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
const curls = [];                                    // tentacles the road does not take
for (const [c0, a, f] of [[14, 2.2, 0.3], [18, 2.8, 1.4], [22, 3.2, 2.6]]) {
  for (let n = 0; n < 16; n++) {
    const r = 66 + n, c = Math.round(c0 + a * Math.sin(n / 3 + f));
    const k = key(c, mod(r, H));
    land.add(k); curls.push(k);
    if (n === 15) curls.tip = (curls.tip || []).concat(k);
  }
}
const g = new Grid(W, H, true);
for (const k of land) g.set('both', ...unkey(k), '.');
const R = road(g, [...start, 'N'], runs);
const pit = R.at(dive), gap = new Set();
for (const q of g.disk(pit.c, pit.r, 1)) if (!R.has(T, ...q) && !R.has(B, ...q)) gap.add(key(...q));
gap.add(key(pit.c, pit.r));
kit.punch(g, R, gap, 'the first chamber');
for (const k of gap) land.delete(k);
const glow = kit.glow(g, gap);
const runout = kit.runouts(g, R);
const tight = i => { const p = R.at(i); return !shell.has(key(p.c, p.r)) && !head.has(key(p.c, p.r)); };

// ---- the chambers: the spiral index of every shell cell, the septa along it.
const along = new Map();                             // cell -> index in the spiral of the nearest spiral cell
{
  let fr = spiral.map((p, i) => [p.c, p.r, i]);
  fr.forEach(([c, r, i]) => along.set(key(c, r), i));
  while (fr.length) {
    const next = [];
    for (const [c, r, i] of fr) for (const o of g.disk(c, r, 1)) if (shell.has(key(...o)) && !along.has(key(...o))) { along.set(key(...o), i); next.push([...o, i]); }
    fr = next;
  }
}
const SEPTA = [];
for (let i = spiral.length - 4, step = 6; i > 6; i -= step, step = Math.min(12, step + 0.5)) SEPTA.push(Math.round(i));
const septum = i => SEPTA.find(s => Math.abs(i - s) === 0);
const chamber = i => SEPTA.filter(s => s > i).length;
const suture = (c, r) => { const i = along.get(key(c, r)); return i !== undefined && g.disk(c, r, 1).some(o => { const j = along.get(key(...o)); return j !== undefined && Math.abs(j - i) > 20; }); };

// ---- the shell, the head and the tentacles.
kit.paint(g, R, {cells: land, keep: [glow], runout}, (side, c, r, q, n) => {
  const k = key(c, r), i = along.get(k), dS = dist.get(k);
  if (head.has(k) && !shell.has(k)) {
    const [hc, hr] = HEAD, eye = [hc + 3, hr - 2];
    if (c === eye[0] && r === eye[1]) return '#';
    if (g.disk(...eye, 1).some(o => o[0] === c && o[1] === r)) return side === T ? '>' : '=';
    if (side === T && g.ring(hc, hr, 5).some(o => o[0] === c && o[1] === r) && r < hr) return '#';   // the hood
    return n < 0.08 && side === B ? '^' : '.';
  }
  if (!shell.has(k)) return curls.tip && curls.tip.includes(k) ? '^' : '.';                       // a tentacle
  if (side === T) {
    if (suture(c, r)) return '#';
    if (i !== undefined && SEPTA.includes(i) && dS !== undefined) return q.d >= 2 ? '#' : '=';
    const kind = chamber(i === undefined ? 0 : i) % 3;
    if (kind === 0) return mod(c + 2 * r, 5) === 0 && q.d >= 2 ? '>' : '.';                     // gas
    if (kind === 1) return mod(Math.round(r + 2 * Math.sin(c / 2)), 4) === 0 ? '=' : '.';         // water
    return q.d >= 2 && n < 0.1 ? '^' : '.';                                                       // deposits
  }
  const stripe = mod(Math.round((i === undefined ? 0 : i) / 3 + 1.5 * Math.sin(c / 3)), 5);
  if (stripe === 0) return q.d >= 2 && hash(i || 0) < 0.5 ? '#' : '=';                            // a tiger stripe
  if (q.d >= 3 && n < 0.04) return '^';                                                           // a pearl
  return '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread round the spiral, trails of crystals down the tentacle, two chains at once.
let {stages, pads} = autoStages(R, {first: 13, lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [6, 10, 3, 8, 11, 5], crumbs: 3, steps: [9, 7, 11, 6], rails: 3});
stages = kit.merge(R, kit.trails(stages, tight));
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a nautilus in the deep.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (!shell.has(k)) return head.has(k) ? '#ff3300' : '#ff44aa';
  const i = along.get(k);
  if (side === B) return mod(Math.round((i === undefined ? 0 : i) / 3 + 1.5 * Math.sin(c / 3)), 5) === 0 ? '#993300' : '#444444';
  if (suture(c, r) || SEPTA.includes(i)) return '#993300';
  return chamber(i === undefined ? 0 : i) % 2 ? '#b41e46' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'nautilus', name: 'Level 125', kind: 'Nautilus', start: [...start, 'N'], colors, grid: g};
if (require.main === module) { console.log(g.print()); console.log('septa', SEPTA.length); }

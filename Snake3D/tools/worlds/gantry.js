// Level 58 "Gantry": a very hard square level in the manner of the late classic levels Skeletal and Dual.
// A square world of 56 x 56, all void but a steel frame: bridges three cells wide, and two of them only one
// cell wide (Skeletal's tightropes), joined by platforms at the bends. The road runs the frame on top,
// drops off the end of a bridge, runs a frame of its own underneath and drops off another end home.
//   - shields as in Shielded and Zig-Zag: on the long bridges a wall runs right beside the road on one
//     side, with a spike in it every fifth cell, from three cells after a bend to four before the next;
//   - Dual's rooms: the two biggest platforms carry blocks of wall and a ring of slow pads;
//   - breadcrumbs as in Skeletal: a trail of crystals four cells apart leads over each tightrope;
//   - stages of several groups at once, as in Snake Road: every fourth stage takes two chains together.
// Colour style, classic Trail: bands of raspberry and salmon by line (the teal of Dual would hide the
// glow of the chains), an orange road.
// Stages: long chains, a chain through every bend, lead-in chains to the ends, crystal trails.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [8, 46];
const runs =
  'N30 E14 S10 E16 N14 E8 N4 D'      // top: the west post, the north frame and off the north-east end
  + ' S30 W20 S13 E8 D'              // underside: down the east, west along a tightrope, down and off
  + ' W27 N4';                       // top: west along the south rail and home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the frame: three-cell bridges, tightropes, platforms at the bends, two rooms.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const TIGHT = new Set();                                    // stretches that are one cell wide
const land = new Set();
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
probe.cells.forEach((p, i) => {
  if (p.hole) return;
  const s = probe.seg[i];
  const tight = (p.side === T && p.r === 26 && p.c > 24 && p.c < 36) || (p.side === B && p.r === 37 && p.c > 28 && p.c < 44);
  if (tight) { TIGHT.add(s); return; }
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) land.add(key(p.c + a, p.r + b));
});
const ROOMS = [[22, 16], [46, 37]];
for (const k of probe.corners) {
  const p = probe.at(k), rad = ROOMS.some(([c, r]) => c === p.c && r === p.r) ? 4 : 2;
  for (let a = -rad; a <= rad; a++) for (let b = -rad; b <= rad; b++) land.add(key(p.c + a, p.r + b));
}
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.move(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the frame at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// Road cells far enough from every bend and dive for a shield: three after, four before.
const turn = i => R.corners.includes(i) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };

// ---- the frame, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const room = ROOMS.find(([rc, rr]) => Math.max(Math.abs(c - rc), Math.abs(r - rr)) <= 4);
    if (q.d === 1 && shielded(q.i) && q.v === (mod(q.s, 2) ? 1 : -1) && !TIGHT.has(q.s)) ch = mod(q.u, 5) === 0 ? '^' : '#';   // the shield
    else if (room && q.d >= 2) {
      const rd = Math.max(Math.abs(c - room[0]), Math.abs(r - room[1]));
      ch = rd === 4 ? '=' : (q.d >= 2 && rd <= 3 && mod(c + r, 2) === 0 ? '#' : '.');
    }
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: autoStages, a crystal trail before each tightrope, two chains together every fourth stage.
let {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0});
stages = stages.map(s => s.map(([kind, ...ix]) => {
  if (kind !== 'chain' || !TIGHT.has(R.seg[mod(ix[0], R.length)]) || ix[1] - ix[0] < 9) return [kind, ...ix];
  return ['gems', ...Array.from({length: Math.floor((ix[1] - ix[0]) / 4) + 1}, (_, n) => ix[0] + 4 * n)];
}).map(gr => (gr[0] === 'gems' && gr.length === 2 ? ['gem', gr[1]] : gr)));
const merged = [];
for (let k = 0; k < stages.length; k++) {
  if (k % 4 === 2 && k + 1 < stages.length && stages[k].every(gr => gr[0] === 'chain') && stages[k + 1].every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > stages[k][0][1] && d < stages[k + 1][0][1])) { merged.push([...stages[k], ...stages[k + 1]]); k++; }
  else merged.push(stages[k]);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic Trail: raspberry and salmon bands by line, an orange road.
const TRAIL = ['#ee3377', '#dd4466', '#dd5555', '#dd6655', '#dd5555', '#dd4466', '#ee3377', '#bb0077'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  return TRAIL[mod((r >> 2) + (side === T ? 0 : 4), TRAIL.length)];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'gantry', name: 'Level 58', kind: 'Gantry', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

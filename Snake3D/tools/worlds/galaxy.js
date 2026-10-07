// Level 69 "Galaxy": a very hard hex level. A hex world of 48 x 56, all void but a spiral galaxy: a core,
// a hex ring three cells round a black hole (a hole right through), and two arms that wind out from its
// north and south points, a turn of sixty degrees every few cells, longer and longer, like the arms of a
// galaxy. On top the road comes in along the south arm, rounds the east of the core and winds out along
// the north arm to its tip, and drops off it; underneath it comes back in along the north arm, rounds the
// west of the core, winds out along the south arm and drops off its tip, and on top it comes in again.
//   - the long outer stretches of the arms are tightropes one cell wide with a trail of crystals over it
//     (Skeletal, Absolute); the rest are three cells wide with a wall right beside the road on the outer
//     side, a spike every fifth cell, clear near the bends;
//   - the core: the black hole ringed with spikes on top and slow pads underneath, the ring itself lit
//     with boost pads on its outer edge;
//   - stars: little islands out in the void round the arms, a boost pad in a ring of slow pads;
//   - long chains, '>=' gates between chains.
// Colour style, deep space: the arms violet at the core to magenta and pink at the tips, the stars white,
// a gold road; underneath the same darker with a pink road.
// Stages: long chains, a chain through every bend, crystal trails, lead-in chains to the tips.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads, BACK} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C0 = [24, 28];
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const turnBy = (m, k) => DIRS[mod(DIRS.indexOf(m) + k, 6)];

// ---- the arms: outward from the core, turning clockwise; the south arm is the north one turned round.
const LENS = [3, 7, 10, 13, 15];
const armA = LENS.map((n, k) => [turnBy('N', k), n]);
const armB = LENS.map((n, k) => [turnBy('S', k), n]);
const out = arm => arm.map(([m, n]) => m + n).join(' ');
const inward = arm => arm.slice().reverse().map(([m, n]) => BACK[m] + n);
// The start lies on the south arm, on its second stretch inward from the tip.
const inB = inward(armB);
const SPLIT = 1, AT = 5;                           // start AT cells into stretch SPLIT of the way in
const [m0, n0] = inB[SPLIT].match(/^([A-Z]+)(\d+)$/).slice(1);
let start = C0;
for (let n = 0; n < 3; n++) start = g.step(...start, 'S');
for (const [m, n] of armB) for (let k = 0; k < n; k++) start = g.step(...start, m);   // the tip of the south arm
for (const run of inB.slice(0, SPLIT)) { const [, m, n] = run.match(/^([A-Z]+)(\d+)$/); for (let k = 0; k < +n; k++) start = g.step(...start, m); }
for (let k = 0; k < AT; k++) start = g.step(...start, m0);
const runs = [m0 + (+n0 - AT), ...inB.slice(SPLIT + 1), 'NE3 N3 NW3', out(armA), 'D',
  ...inward(armA), 'SW3 S3 SE3', out(armB), 'D', ...inB.slice(0, SPLIT), m0 + AT].join(' ');

// ---- the land: the core, the arms (three cells wide or a tightrope), the stars.
const probe = road(new Grid(W, H, true), [...start, m0], runs);
// The long outer stretches of the arms are tightropes.
const runLen = s => probe.seg.filter((x, i) => x === s && !probe.at(i).hole).length;
const TIGHT = s => runLen(s) >= 12;
const land = new Set();
for (const q of g.disk(...C0, 4)) land.add(key(...q));
const coreCells = new Set(land);
probe.cells.forEach((p, i) => {
  if (p.hole) return;
  land.add(key(p.c, p.r));
  if (!TIGHT(probe.seg[i]) || coreCells.has(key(p.c, p.r))) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
});
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const STARS = [];
for (let r = 3; r < H - 3; r += 6) for (let c = 3; c < W - 3; c += 7) {
  const sc = c + Math.floor(hash(c, r) * 4), sr = r + Math.floor(hash(r, c) * 4);
  if (hash(c * 7, r) < 0.35 || sc >= W - 2 || sr >= H - 2) continue;
  if (g.disk(sc, sr, 3).some(q => land.has(key(...q))) || STARS.some(([a, b]) => Math.abs(a - sc) + Math.abs(b - sr) < 6)) continue;
  STARS.push([sc, sr]);
}
for (const [c, r] of STARS) for (const q of g.disk(c, r, 1)) land.add(key(...q));
for (const q of g.disk(...C0, 1)) land.delete(key(...q));              // the black hole
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, m0], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);
const tightAt = i => TIGHT(R.seg[mod(i, R.length)]) && !coreCells.has(key(R.at(i).c, R.at(i).r));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const turn = i => R.corners.includes(mod(i, R.length)) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };
const distC = new Map();
for (let k = 0; k <= 4; k++) for (const q of g.ring(...C0, k)) distC.set(key(...q), k);

// ---- the galaxy, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const dc = distC.get(k);
    const star = STARS.find(([sc, sr]) => sc === c && sr === r);
    if (star) ch = '>';
    else if (dc === undefined && q.d === 1 && STARS.some(([sc, sr]) => g.ring(sc, sr, 1).some(([a, b]) => a === c && b === r))) ch = '=';
    else if (dc === 2) ch = side === T ? '^' : '=';                                         // round the black hole
    else if (dc === 4) ch = '>';                                                            // the core's rim
    else if (dc === undefined && q.d === 1 && shielded(q.i) && q.v === 1) ch = mod(q.u, 5) === 0 ? '^' : '#';   // the arm walls
    if (/[#^]/.test(ch) && (dc !== undefined ? q.d <= 1 : false)) ch = '.';
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: crystal trails over the tightropes.
let {stages, pads} = autoStages(R, {first: 8, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
stages = stages.map(s => s.map(([kind, ...ix]) => {
  if (kind !== 'chain' || ix[1] - ix[0] < 7) return [kind, ...ix];
  for (let i = ix[0]; i <= ix[1]; i++) if (!tightAt(i) || R.corners.includes(mod(i, R.length))) return [kind, ...ix];
  return ['gems', ...[...new Set([...Array.from({length: Math.floor((ix[1] - ix[0]) / 4) + 1}, (_, n) => ix[0] + 4 * n), ix[1]])]];
}));
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, deep space: violet at the core to pink at the tips, white stars, a gold road (white comes out teal, like the chains).
const SHADE = {top: ['#550077', '#6600cc', '#cc00ff', '#ff0088', '#ff44aa'], bottom: ['#550077', '#550077', '#6600cc', '#b41e46', '#ff0066']};
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  if (STARS.some(([sc, sr]) => g.disk(sc, sr, 1).some(([a, b]) => a === c && b === r))) return side === T ? '#ffffff' : '#ff44aa';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const far = Math.hypot((c - C0[0]) * 0.866, r - C0[1]);
  return SHADE[side][Math.min(4, Math.floor(far / 5))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'galaxy', name: 'Level 69', kind: 'Galaxy', start: [...start, m0], colors, grid: g};
if (require.main === module) console.log(g.print());

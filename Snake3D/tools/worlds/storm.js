// Level 85 "Storm": a very hard level. A hex world of 48 x 56 cells, mostly void: a thunderstorm at night.
// The land is the lightning itself, a jagged bolt three cells wide that zigzags up the sky on top, forks
// off its tip to the underside and zigzags back down, with storm clouds floating free round it. The bolt
// bends every six cells, the road dives four times, and half the run is on the underside. The thread is
// uneven: stages wait up to the edge of sight, crystals lead on along the bolt, and at some bends only the
// glowing bolt shows the turn.
//   - static: a boost pad on the edge of the bolt every fourth cell, so a snake that drifts off the middle
//     is thrown forward;
//   - clouds: islands of radius three over the void, away from the bolt, with rain (spikes) and slow pads;
//   - the bolt tips: the dive cell, the cell past it and the cells beside both stay void.
// Colour concept: lightning at night. On top a gold bolt with a violet glow over grey clouds, underneath
// a pale ice bolt with a dark grey glow over dark grey clouds.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [8, 48];
const R = road(g, [...start, 'N'],
  'N8 NE6 N6 NE6 N6 NE6 N6 D'      // top: the bolt zigzags up north-east and forks off its tip
  + ' S6 SE6 S8 SE6 S8 D'          // underside: back down, zigzagging south-east, off the lower tip
  + ' N6 NW4 SW8 S8 D'             // top: up, a kink west, down the middle and off
  + ' N6 NW8 SW10 S12 D'           // underside: up, the long kink south-west and down off the bottom
  + ' N6');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the land: the bolt (one cell either side of the road on either face) and the clouds.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const cloud = new Set(), clouds = [];
for (let r = 3; r < H - 3; r += 2) for (let c = 4; c < W - 4; c += 2) {
  if (clouds.length >= 7) break;
  const disk = g.disk(c, r, 3);
  if (disk.every(q => near(...q) >= 4) && clouds.every(([x, y]) => Math.hypot(x - c, y - r) > 9)) { clouds.push([c, r]); disk.forEach(q => cloud.add(key(...q))); }
}
for (const k of cloud) land.add(k);
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  const past = g.step(p.c, p.r, p.h);
  for (const q of [[p.c, p.r], past]) for (const o of [q, ...R.nbrs(...q)]) if (!R.has(p.side, ...o) && !R.has(p.side === T ? B : T, ...o)) pit.add(key(...o));
  pit.add(key(p.c, p.r));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a bolt tip at ${p.c},${p.r}`);
for (const k of pit) land.delete(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- static on the bolt, rain on the clouds.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (cloud.has(k)) ch = mod(c + 2 * r, 5) === 0 ? '^' : mod(c + r, 3) === 0 ? '=' : '.';
    else if (q.d === 1 && mod(q.u, 4) === 0) ch = '>';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {first: 9, lengths: [11, 14], lead: [4, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [6, 2, 10, 4, 11, 3], crumbs: 2, steps: [10, 5, 11, 7], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: lightning at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ffffff' : '#999999');
  if (cloud.has(key(c, r))) return side === T ? '#999999' : '#444444';
  return side === T ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'storm', name: 'Level 85', kind: 'Storm', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

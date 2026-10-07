// Level 61 "Zigzag": a very hard hex level in the manner of the late classic level Zig-Zag. A hex world of
// 48 x 56, all void but bridges three cells wide that zigzag across it: three bands on top (east, west,
// east), joined by straights up the ends, then off the east end, a fourth band underneath (west) and a
// long straight down the west side underneath, off its end home. Every leg of a zigzag is six cells,
// every bend sixty degrees, and every bend stands on a small island.
//   - Zig-Zag's tunnels: on the long straights the road runs between two walls right beside it ('#j#'),
//     a spike in them every fifth cell;
//   - on the zigzags a shield of slow pads on the outer side and boost lights on the inner side;
//   - stages of several groups at once, as in Zig-Zag: in the middle band three chains together.
// Colour style, classic bonus levels: bands of deep violet to indigo by line, a gold road.
// Stages: long chains, a chain through every pair of close bends, lead-in chains to the ends.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [3, 47];
const runs =
  'NE11 SE6 NE6 SE6 NE6 SE4 NE4 N10'          // top: the south band, east, and up the east end
  + ' NW6 SW6 NW6 SW6 NW6 SW6 NW4 N10'        // top: the middle band, west, and up the west end
  + ' NE6 SE6 NE6 SE6 NE6 SE6 NE4 D'          // top: the north band, east, and off its end
  + ' SW6 NW2 N10 NW6 SW6 NW6 SW6 NW6 SW4'    // underside: back, up and the far north band, west
  + ' S38 SW2 D NE1';                         // underside: down the west side and off its end; top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the bridges and the islands at the bends.
const probe = road(new Grid(W, H, true), [...start, 'NE'], runs);
const land = new Set();
for (const p of probe.cells) if (!p.hole) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
for (const k of probe.corners) { const p = probe.at(k); for (const q of g.disk(p.c, p.r, 2)) land.add(key(...q)); }
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'NE'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const turn = i => R.corners.includes(i) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };
const straight = i => R.at(i).h === 'N' || R.at(i).h === 'S';
// The side of the road on the outside of the next bend: the zigzag shield goes there.
const outside = i => { let k = i; while (!R.corners.includes(k) && k < i + 12) k++; const a = R.at(k), b = R.at(k + 1);
  const order = ['N', 'NE', 'SE', 'S', 'SW', 'NW']; return mod(order.indexOf(b.h) - order.indexOf(a.h), 6) === 1 ? -1 : 1; };

// ---- the bridges, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 1 && straight(q.i) && shielded(q.i)) ch = mod(q.u, 5) === 0 ? '^' : '#';      // tunnels
    else if (q.d === 1 && !straight(q.i)) ch = q.v === outside(q.i) ? '=' : (mod(q.u, 2) ? '>' : '.');
    else if (q.d >= 2) ch = mod(c + r, 4) === 0 ? '^' : '.';
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: three chains together in the middle band.
const {stages, pads} = autoStages(R, {first: 8, lengths: [13, 16], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0});
const middle = s => R.at(s[0][1]).side === T && R.at(s[0][1]).r >= 27 && R.at(s[0][1]).r <= 33;
const merged = [];
for (let k = 0; k < stages.length; k++) {
  const take = middle(stages[k]) ? 3 : 1;   // never across a tunnel: a group behind the snake there is out of reach
  let group = [...stages[k]], n = 1;
  while (n < take && k + n < stages.length && stages[k + n].every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > stages[k][0][1] && d < stages[k + n][0][1])) { group.push(...stages[k + n]); n++; }
  merged.push(group);
  k += n - 1;
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic bonus: deep violet to indigo by line, a gold road.
const BONUS = ['#550077', '#440088', '#440099', '#330099', '#3300aa', '#2200bb', '#3300aa', '#330099', '#440099', '#440088'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  return BONUS[mod((r >> 1) + (side === T ? 0 : 5), BONUS.length)];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'zigzag', name: 'Level 61', kind: 'Zigzag', start: [...start, 'NE'], colors, grid: g};
if (require.main === module) console.log(g.print());

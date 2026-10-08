// Level 92 "Salt Flats": a hard level, a big one, after the classic Vents and Trail. A square world of
// 80 x 80 cells, an endless plane of dark salt crust with no road painted on it: the way is shown only by
// the items, and the items are few. The road (unseen) runs a big loop and dives four times, so a third of
// the run is on the underside. On the way it hooks round salt vents: a pit ringed by an octagon of spikes,
// and the chain of that stage curls round the pit inside the ring (Vents). Between the vents there is
// only a lone crystal now and then, up to eleven cells off and sometimes round a bend, so at every stage
// the player has to look for the next item before turning (Trail).
//   - vents: the road bumps round a pit (the cells inside the bump, open through both faces), an octagon
//     of spikes six cells out with the road for its doors, slow pads on the floor inside; and four more
//     vents out on the open flat, decoys with no road;
//   - between the vents: a '=>=' gate on the road on the long runs, ridges of crust (short walls) and
//     clusters of salt spikes from two cells out, salt pillars (2 x 2 walls) far out;
//   - underneath: the same vents seen from below, and rails of slow pads along the underside runs.
// Stages: a chain round every vent, a lead-in chain up to every dive and one where the snake comes out,
// a crystal just past every lone bend, and single crystals at most eleven cells apart on the long runs;
// every third stage on a long run is a crystal and the next chain together, in either order.
// Colour concept: a salt flat by moonlight. Dark grey crust with violet cracks on top, violet crust with
// dark grey cracks underneath, no road; the pits glow raspberry, the vent floors wine.
const {Grid} = require('../grid');
const {road, placeStages, putPads} = require('../road');
const W = 80, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [10, 70];
const R = road(g, [...start, 'N'],
  'N10 E3 N5 W3 N14 E3 N5 W3 N13'          // top: up the west run past two vents
  + ' E12 N3 E5 S3 E14 N3 E5 S3 E10 D'     // top: the north run past two more and into a pit
  + ' W8 S14 W3 S5 E3 S12 E12 S3 E5 N3 E6 D'   // underside: back, south past a vent, east past another, up a pit
  + ' W7 S12 W3 S5 E3 S4 W26 S3 W5 N3 W10 D'   // top: back, south past a vent, the south run west past one more
  + ' E6 N4 W20 S5 D'                      // underside: back, west and down into the last pit
  + ' N7');                                // top: up into the start
const L = R.length, at = R.at;
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wrapD = (a, b, n) => { const d = Math.abs(a - b); return Math.min(d, n - d); };

// ---- the vents: every run of four bends close together is a bump round a pit.
const hooks = [], lone = [], bends = [];
for (let n = 0; n < R.corners.length;) {
  let m = n;
  while (m + 1 < R.corners.length && R.corners[m + 1] - R.corners[m] <= 5) m++;
  // Four bends or more: a bump (its pit under the first four) and maybe a bend just after it.
  if (m - n >= 3) hooks.push({from: R.corners[n], bump: R.corners[n + 3], to: R.corners[m]});
  else if (m > n) bends.push([R.corners[n], R.corners[m]]);           // two or three bends close together
  else lone.push(R.corners[n]);
  n = m + 1;
}
const pit = new Set(), vents = [];
for (const h of hooks) {
  const cells = [];
  for (let i = h.from; i <= h.bump; i++) cells.push(at(i));
  const cs = cells.map(p => p.c), rs = cells.map(p => p.r);
  const c0 = Math.min(...cs), c1 = Math.max(...cs), r0 = Math.min(...rs), r1 = Math.max(...rs);
  for (let r = r0 + 1; r < r1; r++) for (let c = c0 + 1; c < c1; c++) pit.add(key(c, r));
  vents.push({side: cells[0].side, c: (c0 + c1) / 2, r: (r0 + r1) / 2, road: true});
}
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
// Decoy vents out on the open flat: a pit of 2 x 2 and a ring, far from the road on both faces.
for (let r = 8; r < H && vents.length < hooks.length + 4; r += 4) for (let c = 8; c < W && vents.length < hooks.length + 4; c += 4) {
  if (near(c, r) >= 10 && vents.every(v => Math.max(wrapD(c, v.c, W), wrapD(r, v.r, H)) >= 16)) {
    vents.push({side: 'both', c: c + 0.5, r: r + 0.5, road: false});
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pit.add(key(c + dx, r + dy));
  }
}
const pits = new Set(pit);
for (const p of R.cells) if (p.hole) pits.add(key(p.c, p.r));
for (const p of R.cells) if (!p.hole && pits.has(key(p.c, p.r))) throw new Error(`the road runs over a pit at ${p.c},${p.r}`);
for (const k of pits) g.hole(...k.split(',').map(Number));
const ventAt = (c, r) => {
  for (const v of vents) {
    const dx = wrapD(c, v.c, W), dy = wrapD(r, v.r, H);
    const o = Math.max(Math.max(dx, dy), (dx + dy) / 1.5);
    if (o <= 6.5) return {v, ring: o > 5.5};
  }
  return null;
};
const glow = (c, r) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (pits.has(key(mod(c + dx, W), mod(r + dy, H)))) return true; return false; };

// ---- the crust: salt polygons round scattered seeds, cracks where two seeds are about as near.
const seeds = [];
for (let n = 0; seeds.length < 60; n++) seeds.push([hash(n * 2 + 1) * W, hash(n * 2 + 2) * H]);
const crack = (c, r) => {
  let a = Infinity, b = Infinity;
  for (const [x, y] of seeds) {
    const d = Math.hypot(wrapD(c, x, W), wrapD(r, y, H));
    if (d < a) { b = a; a = d; } else if (d < b) b = d;
  }
  return b - a < 1;
};

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the flat, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (pits.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  const va = ventAt(c, r);
  if (va) {
    if (va.ring) ch = q.d >= 2 ? '^' : '.';                                                         // the spike octagon
    else if (mod(c + r, 3) === 0) ch = '=';                                                         // the vent floor
  } else if (side === T) {
    const ridge = hash(Math.floor(c / 6) * 31 + Math.floor(r / 6) * 57);
    if (q.d >= 3 && ridge < 0.22 && (ridge < 0.11 ? mod(r, 6) === 3 && mod(c, 6) < 4 : mod(c, 6) === 3 && mod(r, 6) < 4)) ch = '#';  // a ridge
    else if (q.d >= 2 && ridge > 0.85 && n < 0.35) ch = '^';                                         // salt spikes
    else if (q.d >= 6 && mod(c, 17) <= 1 && mod(r, 13) <= 1) ch = '#';                              // a salt pillar
  } else {
    if (q.d === 2 && mod(q.u, 2) === 0) ch = '=';                                                   // rails along the underside runs
    else if (q.d >= 3 && n < 0.05) ch = '^';
    else if (q.d >= 4 && mod(c, 9) === 4 && mod(r, 9) < 3) ch = '#';
  }
  if (/[#^]/.test(ch) && (runout[side].has(k) || glow(c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages, by road index: chains round the vents and at the dives, crystals past lone bends, and
// lone crystals at most eleven cells apart between them.
const FIRST = 26;                                    // past the first vent; the first 2 s the snake runs on its own
const anchors = [];                                   // [from, to, kind] in road order
for (const h of hooks) anchors.push([h.from - 3, h.to + 2, 'chain']);
for (const k of R.dives) anchors.push([k - 4, k - 1, 'chain'], [k + 1, k + 6, 'chain']);
for (const [a, b] of bends) anchors.push([a - 3, b + 2, 'chain']);
// A crystal three cells past a lone bend, unless a chain takes the bend or that cell.
for (const k of lone) if (!anchors.some(([a, b]) => (k >= a && k < b) || (k + 3 >= a - 1 && k + 3 <= b + 1))) anchors.push([k + 3, k + 3, 'gem']);
const norm = ([a, b, t]) => { const s = mod(a - FIRST, L) + FIRST; return [s, s + (b - a), t]; };
const list = [];
for (const x of anchors.map(norm).filter(([a]) => a > FIRST + 1).sort((p, q) => p[0] - q[0])) {
  const last = list[list.length - 1];
  if (last && x[0] <= last[1] + 1 && last[2] === 'chain' && x[2] === 'chain') last[1] = Math.max(last[1], x[1]);   // chains that overlap merge
  else list.push(x);
}
const stages = [[['gem', FIRST]]];
let pos = FIRST, n3 = 0;
const crumbsTo = a => { const gap = a - pos, k = Math.max(0, Math.ceil(gap / 11) - 1); return Array.from({length: k}, (_, j) => pos + Math.round(gap * (j + 1) / (k + 1))); };
for (const [a, b, t] of list) {
  const crumbs = crumbsTo(a), group = t === 'gem' ? ['gem', a] : ['chain', a, b];
  if (crumbs.length && n3++ % 3 === 2) {
    crumbs.slice(0, -1).forEach(i => stages.push([['gem', i]]));
    stages.push([['gem', crumbs[crumbs.length - 1]], group]);        // a crystal and the next item together
  } else {
    crumbs.forEach(i => stages.push([['gem', i]]));
    stages.push([group]);
  }
  pos = b;
}
crumbsTo(L + FIRST).forEach(i => stages.push([['gem', i]]));    // round to the first stage of the next lap
placeStages(g, R, stages, {bends: 1});
// '=>=' gates on the long free runs of the road itself.
const used = new Set();
for (const s of stages) for (const [kind, ...ix] of s) for (let i = ix[0]; i <= (kind === 'chain' ? ix[1] : ix[0]); i++) used.add(mod(i, L));
const pads = [];
for (let i = FIRST + 3; i < L - 3; i++) {
  if (mod(i, 13) !== 0) continue;
  if ([-2, -1, 0, 1, 2].some(d => used.has(mod(i + d, L)) || at(i + d).hole || R.corners.includes(mod(i + d, L)))) continue;
  pads.push([i - 1, '='], [i, '>'], [i + 1, '=']);
}
putPads(g, R, pads);

// ---- colours: a salt flat by moonlight, no road.
const colorOf = side => (c, r) => {
  if (glow(c, r)) return '#ff0066';
  const va = ventAt(c, r);
  if (va && !va.ring) return '#b41e46';
  if (crack(c, r)) return side === T ? '#6600cc' : '#444444';
  return side === T ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'saltflats', name: 'Level 92', kind: 'Salt Flats', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

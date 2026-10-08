// Level 92 "Salt Flats": a hard level, a big one, made to make the player think. A square world of 80 x 80
// cells, an endless plane of salt crust with almost nothing on it. The road is only a faint lighter track,
// and the stages are sparse: short chains far apart, often at the edge of sight, a few crumbs eleven cells
// apart, and at every other bend nothing but the faint track to show the turn. On the open flat the snake
// can go anywhere, so at every stage the player has to look for the next item, far off, before turning.
// Four sinkholes take the road to the underside and back.
//   - the crust: salt polygons with darker cracks between them (colour only);
//   - cairns: lone walls, and a few salt pillars (2 x 2 walls), far from the road;
//   - dust devils: a ring of boost pads round a spike, far out on the flat;
//   - sinkholes: the dive cell and its neighbours across the road, and four more far from the road.
// Colour concept: a salt flat by moonlight. On top a faintly lighter grey-turquoise track over dark grey
// crust with violet cracks (dark, so the items glow on it from far off), underneath a rose track over
// violet with dark grey cracks; the sinkholes glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages} = require('../road');
const W = 80, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [10, 72];
const R = road(g, [...start, 'N'],
  'N44 E30 N16 E26 D'           // top: the long track north, east, north and east into the first sinkhole
  + ' W8 S40 W20 D'             // underside: back, the long track south and west into the second
  + ' E8 S16 E20 D'             // top: back east, south and east into the third
  + ' W8 S6 W49 S4 D'           // underside: back, south and the long track west into the fourth
  + ' N7');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const wrapD = (a, b, n) => { const d = Math.abs(a - b); return Math.min(d, n - d); };

// ---- sinkholes: the road's four (the dive cell and its neighbours across the road) and four decoys.
const sink = new Set(), sinks = [];
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) sink.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
  sinks.push([p.c, p.r]);
}
for (let r = 5; r < H && sinks.length < 8; r += 7) for (let c = 5; c < W && sinks.length < 8; c += 7) {
  if (near(c, r) >= 9 && sinks.every(([x, y]) => Math.max(wrapD(c, x, W), wrapD(r, y, H)) >= 16)) { sinks.push([c, r]); sink.add(key(c, r)); }
}
for (const p of R.cells) if (!p.hole && sink.has(key(p.c, p.r))) throw new Error(`the road runs over a sinkhole at ${p.c},${p.r}`);
for (const k of sink) g.hole(...k.split(',').map(Number));
const glow = (c, r) => sinks.some(([x, y]) => Math.max(wrapD(c, x, W), wrapD(r, y, H)) <= 1);

// ---- the crust: salt polygons round scattered seeds, cracks where two seeds are about as near.
const seeds = [];
for (let n = 0; seeds.length < 60; n++) seeds.push([hash(n * 2 + 1) * W, hash(n * 2 + 2) * H]);
const crack = (c, r) => {
  let a = Infinity, b = Infinity;
  for (const [x, y] of seeds) {
    let dx = Math.abs(c - x), dy = Math.abs(r - y); dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy);
    const d = Math.hypot(dx, dy);
    if (d < a) { b = a; a = d; } else if (d < b) b = d;
  }
  return b - a < 1;
};

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the flat, nearly empty, face by face.
const devils = [];
for (let r = 9; r < H && devils.length < 5; r += 11) for (let c = 13; c < W && devils.length < 5; c += 11) {
  if (near(c, r) >= 8 && !glow(c, r) && sinks.every(([x, y]) => Math.max(wrapD(c, x, W), wrapD(r, y, H)) >= 6)) devils.push([c, r]);
}
const devil = (c, r) => { for (const [x, y] of devils) { const k = Math.max(wrapD(c, x, W), wrapD(r, y, H)); if (k <= 1) return k; } return -1; };
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (sink.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d <= 1) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  const dv = side === T ? devil(c, r) : -1;
  if (dv === 0) ch = '^';
  else if (dv === 1) ch = '>';
  else if (q.d >= 4 && n < 0.012) ch = '#';                                                           // a cairn
  else if (q.d >= 6 && mod(c, 17) <= 1 && mod(r, 13) <= 1 && hash(Math.floor(c / 17) * 7 + Math.floor(r / 13)) < 0.4) ch = '#';  // a salt pillar
  if (/[#^]/.test(ch) && (runout[side].has(k) || glow(c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: sparse. Short chains, long waits up to the edge of sight, few and far crumbs, and every
// other lone bend left to the faint track.
const {stages} = autoStages(R, {lengths: [7, 9], lead: [4, 3], launch: 0,
  gaps: [10, 11, 8, 11, 9, 11], crumbs: 3, steps: [11, 10, 11], rails: 1});
placeStages(g, R, stages, {bends: 1});

// ---- colours: a salt flat by moonlight.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (glow(c, r)) return '#ff0066';
  if (q.d === 0) return side === T ? '#999999' : '#b41e46';
  if (crack(c, r)) return side === T ? '#6600cc' : '#444444';
  return side === T ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'saltflats', name: 'Level 92', kind: 'Salt Flats', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());

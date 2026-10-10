// Level 132 "Little Planet": an open world with no edge. A square world of 192 x 192 cells that is land
// everywhere and wraps round both ways, a small planet: go east long enough and the snake comes back from
// the west, go north and it comes back from the south. There is no route: the twenty-eight artifacts lie
// out at once, in one stage, and the HUD counts the ones found (open: true). With no coast to steer by,
// the player reads the planet itself:
//   - the latitude is the floor colour: lilac ice at the pole (the top and bottom rows, which meet), pink
//     tundra, chocolate forest, caramel steppe and sand at the equator in the middle;
//   - three great circles that go all the way round, raspberry and clear of anything sharp: the equator
//     and two meridians; the start is just south of where the east meridian crosses the equator;
//   - the relief (height): rolling hills and mountains up to 8.75 cells high, every slope at most half a
//     cell per cell; on the mountains cliffs of walls with passes;
//   - rivers of slow pads that wind across the latitudes, lakes in the lowlands and crevasses in the ice,
//     open through both faces: under the planet a cave world of its own (purple and dark teal, veins of
//     rock, spikes, pools), reached only through them.
// The latitudes: ice (seracs, boost-pad ice, frost spikes), tundra (boulders), forest (trees in rows),
// steppe (grass of slow pads, rocks), desert (cacti, hollow mesas); mountains above a height of five.
// Artifacts: the kinds of the other open worlds (shrines, vents, stone circles, tunnels, runways, beacons,
// gauntlets, dives into lakes) and the meander (a chain that zigzags round two pockets). Every site finds
// its own ground in its latitude, as far as it can from the artifacts on its face (at least 24 cells, round
// the wrap); beacons in the mountains look for high ground. Checks: every artifact can be reached from the
// start by the movement rules, nothing sharp beside a great circle, no slope steeper than half a cell, the
// renderer's limit of walls round the head; TERRA_DRAFT=1 reports problems instead of failing.
// Colour concept: a little planet at sunset. Warm latitudes from lilac ice to sand, raspberry great
// circles, rock-wine mountains; underneath, a cool cave world of purple and dark teal.
const {Grid, isItem} = require('../grid');
const {mod, key, unkey, hash} = require('../worldkit');
const W = 192, H = 192, T = 'top', B = 'bottom';
const other = side => (side === T ? B : T);
const STEP = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const DRAFT = !!process.env.TERRA_DRAFT;
const wk = (c, r) => key(mod(c, W), mod(r, H));                       // the key of a cell, round the wrap
const wrapD = (a, b, n) => { const d = Math.abs(mod(a, n) - mod(b, n)); return Math.min(d, n - d); };
const dist = (c, r, c2, r2) => Math.hypot(wrapD(c, c2, W), wrapD(r, r2, H));

// ---- noise that wraps round the planet: the lattice repeats every W / size cells (size divides 192).
const lat = (i, j, s, p) => hash(mod(i, p) + mod(j, p) * 1009 + s * 1018081);
const smooth = t => t * t * (3 - 2 * t);
function vnoise(x, y, size, s) {
  const p = W / size, fx = x / size, fy = y / size, i = Math.floor(fx), j = Math.floor(fy), u = smooth(fx - i), v = smooth(fy - j);
  const a = lat(i, j, s, p), b = lat(i + 1, j, s, p), c = lat(i, j + 1, s, p), d = lat(i + 1, j + 1, s, p);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, size, s) => (4 * vnoise(x, y, size, s) + 2 * vnoise(x, y, size / 2, s + 1) + vnoise(x, y, size / 4, s + 2)) / 7;
const rnd = (c, r, s) => hash(mod(c, W) * 7919 + mod(r, H) * 104729 + s * 15485863);

// ---- the relief, in quarters of a cell: hills from wrapping noise, then every cell kept within two
// quarters of its neighbours by lowering the peaks (a slope of at most half a cell per cell).
const EQUATOR = 96, MERIDIANS = [32, 128];
let q = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => {
  const f = 0.7 * vnoise(c, r, 48, 1) + 0.3 * vnoise(c, r, 24, 2);
  return Math.round(35 * Math.max(0, Math.min(1, (f - 0.45) / 0.4)));
}));
for (let changed = true; changed;) {
  changed = false;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const low = Math.min(q[mod(r - 1, H)][c], q[mod(r + 1, H)][c], q[r][mod(c - 1, W)], q[r][mod(c + 1, W)]);
    if (q[r][c] > low + 2) { q[r][c] = low + 2; changed = true; }
  }
}
const hq = (c, r) => q[mod(r, H)][mod(c, W)];

// ---- the latitudes and the mountains: the region of a cell.
const BANDS = [['desert', 0.16], ['steppe', 0.36], ['forest', 0.58], ['tundra', 0.8], ['ice', 2]];
const latitude = (c, r) => wrapD(r, EQUATOR, H) / (H / 2) + (fbm(c, r, 24, 5) - 0.5) * 0.14;   // 0 at the equator, 1 at the pole
const regionMap = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => {
  if (q[r][c] >= 20) return 'mountain';
  const e = latitude(c, r);
  return BANDS.find(([, top]) => e < top)[0];
}));
const regionOf = (c, r) => regionMap[mod(r, H)][mod(c, W)];

// ---- holes through both faces: lakes in the lowlands, crevasses in the ice. land: 1 ground, 2 hole.
const land = Array.from({length: H}, () => new Uint8Array(W).fill(1));
const holes = new Set();
const dig = (c, r) => { c = mod(c, W); r = mod(r, H); holes.add(key(c, r)); land[r][c] = 2; };
const LAKES = [];
for (let r = 6; r < H; r += 24) for (let c = 6 + (r / 24 % 2) * 12; c < W; c += 24) {
  // a lake in the lowest cell of every 24 x 24 patch that is low enough and not on a great circle
  let best = null;
  for (let y = r; y < r + 12; y++) for (let x = c; x < c + 12; x++) if (!best || hq(x, y) < hq(best[0], best[1])) best = [x, y];
  const [x, y] = best;
  if (hq(x, y) > 2 || regionOf(x, y) === 'ice' || hash(x * 31 + y) < 0.35) continue;
  if (wrapD(y, EQUATOR, H) < 8 || MERIDIANS.some(m => wrapD(x, m, W) < 8)) continue;
  const rad = 1.6 + hash(x + y * 7) * 1.6;
  LAKES.push([mod(x, W), mod(y, H), rad]);
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++)
    if (Math.hypot(dx, dy) < rad + (vnoise(x + dx, y + dy, 3, 7) - 0.5) * 1.2) dig(x + dx, y + dy);
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (regionOf(c, r) === 'ice' && mod(c, 23) === 11 && mod(r + Math.floor(c / 23) * 7, 17) < 4 && hash(Math.floor(c / 23) * 13 + Math.floor(r / 17)) < 0.6) dig(c, r);   // a crevasse
const ground = (c, r) => land[mod(r, H)][mod(c, W)] === 1;
const nearVoid = (c, r, d = 1) => {
  for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (!ground(c + dx, r + dy)) return true;
  return false;
};

// ---- the great circles: the equator and two meridians, all the way round.
const circle = new Set();
for (let c = 0; c < W; c++) circle.add(key(c, EQUATOR));
for (const m of MERIDIANS) for (let r = 0; r < H; r++) circle.add(key(m, r));
for (const k of circle) if (holes.has(k)) throw new Error(`a great circle runs over a hole at ${k}`);
const circleZone = new Set();
for (const k of circle) { const [c, r] = unkey(k); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) circleZone.add(wk(c + dx, r + dy)); }
const nearCircle = (c, r) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (circle.has(wk(c + dx, r + dy))) return true;
  return false;
};
// Rivers: slow pads along winding lines of a noise of their own, two cells wide.
const river = (c, r) => Math.abs(fbm(c, r, 48, 30) - 0.5) < 0.012 && hq(c, r) < 14;

// ---- the artifacts, by site.
const place = s => (x, y) => {
  const h = s.kind === 'vent' ? 0.5 : 0;
  x -= h; y -= h;
  if (s.mirror) x = -x;
  for (let k = 0; k < (s.rot || 0); k++) [x, y] = [-y, x];
  return [mod(s.c + x + h, W), mod(s.r + y + h, H)];
};
const box = (s, x0, y0, x1, y1) => { const p = place(s), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(p(x, y)); return out; };
const pitOf = s => { const n = s.pit || 1; return box(s, 1 - n, 1 - n, n, n); };
const long = s => s.kind === 'tunnel' || s.kind === 'runway' || s.kind === 'gauntlet';
function footprint(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return box(s, -6 - n, -6 - n, 7 + n, 7 + n);
  if (long(s)) return box(s, -6, -3, 17, 3);
  if (s.kind === 'meander') return box(s, -6, -3, 16, 5);
  return box(s, -7, -7, 7, 7);
}
function core(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return [...box(s, -5 - n, -5 - n, 6 + n, 6 + n), ...box(s, -n - 1, 7 + n, n + 2, 9 + n)];
  if (long(s)) return box(s, -5, -2, 16, 2);
  if (s.kind === 'meander') return box(s, -5, -2, 15, 4);
  if (s.kind === 'shrine') return [...box(s, -5, -5, 5, 5), ...box(s, -1, 6, 1, 8)];
  if (s.kind === 'circle') return [...box(s, -6, -6, 6, 6), ...box(s, -9, -1, 9, 1)];
  return box(s, -6, -6, 6, 6);
}
const centre = s => (long(s) || s.kind === 'meander' ? place(s)(5, 0) : [s.c, s.r]);
const clear = {top: new Set(), bottom: new Set()};
const block = {top: new Set(), bottom: new Set()};
const blocked = {top: new Uint8Array(W * H), bottom: new Uint8Array(W * H)};   // block as flags, for the search below
const spots = [];
const sites = [];
const reserve = (side, cells) => {
  for (const [c, r] of cells) {
    clear[side].add(wk(c, r));
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { block[side].add(wk(c + dx, r + dy)); blocked[side][mod(r + dy, H) * W + mod(c + dx, W)] = 1; }
  }
};
function commit(s, cells = footprint(s)) {
  reserve(s.side, cells.filter(p => ground(...p)));
  if (s.kind === 'vent') {
    for (const [c, r] of pitOf(s)) dig(c, r);
    reserve(other(s.side), pitOf(s));
  }
  if (s.kind !== 'dive') spots.push([s.side, ...centre(s)]);
  sites.push(s);
}

// The start: on the east meridian just south of the equator, heading north; the crossing kept clear.
const start = [MERIDIANS[1], EQUATOR + 12, 'N'];
reserve(T, box({c: MERIDIANS[1], r: EQUATOR, kind: ''}, -6, -6, 6, 14));

// Dives: a chain into a lake from 10 cells off, straight, with a crystal underneath where the snake comes out.
function diveAt(lake, dir) {
  const [lc, lr] = lake, [dx, dy] = STEP[dir];
  let c = lc, r = lr, n = 0;
  while (!ground(c, r) && n++ < 8) { c -= dx; r -= dy; }                 // back out of the lake
  const line = [];
  for (let k = 0; k < 12; k++) { line.unshift([mod(c, W), mod(r, H)]); c -= dx; r -= dy; }
  return {kind: 'dive', side: T, dir, line};
}
const diveCells = s => {
  const [ax, ay] = s.dir === 'N' || s.dir === 'S' ? [1, 0] : [0, 1], near = [], back = [];
  s.line.forEach(([x, y], i) => {
    for (let k = -2; k <= 2; k++) near.push([mod(x + ax * k, W), mod(y + ay * k, H)]);
    if (i >= s.line.length - 9) for (let k = -1; k <= 1; k++) back.push([mod(x + ax * k, W), mod(y + ay * k, H)]);
  });
  return {near, back};
};
for (let n = 0; n < 2; n++) {
  let best = null;
  for (const lake of LAKES) for (const dir of Object.keys(STEP)) {
    const s = diveAt(lake, dir), {near, back} = diveCells(s);
    if (s.line.some(([c, r]) => !ground(c, r)) || near.some(([c, r]) => block.top.has(wk(c, r)) || circleZone.has(wk(c, r)))) continue;
    if (back.some(([c, r]) => block.bottom.has(wk(c, r)))) continue;
    const [x, y] = s.line[s.line.length - 1];
    let score = dist(x, y, start[0], start[1]);
    for (const [side, qc, qr] of spots) if (side === T) score = Math.min(score, dist(x, y, qc, qr));
    if (!best || score > best.score) best = {s, score, near, back};
  }
  if (!best) throw new Error('no lake for a dive');
  const {s, near, back} = best;
  commit(s, near);
  reserve(B, back.filter(p => ground(...p)));
  spots.push([T, ...s.line[s.line.length - 1]], [B, ...s.line[s.line.length - 2]]);
}

// The other sites find their ground in their latitude (the caves underneath: anywhere).
const AUTO = [
  {kind: 'vent', side: T, region: 'ice', ring: '^'}, {kind: 'beacon', side: T, region: 'ice'},
  {kind: 'circle', side: T, region: 'tundra'}, {kind: 'shrine', side: T, region: 'tundra'},
  {kind: 'shrine', side: T, region: 'forest'}, {kind: 'tunnel', side: T, region: 'forest'},
  {kind: 'runway', side: T, region: 'steppe'}, {kind: 'meander', side: T, region: 'steppe'},
  {kind: 'beacon', side: T, region: 'desert'}, {kind: 'vent', side: T, region: 'desert', ring: '=', pit: 2}, {kind: 'meander', side: T, region: 'desert'},
  {kind: 'beacon', side: T, region: 'mountain', high: true}, {kind: 'beacon', side: T, region: 'mountain', high: true}, {kind: 'tunnel', side: T, region: 'mountain'},
  {kind: 'shrine', side: B}, {kind: 'vent', side: B, ring: '^'}, {kind: 'circle', side: B}, {kind: 'tunnel', side: B}, {kind: 'runway', side: B},
  {kind: 'beacon', side: B}, {kind: 'beacon', side: B}, {kind: 'beacon', side: B}, {kind: 'gauntlet', side: B}, {kind: 'meander', side: B},
];
// The search tries every other cell of the planet for every site: the shapes are worked out once per kind,
// turn and flip as offsets from the site's cell, and tested on flat arrays.
const zone = new Uint8Array(W * H);
for (const k of circleZone) { const [c, r] = unkey(k); zone[r * W + c] = 1; }
const shapes = new Map();
const shapeOf = (s, part) => {
  const id = `${part}|${s.kind}|${s.rot}|${s.mirror}|${s.pit}`;
  if (!shapes.has(id)) {
    const cells = (part === 'core' ? core : part === 'pit' ? pitOf : footprint)({...s, c: 0, r: 0});
    shapes.set(id, Int16Array.from(cells.flatMap(([x, y]) => [x > W / 2 ? x - W : x, y > H / 2 ? y - H : y])));
  }
  return shapes.get(id);
};
const fits = s => {
  const at = (o, i) => mod(s.r + o[i + 1], H) * W + mod(s.c + o[i], W);
  const cr = shapeOf(s, 'core'), fp = shapeOf(s, 'foot'), own = blocked[s.side], top = s.side === T;
  for (let i = 0; i < cr.length; i += 2) if (land[mod(s.r + cr[i + 1], H)][mod(s.c + cr[i], W)] !== 1) return false;
  for (let i = 0; i < fp.length; i += 2) { const j = at(fp, i); if (own[j] || (top && zone[j])) return false; }
  if (s.kind === 'vent') {
    const pit = shapeOf(s, 'pit'), far = blocked[other(s.side)];
    for (let i = 0; i < pit.length; i += 2) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const j = mod(s.r + pit[i + 1] + dy, H) * W + mod(s.c + pit[i] + dx, W);
      if (far[j] || zone[j]) return false;
    }
  }
  return true;
};
const rotations = s => (s.kind === 'shrine' ? [0, 1, 2, 3] : long(s) || s.kind === 'circle' || s.kind === 'meander' ? [0, 1] : [0]);
AUTO.forEach((s, k) => {
  let best = null;
  for (let r = 0; r < H; r += 2) for (let c = 0; c < W; c += 2) {
    if (s.region && regionOf(c, r) !== s.region) continue;
    for (const rot of rotations(s)) {
      const t = {...s, c, r, rot, mirror: k % 2 === 1};
      if (!fits(t)) continue;
      const [x, y] = centre(t);
      let score = dist(x, y, start[0], start[1]) + (s.side === B ? 1000 : 0);
      for (const [side, qc, qr] of spots) if (side === s.side) score = Math.min(score, dist(x, y, qc, qr));
      const rank = s.high ? Math.min(score, 40) + hq(x, y) : score;      // a summit beacon: far enough, then high
      if (score >= 24 && (!best || rank > best.rank)) best = {t, score, rank};
    }
  }
  const what = `the ${s.kind} in the ${s.region || 'caves'} on ${s.side}`;
  if (!best) { if (DRAFT) { console.log(`no ground for ${what}`); return; } throw new Error(`no ground for ${what} 24 cells from the others`); }
  commit(best.t);
  if (DRAFT) console.log(`${s.kind} ${s.side} ${s.region || 'caves'}: ${best.t.c},${best.t.r} rot ${best.t.rot}, ${best.score.toFixed(1)} apart, height ${hq(...centre(best.t)) / 4}`);
});
const g = new Grid(W, H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground(c, r)) g.set('both', c, r, '.');

// ---- the latitudes, face by face. Nothing sharp next to a hole, a great circle or a site.
const lattice = (c, r, n, s) => hash(Math.floor(mod(c, W) / n) * 53 + Math.floor(mod(r, H) / n) * 1297 + s * 7);
function topTile(c, r, n) {
  if (river(c, r)) return '=';
  switch (regionOf(c, r)) {
    case 'ice': {
      if (lattice(c, r, 8, 1) < 0.35 && mod(c, 8) >= 3 && mod(c, 8) <= 4 && mod(r, 8) >= 3 && mod(r, 8) <= 4) return '#';   // a serac
      if (fbm(c, r, 12, 2) > 0.55 && mod(r, 3) === 0) return '>';                                // glare ice
      return n < 0.012 ? '^' : '.';                                                             // frost
    }
    case 'tundra': return n < 0.02 ? '#' : n > 0.993 ? '^' : '.';                                // boulders
    case 'forest': {
      const wood = fbm(c, r, 16, 3), ox = lattice(c, r, 3, 4) < 0.5 ? 1 : 0;
      if (wood > 0.45 && mod(c, 3) === ox && mod(r, 3) === 1 && n < 0.8) return '#';            // a tree
      return wood < 0.38 && n > 0.85 ? '=' : '.';
    }
    case 'steppe': return fbm(c, r, 6, 6) > 0.66 ? '=' : n < 0.006 ? '#' : '.';                 // grass, rocks
    case 'desert': {
      const f = fbm(c, r, 12, 8);
      if (f > 0.66 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fbm(c + dx, r + dy, 12, 8) <= 0.66)) return '#';   // a mesa
      return n < 0.014 ? '^' : '.';                                                             // a cactus
    }
    case 'mountain': {
      const h = hq(c, r);
      if (h % 6 === 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => hq(c + dx, r + dy) < h) && vnoise(c, r, 6, 9) > 0.32) return '#';   // a cliff
      return n < 0.01 ? '^' : '.';
    }
  }
  return '.';
}
function bottomTile(c, r, n) {
  const vein = Math.abs(fbm(c, r, 16, 40) - 0.5) < 0.02 && vnoise(c, r, 6, 45) > 0.3;
  if (vein) return '#';
  if (fbm(c, r, 12, 50) > 0.64 && mod(c + r, 2) === 0) return '=';                              // a pool
  return n < 0.012 ? '^' : '.';                                                                 // stalagmites
}
const nearClear = (side, c, r) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (clear[side].has(wk(c + dx, r + dy))) return true;
  return false;
};
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!ground(c, r) || clear[side].has(key(c, r)) || (side === T && circle.has(key(c, r)))) continue;
  const n = rnd(c, r, side === T ? 1 : 2);
  let ch = side === T ? topTile(c, r, n) : bottomTile(c, r, n);
  if (/[#^]/.test(ch) && (nearVoid(c, r) || (side === T && nearCircle(c, r)) || nearClear(side, c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
// Where the great circles cross: a ring of slow pads, the crossing a compass rose of boost pads.
for (const m of MERIDIANS) for (let k = 2; k <= 5; k++) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.set(T, mod(m + dx * k, W), mod(EQUATOR + dy * k, H), k % 2 ? '=' : '>');

// ---- the sites themselves.
const groups = [];
const put = (side, c, r, ch) => { if (ground(c, r)) g.set(side, mod(c, W), mod(r, H), ch); };
const chainOf = (s, cells) => groups.push(['chain', s.side, cells.map(([x, y]) => place(s)(x, y))]);
for (const s of sites) {
  const p = place(s), at = (x, y, ch) => put(s.side, ...p(x, y), ch);
  if (s.kind === 'shrine') {
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const d = Math.max(Math.abs(x), Math.abs(y));
      if (d === 4 && !(y === 4 && Math.abs(x) <= 2)) at(x, y, '#');
      else if (d === 3 && !(x === 0 && y === 3)) at(x, y, '=');
    }
    at(0, 0, '#');
    for (const [x, y] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) at(x, y, '>');
    chainOf(s, [[0, 5], [0, 4], [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -2], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2]]);
  } else if (s.kind === 'vent') {
    const n = s.pit || 1;
    for (let y = -6 - n; y <= 7 + n; y++) for (let x = -6 - n; x <= 7 + n; x++) {
      const dx = Math.abs(x - 0.5), dy = Math.abs(y - 0.5), o = Math.max(Math.max(dx, dy), (dx + dy) / 1.5);
      const [c, r] = p(x, y);
      if (!ground(c, r)) continue;
      if (o > 5.5 + n && o <= 6.5 + n && dx > 2.5 && dy > 2.5) at(x, y, s.ring);
      else if (o <= 5.5 + n && mod(c + r, 3) === 0 && !nearVoid(c, r)) at(x, y, '=');
    }
    const a = -n, b = n + 1, cells = [];
    for (let y = n + 2; y >= a; y--) cells.push([a, y]);
    for (let x = a + 1; x <= b; x++) cells.push([x, a]);
    for (let y = a + 1; y <= n + 2; y++) cells.push([b, y]);
    for (const [x, y] of cells) at(x, y, '.');
    chainOf(s, cells);
  } else if (s.kind === 'circle') {
    for (const [x, y] of [[6, 3], [6, -3], [-6, 3], [-6, -3], [3, 6], [-3, 6], [3, -6], [-3, -6], [0, 6], [0, -6]]) at(x, y, '#');
    for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-1, -2], [0, -2], [1, -2]]) at(x, y, '=');
    chainOf(s, Array.from({length: 11}, (_, k) => [k - 5, 0]));
  } else if (long(s)) {
    for (let x = -2; x <= 13; x++) {
      if (s.kind === 'tunnel' && x >= 3 && x <= 8) { at(x, 1, '#'); at(x, -1, '#'); }
      if (s.kind === 'tunnel' && x >= 2 && x <= 9 && x % 2 === 0) { at(x, 2, '>'); at(x, -2, '>'); }
      if (s.kind === 'runway' && x % 2 === 0) { at(x, 2, '>'); at(x, -2, '>'); }
      if (s.kind === 'gauntlet' && x >= 3 && x <= 8) { at(x, 1, '^'); at(x, -1, '^'); }
      if (s.kind === 'gauntlet' && x >= 0 && x <= 11 && x % 3 === 0) { at(x, 2, '#'); at(x, -2, '#'); }
    }
    chainOf(s, Array.from({length: 12}, (_, k) => [k, 0]));
  } else if (s.kind === 'meander') {
    // Along, down round a pocket, up round the next and on: four turns, two cells apart.
    for (const [x, y] of [[4, 0], [5, 0], [4, 1], [5, 1]]) at(x, y, '=');
    for (const [x, y] of [[1, 2], [8, 2], [1, -2], [4, -2], [5, -2], [8, -2]]) at(x, y, '#');
    chainOf(s, [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0]]);
  } else if (s.kind === 'beacon') {
    for (let k = 3; k <= 6; k++) for (const [dx, dy] of Object.values(STEP)) at(dx * k, dy * k, '>');
    for (const [dx, dy] of Object.values(STEP)) at(dx * 2, dy * 2, '=');
    for (const [x, y] of [[3, 3], [-3, 3], [3, -3], [-3, -3]]) at(x, y, '=');
    groups.push(['gem', s.side, s.c, s.r]);
  } else if (s.kind === 'dive') {
    groups.push(['chain', s.side, s.line.slice(-7)]);
    const [x, y] = s.line[s.line.length - 2];
    groups.push(['gem', other(s.side), x, y]);
  }
}
if (DRAFT) {
  for (const grp of groups) try { g.stage(grp); } catch (e) { console.log(e.message); }
} else g.stage(...groups);

// ---- checks.
const errors = [];
for (let k = 0; k <= 8; k++) if (g.get(T, start[0], start[1] - k) !== '.') errors.push(`the start run is blocked at ${start[0]},${start[1] - k}`);
spots.forEach(([side, c, r], i) => spots.slice(i + 1).forEach(([s2, c2, r2]) => {
  if (side === s2 && dist(c, r, c2, r2) < 24) errors.push(`the artifacts at ${c},${r} and ${c2},${r2} on ${side} are ${dist(c, r, c2, r2).toFixed(1)} apart`);
}));
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (/[#^]/.test(g.get(T, c, r)) && nearCircle(c, r)) errors.push(`an obstacle at ${c},${r} next to a great circle`);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [x, y] of [[c + 1, r], [c, r + 1]])
  if (Math.abs(hq(c, r) - hq(x, y)) > 2) errors.push(`a slope steeper than half a cell at ${c},${r}`);
for (let r = 0; r < H; r += 4) for (let c = 0; c < W; c += 4) for (const side of [T, B]) {
  let walls = 0, spikes = 0;
  for (let y = r - 18; y <= r + 18; y++) for (let x = c - 18; x <= c + 18; x++) {
    const ch = g.get(side, mod(x, W), mod(y, H));
    if (ch === '#') walls++; else if (ch === '^') spikes++;
  }
  if (walls > 700 || spikes > 700) errors.push(`${walls} walls and ${spikes} spikes round ${c},${r} on ${side}`);
}
// Every artifact can be reached from the start by the movement rules (see terra.js); the world wraps.
const DIRS = ['N', 'E', 'S', 'W'];
const reached = new Set();
{
  const seen = new Set(), queue = [[start[0], start[1], 0, 0, false]];
  const sk = ([c, r, d, f, v]) => `${c},${r},${d},${f},${v ? 1 : 0}`;
  seen.add(sk(queue[0]));
  for (let i = 0; i < queue.length; i++) {
    const [c, r, d, f, v] = queue[i];
    if (!v) reached.add(`${c},${r},${f}`);
    for (const t of v ? [0] : [0, 1, 3]) {
      const nd = (d + t) % 4, [dx, dy] = STEP[DIRS[nd]], nc = mod(c + dx, W), nr = mod(r + dy, H);
      let s;
      if (!ground(nc, nr)) s = [nc, nr, (nd + 2) % 4, 1 - f, true];
      else if (/[#^]/.test(g.get(f ? B : T, nc, nr))) continue;
      else s = [nc, nr, nd, f, false];
      if (!seen.has(sk(s))) { seen.add(sk(s)); queue.push(s); }
    }
  }
}
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const ch = g.get(side, c, r);
  if (isItem(ch) && !reached.has(`${c},${r},${side === T ? 0 : 1}`)) errors.push(`item ${ch} at ${c},${r} on ${side} cannot be reached`);
}
if (errors.length) { if (DRAFT) console.log(errors.slice(0, 40).join('\n')); else throw new Error('\n' + errors.slice(0, 40).join('\n')); }

// ---- colours: a little planet at sunset, the caves underneath purple and dark teal.
const PAIRS = {ice: ['#ff44aa', '#ff00ff'], tundra: ['#ff0088', '#b41e46'], forest: ['#993300', '#b41e46'], steppe: ['#ff3300', '#993300'],
  desert: ['#ff5a28', '#ff3300'], mountain: ['#b41e46', '#993300']};
const colorOf = side => (c, r) => {
  if (!ground(c, r)) return '#000000';
  if (nearVoid(c, r)) return side === T ? '#6600cc' : '#ff0066';
  if (side === B) return fbm(c, r, 16, 60) > 0.55 ? '#444444' : '#6600cc';
  if (circle.has(key(c, r))) return '#ff0066';
  const [a, b] = PAIRS[regionOf(c, r)];
  if (regionOf(c, r) === 'mountain') return hq(c, r) >= 30 ? '#ff44aa' : hq(c, r) % 6 < 3 ? a : b;   // bands of rock, pink snow on top
  return fbm(c, r, 16, 70) > 0.56 ? b : a;
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
const height = q.map(row => row.map(v => v / 4));
module.exports = {key: 'planet', name: 'Level 132', kind: 'Little Planet', open: true, start, colors, grid: g, height};
if (DRAFT) module.exports.debug = {regionOf, trail: circle, NAMES: []};
if (require.main === module) {
  console.log(g.print());
  console.log(`groups: ${groups.length}, colour layers: ${colors.top.length} + ${colors.bottom.length}, lakes: ${LAKES.length}`);
}

// Level 131 "Shattered Isles": a hard open world. A square world of 224 x 224 cells, all void but thirteen
// islands floating in the night: a hub in the middle, a ring of eight big islands round it and four islets
// off the corners, joined by bridges one cell wide. There is no route and there are no trails: the
// thirty-two artifacts lie out at once, in one stage, and the player crosses the bridges and searches
// the islands in any order; the HUD counts the ones found (open: true). Harder than Terra Incognita: the
// only ways between the islands are the narrow bridges (a turn on one drops the snake to the other face),
// the islands are crowded with walls and spikes, half the artifacts are underneath, and most of them are
// chains, so the snake stays short.
//   - the hub: a ring of basalt columns round the start; the ring: crystal gardens (spike crystals,
//     streaks of boost pads), basalt fields (2 x 2 columns), mazes (walls on a grid with doors), a marsh
//     (slow pads, reeds, craters) and a thorn field (spikes in rows); the islets are bare;
//   - straight bridges between islands that face each other, L-shaped ones (a bend over the void) out to
//     the islets; three cells into an island from every bridge are kept clear;
//   - a crater or two in every island, open through both faces; underneath, caves of their own under
//     every island (veins of rock, spike clusters, catacombs, pools).
// Artifacts: the kinds of Terra Incognita (shrines, vents, stone circles, tunnels, runways, beacons, a dive
// into a crater) and the gauntlet (a straight chain between two rows of spikes right beside it), and
// chains along four bridges, two on top and two underneath. The bridge chains, the dive and the beacons
// on the islets and under the hub are placed by hand; every other site finds its ground on its island,
// as far as it can from the artifacts on its face (at least 18 cells). The script checks that every
// artifact can be reached from the start by the movement rules and that the renderer's limit of walls
// round the head holds; TERRA_DRAFT=1 reports problems instead of failing.
// Colour concept: basalt and amethyst in the night. Dark basalt islands veined with purple and violet,
// a raspberry glow round every coast, copper bridges; underneath chocolate and wine, gold bridges.
const {Grid, isItem} = require('../grid');
const {mod, key, unkey, hash} = require('../worldkit');
const W = 224, H = 224, T = 'top', B = 'bottom';
const other = side => (side === T ? B : T);
const STEP = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const DRAFT = !!process.env.TERRA_DRAFT;

// ---- noise: smooth value noise and a sum of three octaves, in [0, 1).
const lat = (i, j, s) => hash(mod(i, 997) + mod(j, 997) * 1009 + s * 1018081);
const smooth = t => t * t * (3 - 2 * t);
function vnoise(x, y, size, s) {
  const fx = x / size, fy = y / size, i = Math.floor(fx), j = Math.floor(fy), u = smooth(fx - i), v = smooth(fy - j);
  const a = lat(i, j, s), b = lat(i + 1, j, s), c = lat(i, j + 1, s), d = lat(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, size, s) => (4 * vnoise(x, y, size, s) + 2 * vnoise(x, y, size / 2, s + 1) + vnoise(x, y, size / 4, s + 2)) / 7;
const rnd = (c, r, s) => hash(c * 7919 + r * 104729 + s * 15485863);

// ---- the islands: noisy discs, each smoothed; the island of a cell is the one whose disc it is in.
const ISLANDS = [
  {c: 112, r: 112, rad: 20, theme: 'hub'},
  {c: 112, r: 48, rad: 21, theme: 'crystal'},
  {c: 176, r: 56, rad: 22, theme: 'basalt'},
  {c: 176, r: 114, rad: 20, theme: 'maze'},
  {c: 172, r: 174, rad: 22, theme: 'marsh'},
  {c: 112, r: 176, rad: 21, theme: 'thorns'},
  {c: 50, r: 172, rad: 22, theme: 'crystal'},
  {c: 48, r: 112, rad: 21, theme: 'basalt'},
  {c: 52, r: 50, rad: 22, theme: 'maze'},
  {c: 18, r: 18, rad: 7, theme: 'islet'},
  {c: 206, r: 18, rad: 7, theme: 'islet'},
  {c: 206, r: 206, rad: 7, theme: 'islet'},
  {c: 18, r: 206, rad: 7, theme: 'islet'},
];
const island = Array.from({length: H}, () => new Int8Array(W).fill(-1));
ISLANDS.forEach((t, k) => {
  let cells = new Set();
  for (let r = t.r - t.rad - 6; r <= t.r + t.rad + 6; r++) for (let c = t.c - t.rad - 6; c <= t.c + t.rad + 6; c++)
    if (Math.hypot(c - t.c, r - t.r) < t.rad * (1 + (fbm(c, r, 10, 40 + k) - 0.5) * 0.35)) cells.add(key(c, r));
  for (let pass = 0; pass < 2; pass++) {
    const next = new Set();
    for (let r = t.r - t.rad - 6; r <= t.r + t.rad + 6; r++) for (let c = t.c - t.rad - 6; c <= t.c + t.rad + 6; c++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += cells.has(key(c + dx, r + dy)) ? 1 : 0;
      if (n >= 5) next.add(key(c, r));
    }
    cells = next;
  }
  for (const k2 of cells) { const [c, r] = unkey(k2); if (c >= 4 && r >= 4 && c < W - 4 && r < H - 4) island[r][c] = k; }
});
// land: 0 void, 1 ground, 2 hole.
const land = island.map(row => Array.from(row, v => (v >= 0 ? 1 : 0)));

// ---- the bridges, one cell wide: straight between islands that face each other, else along a row and
// then a column, the bend out over the void.
const EDGES = [[0, 1], [0, 3], [0, 5], [0, 7], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [9, 8], [10, 2], [11, 4], [12, 6]];
const bridgeOf = new Map();          // cell -> bridge index
const bridges = EDGES.map(([a, b], n) => {
  const A = ISLANDS[a], Bi = ISLANDS[b], cells = [];
  const lay = (c, r) => {
    if (island[r][c] >= 0 && island[r][c] !== a && island[r][c] !== b) throw new Error(`the bridge ${a}-${b} crosses island ${island[r][c]}`);
    if (land[r][c] === 0) { land[r][c] = 1; cells.push([c, r]); bridgeOf.set(key(c, r), n); }
  };
  let ends;
  if (Math.abs(A.r - Bi.r) < Math.min(A.rad, Bi.rad) / 2) {             // side by side: along a row
    const r = Math.round((A.r + Bi.r) / 2), d = Math.sign(Bi.c - A.c);
    for (let c = A.c; c !== Bi.c; c += d) lay(c, r);
    ends = [d > 0 ? 'E' : 'W'];
  } else if (Math.abs(A.c - Bi.c) < Math.min(A.rad, Bi.rad) / 2) {      // one above the other: along a column
    const c = Math.round((A.c + Bi.c) / 2), d = Math.sign(Bi.r - A.r);
    for (let r = A.r; r !== Bi.r; r += d) lay(c, r);
    ends = [d > 0 ? 'S' : 'N'];
  } else {                                                               // along A's row, then down B's column
    const dc = Math.sign(Bi.c - A.c), dr = Math.sign(Bi.r - A.r);
    for (let c = A.c; c !== Bi.c; c += dc) lay(c, A.r);
    for (let r = A.r; r !== Bi.r; r += dr) lay(Bi.c, r);
    ends = [dc > 0 ? 'E' : 'W', dr > 0 ? 'S' : 'N'];
  }
  if (cells.length < 8) throw new Error(`the bridge ${a}-${b} is only ${cells.length} cells`);
  return {a, b, cells, ends};
});
if (DRAFT) console.log(bridges.map((br, n) => `${n}:${br.a}-${br.b}:${br.cells.length}${br.ends.length > 1 ? 'L' : ''}`).join(' '));
// Three cells into an island past each end of a bridge, and the cells beside them, stay clear on both faces.
const landing = new Set();
for (const br of bridges) {
  const first = br.cells[0], last = br.cells[br.cells.length - 1];
  for (const [[c, r], m] of [[last, br.ends[br.ends.length - 1]], [first, BACK(br.ends[0])]]) {
    for (let k = 1; k <= 4; k++) for (let s = -1; s <= 1; s++) {
      const [dx, dy] = STEP[m], x = c + dx * k + (dy ? s : 0), y = r + dy * k + (dx ? s : 0);
      landing.add(key(x, y));
    }
  }
}
function BACK(m) { return {N: 'S', S: 'N', E: 'W', W: 'E'}[m]; }

// ---- craters through both faces.
const holes = new Set();
const dig = (c, r) => { holes.add(key(c, r)); if (land[r] && land[r][c]) land[r][c] = 2; };
const crater = (c0, r0, rad, s) => {
  for (let r = Math.floor(r0 - rad - 2); r <= r0 + rad + 2; r++) for (let c = Math.floor(c0 - rad - 2); c <= c0 + rad + 2; c++)
    if (Math.hypot(c - c0, r - r0) < rad + (vnoise(c, r, 2.5, s) - 0.5) * 1.2) dig(c, r);
};
// [island, dx, dy, radius]
const CRATERS = [[0, 9, -9, 1.6], [1, -9, -7, 1.6], [2, 8, 8, 2], [3, -7, 7, 1.6], [4, -10, 9, 2.4], [4, 11, -9, 1.4],
  [5, 8, -8, 1.6], [6, -8, 7, 2], [6, 7, -10, 1.4], [7, -8, -8, 1.6], [8, 7, 7, 1.6]];
CRATERS.forEach(([i, dx, dy, rad], k) => crater(ISLANDS[i].c + dx, ISLANDS[i].r + dy, rad, 60 + k));
const ground = (c, r) => c >= 0 && r >= 0 && c < W && r < H && land[r][c] === 1;
const nearVoid = (c, r, d = 1) => {
  for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (!ground(c + dx, r + dy)) return true;
  return false;
};
const regionOf = (c, r) => island[r][c];

// ---- the artifacts, by site (the kinds of terra.js, and the gauntlet).
const place = s => (x, y) => {
  const h = s.kind === 'vent' ? 0.5 : 0;   // a vent turns round the middle of its pit
  x -= h; y -= h;
  if (s.mirror) x = -x;
  for (let k = 0; k < (s.rot || 0); k++) [x, y] = [-y, x];
  return [s.c + x + h, s.r + y + h];
};
const box = (s, x0, y0, x1, y1) => { const p = place(s), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(p(x, y)); return out; };
const pitOf = s => { const n = s.pit || 1; return box(s, 1 - n, 1 - n, n, n); };
const long = s => s.kind === 'tunnel' || s.kind === 'runway' || s.kind === 'gauntlet';
function footprint(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return box(s, -6 - n, -6 - n, 7 + n, 7 + n);
  if (long(s)) return box(s, -6, -3, 17, 3);
  return box(s, -7, -7, 7, 7);
}
function core(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return [...box(s, -5 - n, -5 - n, 6 + n, 6 + n), ...box(s, -n - 1, 7 + n, n + 2, 9 + n)];
  if (long(s)) return box(s, -5, -2, 16, 2);
  if (s.kind === 'shrine') return [...box(s, -5, -5, 5, 5), ...box(s, -1, 6, 1, 8)];
  if (s.kind === 'circle') return [...box(s, -6, -6, 6, 6), ...box(s, -9, -1, 9, 1)];
  return box(s, -6, -6, 6, 6);
}
const centre = s => (long(s) ? place(s)(6, 0) : [s.c, s.r]);
const clear = {top: new Set(), bottom: new Set()};
const block = {top: new Set(), bottom: new Set()};
const spots = [];
const sites = [];
const reserve = (side, cells) => {
  for (const [c, r] of cells) {
    clear[side].add(key(c, r));
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) block[side].add(key(c + dx, r + dy));
  }
};
function commit(s, cells = footprint(s)) {
  reserve(s.side, cells.filter(p => ground(...p)));
  if (s.kind === 'vent') {
    for (const [c, r] of pitOf(s)) dig(c, r);
    reserve(other(s.side), pitOf(s));
  }
  if (s.kind !== 'dive' && s.kind !== 'span') spots.push([s.side, ...centre(s)]);
  sites.push(s);
}

// The start: on the hub, heading north, its run kept clear; nothing is placed on the hub's top.
const start = [112, 126, 'N'];
reserve(T, Array.from({length: 13}, (_, k) => [112, 128 - k]).flatMap(([c, r]) => [[c - 1, r], [c, r], [c + 1, r]]));

// Fixed sites: chains along four bridges, a dive into the marsh crater, beacons on the islets and under the hub.
const FIXED = [
  {kind: 'span', side: T, bridge: 0}, {kind: 'span', side: T, bridge: 7},
  {kind: 'span', side: B, bridge: 1}, {kind: 'span', side: B, bridge: 3},
  {kind: 'dive', side: T, c: 162, r: 165, dir: 'S'},
  {kind: 'beacon', side: T, c: 18, r: 18}, {kind: 'beacon', side: B, c: 206, r: 18},
  {kind: 'beacon', side: B, c: 206, r: 206}, {kind: 'beacon', side: T, c: 18, r: 206},
  {kind: 'beacon', side: B, c: 112, r: 112},
];
for (const s of FIXED) {
  if (s.kind === 'span') {
    const cells = bridges[s.bridge].cells;
    if (cells.length < 16) { if (DRAFT) { console.log(`bridge ${s.bridge} is too short for a chain`); continue; } throw new Error(`bridge ${s.bridge} is too short for a chain`); }
    s.cells = cells.slice(4, cells.length - 4).slice(0, 12);
    commit(s, cells);
    spots.push([s.side, ...s.cells[6]]);
  } else if (s.kind === 'dive') {
    let [c, r] = [s.c, s.r];
    s.line = [];
    for (let n = 0; ground(c, r); n++) {
      if (n > 40) throw new Error(`the dive at ${s.c},${s.r} finds no hole`);
      s.line.push([c, r]);
      c += STEP[s.dir][0]; r += STEP[s.dir][1];
    }
    if (s.line.length < 10) throw new Error(`the dive at ${s.c},${s.r} has only ${s.line.length} cells of run-up`);
    const [ax, ay] = s.dir === 'N' || s.dir === 'S' ? [1, 0] : [0, 1], near = [], back = [];
    s.line.forEach(([x, y], i) => {
      for (let k = -2; k <= 2; k++) near.push([x + ax * k, y + ay * k]);
      if (i >= s.line.length - 9) for (let k = -1; k <= 1; k++) back.push([x + ax * k, y + ay * k]);
    });
    commit(s, near);
    reserve(other(s.side), back.filter(p => ground(...p)));
    spots.push([s.side, ...s.line[s.line.length - 1]], [other(s.side), ...s.line[s.line.length - 2]]);
  } else commit(s);
}

// The other sites find their ground on their island.
const AUTO = [
  // top
  {kind: 'vent', side: T, region: 1, ring: '^'}, {kind: 'beacon', side: T, region: 1},
  {kind: 'tunnel', side: T, region: 2}, {kind: 'shrine', side: T, region: 2},
  {kind: 'shrine', side: T, region: 3}, {kind: 'beacon', side: T, region: 3},
  {kind: 'circle', side: T, region: 4},
  {kind: 'gauntlet', side: T, region: 5}, {kind: 'beacon', side: T, region: 5},
  {kind: 'vent', side: T, region: 6, ring: '^'}, {kind: 'circle', side: T, region: 6},
  {kind: 'tunnel', side: T, region: 7},
  {kind: 'shrine', side: T, region: 8},
  // underneath
  {kind: 'shrine', side: B, region: 1}, {kind: 'runway', side: B, region: 2}, {kind: 'vent', side: B, region: 3, ring: '^'},
  {kind: 'beacon', side: B, region: 4}, {kind: 'circle', side: B, region: 5}, {kind: 'gauntlet', side: B, region: 6},
  {kind: 'shrine', side: B, region: 7}, {kind: 'beacon', side: B, region: 8},
];
const fits = s => {
  for (const [c, r] of core(s)) if (!ground(c, r) || bridgeOf.has(key(c, r))) return false;
  for (const [c, r] of footprint(s)) if (block[s.side].has(key(c, r)) || landing.has(key(c, r))) return false;
  if (s.kind === 'vent') for (const [c, r] of pitOf(s)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (block[other(s.side)].has(key(c + dx, r + dy)) || landing.has(key(c + dx, r + dy))) return false;
  return true;
};
// A shrine opens towards its island's middle; long sites and circles lie either way.
const rotations = (s, c, r) => {
  const t = ISLANDS[s.region];
  if (s.kind === 'shrine') return [Math.abs(t.c - c) > Math.abs(t.r - r) ? (t.c > c ? 3 : 1) : (t.r > r ? 0 : 2)];
  return long(s) || s.kind === 'circle' ? [0, 1] : [0];
};
AUTO.forEach((s, k) => {
  let best = null;
  const t = ISLANDS[s.region];
  for (let r = t.r - t.rad - 4; r <= t.r + t.rad + 4; r++) for (let c = t.c - t.rad - 4; c <= t.c + t.rad + 4; c++) {
    if (c < 0 || r < 0 || c >= W || r >= H || regionOf(c, r) !== s.region) continue;
    for (const rot of rotations(s, c, r)) {
      const q = {...s, c, r, rot, mirror: k % 2 === 1};
      if (!fits(q)) continue;
      const [x, y] = centre(q);
      let score = Infinity;
      for (const [side, qc, qr] of spots) if (side === s.side) score = Math.min(score, Math.hypot(x - qc, y - qr));
      if (!best || score > best.score) best = {q, score};
    }
  }
  const what = `the ${s.kind} on island ${s.region} (${t.theme}) on ${s.side}`;
  if (!best) { if (DRAFT) { console.log(`no ground for ${what}`); return; } throw new Error(`no ground for ${what}`); }
  if (best.score < 18) { if (DRAFT) console.log(`${what}: ${best.score.toFixed(1)} apart`); else throw new Error(`${what} is only ${best.score.toFixed(1)} from the next artifact`); }
  commit(best.q);
  if (DRAFT) console.log(`${s.kind} ${s.side} island ${s.region}: ${best.q.c},${best.q.r} rot ${best.q.rot}, ${best.score.toFixed(1)} apart`);
});
const g = new Grid(W, H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground(c, r)) g.set('both', c, r, '.');

// ---- the islands, face by face. A wall or spike never stands next to the void, on a bridge or its
// landing, or next to a site.
const contour = (c, r, size, s, w) => Math.abs(fbm(c, r, size, s) - 0.5) < w;
const lattice = (c, r, n, s) => hash(Math.floor(c / n) * 53 + Math.floor(r / n) * 1297 + s * 7);
function topTile(c, r, n) {
  const t = ISLANDS[regionOf(c, r)];
  switch (t.theme) {
    case 'hub': {
      const d = Math.hypot(c - t.c, r - t.r);
      if (d > 9 && d < 14 && mod(c, 5) < 2 && mod(r, 5) < 2) return '#';                       // basalt columns
      return n < 0.01 ? '^' : '.';
    }
    case 'crystal': {
      const cx = Math.floor(c / 6) * 6 + 3, cy = Math.floor(r / 6) * 6 + 3;
      if (lattice(c, r, 6, 1) < 0.6 && Math.abs(c - cx) + Math.abs(r - cy) <= 1) return '^';  // a crystal
      if (fbm(c, r, 8, 3) > 0.55 && mod(c + r, 5) === 0) return '>';                           // amethyst streaks
      return '.';
    }
    case 'basalt': {
      const ox = lattice(c, r, 5, 4) < 0.5 ? 1 : 2;
      if (lattice(c, r, 5, 5) < 0.6 && mod(c, 5) >= ox && mod(c, 5) < ox + 2 && mod(r, 5) >= 1 && mod(r, 5) < 3) return '#';   // a column
      return n < 0.015 ? '^' : '.';
    }
    case 'maze': {
      const x = mod(c, 6), y = mod(r, 6);
      if (x === 0 && y !== 0 && lattice(c, r - 1, 6, 6) > 0.35 && !(y === 3 && lattice(c, r, 6, 7) < 0.5)) return '#';
      if (y === 0 && x !== 0 && lattice(c - 1, r, 6, 8) > 0.35 && !(x === 3 && lattice(c, r, 6, 9) < 0.5)) return '#';
      return x === 3 && y === 3 && n < 0.3 ? '^' : '.';
    }
    case 'marsh': {
      if (fbm(c, r, 7, 10) > 0.52 && mod(c + r, 2) === 0) return '=';                           // pools
      return n < 0.05 ? '^' : '.';                                                               // reeds
    }
    case 'thorns': {
      if (mod(c, 3) === 0 && mod(r, 3) === 0 && n < 0.6) return '^';                             // thorns in rows
      return n > 0.985 ? '#' : '.';
    }
    default: return mod(c + r, 4) === 0 && n < 0.3 ? '=' : '.';
  }
}
function bottomTile(c, r, n) {
  const t = ISLANDS[regionOf(c, r)];
  const vein = (size, s, w) => contour(c, r, size, s, w) && vnoise(c, r, 6, s + 5) > 0.3;
  switch (t.theme) {
    case 'hub': return vein(10, 20, 0.022) ? '#' : n < 0.01 ? '^' : '.';
    case 'crystal': return n < 0.05 ? '^' : vein(9, 22, 0.02) ? '#' : '.';                        // geodes
    case 'basalt': return vein(8, 24, 0.025) ? '#' : n < 0.012 ? '^' : '.';
    case 'maze': return (mod(c, 8) === 4 && mod(r, 5) !== 2) || (mod(r, 8) === 0 && mod(c, 5) !== 1) ? '#' : '.';   // catacombs
    case 'marsh': return fbm(c, r, 6, 26) > 0.6 ? '=' : n < 0.03 ? '^' : '.';
    case 'thorns': return mod(c, 4) === 2 && mod(r, 4) === 2 && n < 0.7 ? '^' : '.';
    default: return '.';
  }
}
const nearClear = (side, c, r) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (clear[side].has(key(c + dx, r + dy))) return true;
  return false;
};
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!ground(c, r) || clear[side].has(key(c, r)) || bridgeOf.has(key(c, r))) continue;
  const n = rnd(c, r, side === T ? 1 : 2);
  let ch = side === T ? topTile(c, r, n) : bottomTile(c, r, n);
  if (/[#^]/.test(ch) && (nearVoid(c, r) || landing.has(key(c, r)) || nearClear(side, c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
// The hub: a star of pads round its middle.
for (let k = 2; k <= 6; k++) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.set(T, 112 + dx * k, 112 + dy * k, k % 2 ? '=' : '>');
// Copper studs along the bridges: a slow pad every seventh cell, top and bottom by turns.
bridges.forEach((br, n) => br.cells.forEach(([c, r], i) => { if (i > 2 && i < br.cells.length - 3 && mod(i + n, 7) === 0) g.set(n % 2 ? B : T, c, r, '='); }));

// ---- the sites themselves.
const groups = [];
const put = (side, c, r, ch) => { if (ground(c, r)) g.set(side, c, r, ch); };
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
    for (const [x, y] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) at(x, y, '^');
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
    for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-1, -2], [0, -2], [1, -2], [-4, 2], [4, 2], [-4, -2], [4, -2]]) at(x, y, '^');
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
  } else if (s.kind === 'beacon') {
    for (let k = 3; k <= 6; k++) for (const [dx, dy] of Object.values(STEP)) at(dx * k, dy * k, '>');
    for (const [dx, dy] of Object.values(STEP)) at(dx * 2, dy * 2, '=');
    for (const [x, y] of [[3, 3], [-3, 3], [3, -3], [-3, -3]]) at(x, y, '^');
    groups.push(['gem', s.side, s.c, s.r]);
  } else if (s.kind === 'dive') {
    groups.push(['chain', s.side, s.line.slice(-7)]);
    const [x, y] = s.line[s.line.length - 2];
    groups.push(['gem', other(s.side), x, y]);
  } else if (s.kind === 'span') {
    for (const [c, r] of s.cells) g.set(s.side, c, r, '.');
    groups.push(['chain', s.side, s.cells]);
  }
}
if (DRAFT) {
  for (const grp of groups) try { g.stage(grp); } catch (e) { console.log(e.message); }
} else g.stage(...groups);

// ---- checks.
const errors = [];
for (let k = 0; k <= 8; k++) if (g.get(T, start[0], start[1] - k) !== '.') errors.push(`the start run is blocked at ${start[0]},${start[1] - k}`);
spots.forEach(([side, c, r], i) => spots.slice(i + 1).forEach(([s2, c2, r2]) => {
  if (side === s2 && Math.hypot(c - c2, r - r2) < 18) errors.push(`the artifacts at ${c},${r} and ${c2},${r2} on ${side} are ${Math.hypot(c - c2, r - r2).toFixed(1)} apart`);
}));
for (let r = 0; r < H; r += 4) for (let c = 0; c < W; c += 4) for (const side of [T, B]) {
  let walls = 0, spikes = 0;
  for (let y = r - 18; y <= r + 18; y++) for (let x = c - 18; x <= c + 18; x++) {
    const ch = g.get(side, mod(x, W), mod(y, H));
    if (ch === '#') walls++; else if (ch === '^') spikes++;
  }
  if (walls > 700 || spikes > 700) errors.push(`${walls} walls and ${spikes} spikes round ${c},${r} on ${side}`);
}
// Every artifact can be reached from the start by the movement rules (see terra.js).
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
if (errors.length) { if (DRAFT) console.log(errors.join('\n')); else throw new Error('\n' + errors.join('\n')); }

// ---- colours: basalt and amethyst in the night, raspberry coasts, copper bridges (gold underneath).
const PAIRS = {
  top: {hub: ['#6600cc', '#cc00ff'], crystal: ['#444444', '#cc00ff'], basalt: ['#444444', '#6600cc'], maze: ['#6600cc', '#444444'],
    marsh: ['#b41e46', '#6600cc'], thorns: ['#444444', '#b41e46'], islet: ['#cc00ff', '#cc00ff']},
  bottom: {hub: ['#993300', '#b41e46'], crystal: ['#b41e46', '#6600cc'], basalt: ['#993300', '#444444'], maze: ['#b41e46', '#993300'],
    marsh: ['#993300', '#6600cc'], thorns: ['#b41e46', '#444444'], islet: ['#b41e46', '#b41e46']},
};
const colorOf = side => (c, r) => {
  if (!ground(c, r)) return '#000000';
  if (bridgeOf.has(key(c, r))) return side === T ? '#ff3300' : '#ff6600';
  if (nearVoid(c, r)) return '#ff0066';
  const [a, b] = PAIRS[side][ISLANDS[regionOf(c, r)].theme];
  return fbm(c, r, 9, side === T ? 300 : 310) > 0.55 ? b : a;
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'isles', name: 'Level 131', kind: 'Shattered Isles', open: true, start, colors, grid: g};
if (DRAFT) module.exports.debug = {regionOf, trail: new Set(), NAMES: []};
if (require.main === module) {
  console.log(g.print());
  console.log(`groups: ${groups.length}, colour layers: ${colors.top.length} + ${colors.bottom.length}`);
}

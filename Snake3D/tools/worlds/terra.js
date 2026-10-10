// Level 130 "Terra Incognita": an open world. A square world of 200 x 200 cells, a big island in the void,
// with no route at all: the thirty artifacts (chains and lone crystals) all lie out at once, in one stage,
// some of them a hundred cells apart, and the player goes wherever they like and finds them in any order.
// The HUD counts the ones found (open: true). Items show only within twelve cells of the head, so the
// player has to explore: the regions differ in floor colour and in what stands on them, gold trails run
// from the camp in the middle to every region, and the island has an underside of its own, reached
// through the canyon, the ponds, the vents and over the coast.
//   - the camp in the middle: a raspberry plaza with a star of boost pads; the start;
//   - the regions round it: a forest (trees in rows, clearings), the peaks (ridges of walls with passes,
//     scree of slow pads), the crystal highlands (spike crystals, streaks of boost pads, crevasses), a
//     ruined city (streets, buildings, ruins and plazas), the desert (dunes of slow pads, wind lanes of
//     boost pads, cacti), the canyon (a rift through the island with four bridges, hollow mesas), the
//     lake district (ponds open through both faces, lily pads, reeds) and a meadow (hedgerows, clover);
//   - four islets off the corners, each at the end of a causeway one cell wide;
//   - underneath: caves under every region (root veins, mines, geodes, catacombs, lava tubes, grottos).
// Artifacts: shrines (a ring of walls round a pillar, a chain spiralling round it), vents (a pit ringed by
// spikes or lily pads, a chain hooked round it), stone circles (a straight chain through a ring of
// stones), tunnels and runways (a long straight chain between walls or boost lights), beacons (a lone
// crystal in a star of boost pads), dives (a chain into a hole, a crystal on the other face where the
// snake comes out), a chain over a canyon bridge and one along a causeway. The dives, the bridge and the
// islets are placed by hand; every other site finds its own ground in its region, as far as it can from the
// artifacts already placed on its face (at least 22 cells), off the trails and well away from the camp.
// Checks: every artifact can be reached from the start by the movement rules, nothing sharp stands next to
// a trail, the renderer's limit of walls round the head holds. TERRA_DRAFT=1 reports problems instead of
// failing, for designing.
// Colour concept: an explorer's map. Every region has its own pair of colours (chocolate forest, grey
// peaks, violet highlands, wine city, sand desert, brick canyon, purple lakes, pink meadow) round the
// raspberry camp, the trails gold; underneath the same map, darker.
const {Grid, isItem} = require('../grid');
const {mod, key, unkey, hash} = require('../worldkit');
const W = 200, H = 200, T = 'top', B = 'bottom', CX = 100, CY = 100;
const other = side => (side === T ? B : T);
const STEP = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};

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

// ---- the island: a noisy disc, smoothed, its largest piece kept.
let land = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => {
  if (c < 4 || r < 4 || c >= W - 4 || r >= H - 4) return 0;
  return Math.hypot(c - CX, r - CY) / 82 < 1 + (fbm(c, r, 28, 1) - 0.5) * 0.55 ? 1 : 0;
}));
for (let pass = 0; pass < 2; pass++) {
  land = land.map((row, r) => row.map((v, c) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += (land[r + dy] || [])[c + dx] || 0;
    return n >= 5 ? 1 : 0;
  }));
}
function pieces(mask) {
  const seen = new Set(), out = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!mask[r][c] || seen.has(key(c, r))) continue;
    const list = [[c, r]];
    seen.add(key(c, r));
    for (let i = 0; i < list.length; i++) for (const [dx, dy] of Object.values(STEP)) {
      const x = list[i][0] + dx, y = list[i][1] + dy;
      if (x >= 0 && y >= 0 && x < W && y < H && mask[y][x] && !seen.has(key(x, y))) { seen.add(key(x, y)); list.push([x, y]); }
    }
    out.push(list);
  }
  return out.sort((a, b) => b.length - a.length);
}
{
  const keep = new Set(pieces(land)[0].map(p => key(...p)));
  land = land.map((row, r) => row.map((v, c) => (keep.has(key(c, r)) ? 1 : 0)));
}

// ---- the islets off the corners: a strait six cells wide round each, a causeway one cell wide to the island.
const ISLETS = [
  {c: 26, r: 26, rad: 7, dir: 'E'},
  {c: 174, r: 26, rad: 7, dir: 'S'},
  {c: 172, r: 172, rad: 8, dir: 'W'},
  {c: 26, r: 174, rad: 7, dir: 'N'},
];
for (const t of ISLETS) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (Math.hypot(c - t.c, r - t.r) < t.rad + 6) land[r][c] = 0;
const main = land.map(row => row.slice());
for (const t of ISLETS) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
    if (Math.hypot(c - t.c, r - t.r) < t.rad + 0.5 + (vnoise(c, r, 3, 9) - 0.5)) land[r][c] = 1;
  t.causeway = [];
  let [c, r] = [t.c, t.r];
  for (let n = 0; ; n++) {
    if (n > 60) throw new Error(`the causeway from the islet at ${t.c},${t.r} finds no land`);
    c += STEP[t.dir][0]; r += STEP[t.dir][1];
    if (main[r][c]) break;
    if (Math.hypot(c - t.c, r - t.r) >= t.rad) t.causeway.push([c, r]);
    land[r][c] = 1;
  }
  if (t.causeway.length < 12) throw new Error(`the causeway from the islet at ${t.c},${t.r} is only ${t.causeway.length} cells`);
}

// ---- the regions: the nearest seed, the borders frayed by noise; the camp in the middle.
const REGIONS = {
  forest: [58, 45], peaks: [105, 35], highlands: [155, 52], city: [160, 105],
  desert: [157, 160], canyon: [95, 162], lakes: [48, 142], meadow: [38, 95],
};
const NAMES = Object.keys(REGIONS);
const regionMap = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => {
  if (Math.hypot(c - CX, r - CY) < 10 + (vnoise(c, r, 4, 11) - 0.5) * 3) return 'camp';
  let best = null, bd = Infinity;
  NAMES.forEach((name, k) => {
    const [x, y] = REGIONS[name];
    const d = Math.hypot(c - x, r - y) + (fbm(c, r, 12, 20 + k * 3) - 0.5) * 16;
    if (d < bd) { bd = d; best = name; }
  });
  return best;
}));
const regionOf = (c, r) => regionMap[r][c];

// ---- holes through both faces: the canyon with its bridges, the ponds and crevasses (the vent pits come
// with the vents).
const holes = new Set();
const dig = (c, r) => { holes.add(key(c, r)); if (land[r] && land[r][c]) land[r][c] = 2; };
const rift = c => Math.round(146 + 6 * Math.sin(c / 11) + 3 * Math.sin(c / 4.5 + 1));
const canyonCells = new Map();      // column -> [top row, bottom row] of the rift
for (let c = 72; c <= 146; c++) canyonCells.set(c, [Math.min(rift(c), rift(c - 1)), Math.max(rift(c), rift(c - 1)) + 1]);
const BRIDGES = [88, 100, 120, 136];
for (const [c, [a, b]] of canyonCells) if (!BRIDGES.includes(c)) for (let r = a; r <= b; r++) dig(c, r);
const PONDS = [[32, 135, 4, 31], [52, 154, 3, 32], [38, 156, 2, 33], [68, 128, 2, 35], [62, 170, 2.5, 36]];
for (const [c0, r0, rad, s] of PONDS)
  for (let r = Math.floor(r0 - rad - 2); r <= r0 + rad + 2; r++) for (let c = Math.floor(c0 - rad - 2); c <= c0 + rad + 2; c++)
    if (Math.hypot(c - c0, r - r0) < rad + (vnoise(c, r, 2.5, s) - 0.5) * 1.4) dig(c, r);
for (const [c, r, dx, dy, n] of [[138, 68, 1, 0, 5], [182, 55, 1, 0, 3], [135, 46, 1, 0, 3], [160, 36, 0, 1, 4]])
  for (let k = 0; k < n; k++) dig(c + dx * k, r + dy * k);
const ground = (c, r) => c >= 0 && r >= 0 && c < W && r < H && land[r][c] === 1;
const nearVoid = (c, r, d = 1) => {
  for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (!ground(c + dx, r + dy)) return true;
  return false;
};

// ---- the trails: gold paths from the camp to every region, on top only, never over a hole.
const TRAILS = [
  [[100, 90], 'N52'],                     // north to the peaks
  [[110, 100], 'E42'],                    // east into the city
  [[100, 110], 'S55'],                    // south over the canyon
  [[90, 100], 'W55'],                     // west into the meadow
  [[75, 99], 'N30 W12'],                  // north-west into the forest
  [[101, 62], 'E29 N12'],                 // north-east up to the highlands
  [[125, 101], 'S30 E18'],                // south-east into the desert
  [[62, 101], 'S25'],                     // south-west to the lakes
  [[152, 99], 'N19 E18'],                 // across the city towards the highlands
];
const trail = new Set();
for (const [[c0, r0], runs] of TRAILS) {
  let c = c0, r = r0;
  trail.add(key(c, r));
  for (const run of runs.split(' ')) {
    const [, m, n] = run.match(/^([NSEW])(\d+)$/);
    for (let i = 0; i < +n; i++) {
      c += STEP[m][0]; r += STEP[m][1];
      if (!ground(c, r)) throw new Error(`the trail from ${c0},${r0} leaves the ground at ${c},${r}`);
      trail.add(key(c, r));
    }
  }
}
const nearTrail = (c, r, d = 1) => {
  for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (trail.has(key(c + dx, r + dy))) return true;
  return false;
};
const trailZone = new Set();
for (const k of trail) { const [c, r] = unkey(k); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) trailZone.add(key(c + dx, r + dy)); }

// ---- the artifacts, by site. Each kind keeps its ground clear, may open holes, draws itself and adds its groups:
//   shrine (door to the south before rot), vent, circle, tunnel and runway (along x before rot), beacon,
//   dive (a chain heading dir into the nearest hole), bridge (a chain over a canyon bridge), causeway.
// rot turns a site clockwise in quarter turns (1: door west, 2: north, 3: east), mirror flips x.
const place = s => (x, y) => {
  const h = s.kind === 'vent' ? 0.5 : 0;   // a vent turns round the middle of its pit
  x -= h; y -= h;
  if (s.mirror) x = -x;
  for (let k = 0; k < (s.rot || 0); k++) [x, y] = [-y, x];
  return [s.c + x + h, s.r + y + h];
};
const box = (s, x0, y0, x1, y1) => { const p = place(s), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(p(x, y)); return out; };
const pitOf = s => { const n = s.pit || 1; return box(s, 1 - n, 1 - n, n, n); };
// The ground a site keeps clear on its face, and the cell it is known by.
function footprint(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return box(s, -6 - n, -6 - n, 7 + n, 7 + n);
  if (s.kind === 'tunnel' || s.kind === 'runway') return box(s, -6, -3, 17, 3);
  return box(s, -7, -7, 7, 7);
}
// The part that must stand on ground: the rest of the footprint may hang over the void.
function core(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return [...box(s, -5 - n, -5 - n, 6 + n, 6 + n), ...box(s, -n - 1, 7 + n, n + 2, 9 + n)];
  if (s.kind === 'tunnel' || s.kind === 'runway') return box(s, -5, -2, 16, 2);
  if (s.kind === 'shrine') return [...box(s, -5, -5, 5, 5), ...box(s, -1, 6, 1, 8)];
  if (s.kind === 'circle') return [...box(s, -6, -6, 6, 6), ...box(s, -9, -1, 9, 1)];
  return box(s, -6, -6, 6, 6);
}
const centre = s => (s.kind === 'tunnel' || s.kind === 'runway' ? place(s)(6, 0) : [s.c, s.r]);
const clear = {top: new Set(), bottom: new Set()};      // kept clear of the regions' walls and spikes
const block = {top: new Set(), bottom: new Set()};      // no other site here (the clear ground and two cells round it)
const spots = [];                                        // [side, c, r] of every artifact
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
  if (s.kind !== 'dive' && s.kind !== 'bridge' && s.kind !== 'causeway') spots.push([s.side, ...centre(s)]);
  sites.push(s);
}

// Fixed sites: the dives, a bridge, the islets and a secret under the camp.
const FIXED = [
  {kind: 'dive', side: T, c: 82, r: canyonCells.get(82)[0] - 11, dir: 'S'},
  {kind: 'dive', side: T, c: 51, r: 135, dir: 'W'},
  {kind: 'bridge', side: T, c: 120},
  {kind: 'beacon', side: T, c: ISLETS[0].c, r: ISLETS[0].r},
  {kind: 'causeway', side: T, islet: ISLETS[1]},
  {kind: 'shrine', side: T, c: ISLETS[2].c, r: ISLETS[2].r, rot: 1},       // the door west, to the causeway
  {kind: 'beacon', side: B, c: CX, r: CY},
  {kind: 'beacon', side: B, c: ISLETS[3].c, r: ISLETS[3].r},
];
for (const s of FIXED) {
  if (s.kind === 'dive') {
    // The run up to the hole on its face, the way back on the other.
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
  } else if (s.kind === 'bridge') {
    const [a, b] = canyonCells.get(s.c), cells = [];
    for (let r = a - 6; r <= b + 6; r++) for (let c = s.c - 1; c <= s.c + 1; c++) cells.push([c, r]);
    commit(s, cells);
    spots.push([T, s.c, a]);
  } else if (s.kind === 'causeway') {
    commit(s, s.islet.causeway);
    spots.push([T, ...s.islet.causeway[6]]);
  } else commit(s);
}

// The other sites find their own ground in their region: all of their footprint on clear ground, off the
// trails and other sites, as far as can be from every artifact on their face; on top well away from the camp.
const AUTO = [
  {kind: 'circle', side: T, region: 'forest'}, {kind: 'shrine', side: T, region: 'forest'}, {kind: 'beacon', side: T, region: 'forest'},
  {kind: 'tunnel', side: T, region: 'peaks'}, {kind: 'vent', side: T, region: 'peaks', ring: '^'},
  {kind: 'beacon', side: T, region: 'highlands'}, {kind: 'runway', side: T, region: 'highlands'},
  {kind: 'shrine', side: T, region: 'city'}, {kind: 'beacon', side: T, region: 'city'},
  {kind: 'vent', side: T, region: 'canyon', ring: '='}, {kind: 'beacon', side: T, region: 'desert'},
  {kind: 'vent', side: T, region: 'lakes', ring: '=', pit: 2},
  {kind: 'shrine', side: T, region: 'meadow'}, {kind: 'circle', side: T, region: 'meadow'},
  {kind: 'shrine', side: B, region: 'forest'}, {kind: 'runway', side: B, region: 'peaks'},
  {kind: 'vent', side: B, region: 'highlands', ring: '^'}, {kind: 'beacon', side: B, region: 'city'},
  {kind: 'tunnel', side: B, region: 'desert'}, {kind: 'circle', side: B, region: 'meadow'},
];
const fits = s => {
  for (const [c, r] of core(s)) if (!ground(c, r)) return false;
  for (const [c, r] of footprint(s)) {
    if (block[s.side].has(key(c, r))) return false;
    if (s.side === T && trailZone.has(key(c, r))) return false;
  }
  if (s.kind === 'vent') for (const [c, r] of pitOf(s)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (block[other(s.side)].has(key(c + dx, r + dy)) || trailZone.has(key(c + dx, r + dy))) return false;
  return true;
};
// A shrine opens towards the camp; long sites lie either way.
const rotations = (s, c, r) => {
  if (s.kind === 'shrine') return [Math.abs(CX - c) > Math.abs(CY - r) ? (CX > c ? 3 : 1) : (CY > r ? 0 : 2)];
  return s.kind === 'tunnel' || s.kind === 'runway' || s.kind === 'circle' ? [0, 1] : [0];
};
AUTO.forEach((s, k) => {
  let best = null;
  for (let r = 4; r < H - 4; r += 2) for (let c = 4; c < W - 4; c += 2) {
    if (regionOf(c, r) !== s.region) continue;
    for (const rot of rotations(s, c, r)) {
      const t = {...s, c, r, rot, mirror: k % 2 === 1};
      if (!fits(t)) continue;
      const [x, y] = centre(t);
      if (s.side === T && Math.hypot(x - CX, y - CY) < 30) continue;      // out of sight of the camp
      let score = Infinity;
      for (const [side, qc, qr] of spots) if (side === s.side) score = Math.min(score, Math.hypot(x - qc, y - qr));
      if (!best || score > best.score) best = {t, score};
    }
  }
  if (best && best.score < 22 && process.env.TERRA_DRAFT) console.log(`${s.kind} in the ${s.region} on ${s.side}: ${best.score.toFixed(1)}`);
  else if (!best && process.env.TERRA_DRAFT) { console.log(`no ground for the ${s.kind} in the ${s.region} on ${s.side}`); return; }
  else if (!best || best.score < 22) throw new Error(`no ground for the ${s.kind} in the ${s.region} on ${s.side}${best ? `: the best is ${best.score.toFixed(1)} from the next artifact` : ''}`);
  commit(best.t);
  if (process.env.TERRA_DRAFT) console.log(`${s.kind} ${s.side} ${s.region}: ${best.t.c},${best.t.r} rot ${best.t.rot}, ${best.score.toFixed(1)} apart`);
});
const g = new Grid(W, H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground(c, r)) g.set('both', c, r, '.');

// ---- the regions, face by face. A wall or spike never stands next to the void, a trail or in a footprint.
const contour = (c, r, size, s, w) => Math.abs(fbm(c, r, size, s) - 0.5) < w;
function topTile(c, r, n) {
  switch (regionOf(c, r)) {
    case 'forest': {
      const wood = fbm(c, r, 16, 50);
      const ox = hash(Math.floor(c / 3) * 31 + Math.floor(r / 3) * 977) < 0.5 ? 1 : 0;
      if (wood > 0.44 && mod(c, 3) === ox && mod(r, 3) === 1 && n < 0.8) return '#';          // a tree
      if (wood < 0.36 && rnd(c, r, 51) < 0.2) return '=';                                       // mud in a clearing
      return wood > 0.5 && n > 0.992 ? '^' : '.';                                               // a toadstool
    }
    case 'peaks': {
      if (contour(c, r, 18, 60, 0.028) && vnoise(c, r, 7, 70) > 0.28) return '#';              // a ridge
      if (contour(c, r, 18, 60, 0.07) && n < 0.45) return '=';                                  // scree
      return n > 0.994 ? '^' : '.';
    }
    case 'highlands': {
      const k = Math.floor(c / 9) * 53 + Math.floor(r / 9) * 1297;
      const cx = Math.floor(c / 9) * 9 + 4, cy = Math.floor(r / 9) * 9 + 4;
      if (hash(k) < 0.45 && Math.abs(c - cx) + Math.abs(r - cy) <= (hash(k + 7) < 0.5 ? 1 : 0)) return '^';   // a crystal
      if (fbm(c, r, 10, 80) > 0.55 && mod(c - r + Math.floor(vnoise(c, r, 20, 81) * 6), 7) === 0) return '>';   // ice
      return '.';
    }
    case 'city': {
      const x = mod(c - 4, 12), y = mod(r - 6, 12);
      if (x >= 10 || y >= 10) return '.';                                                       // a street
      const k = Math.floor((c - 4) / 12) * 61 + Math.floor((r - 6) / 12) * 1543, t = hash(k);
      const ring = (x === 1 || x === 8 || y === 1 || y === 8) && x >= 1 && x <= 8 && y >= 1 && y <= 8;
      if (t < 0.45) {                                                                           // a building with a door
        const side = Math.floor(hash(k + 1) * 4);
        const door = (side === 0 && y === 1 || side === 1 && y === 8) && (x === 4 || x === 5)
          || (side === 2 && x === 1 || side === 3 && x === 8) && (y === 4 || y === 5);
        if (ring && !door) return '#';
        return x >= 3 && x <= 6 && y >= 3 && y <= 6 && mod(x + y, 2) === 0 ? '=' : '.';
      }
      if (t < 0.8) return ring && rnd(c, r, 62) < 0.5 ? '#' : '.';                             // a ruin
      if (x >= 4 && x <= 5 && y >= 4 && y <= 5) return '=';                                     // a plaza with a fountain
      return (x === 3 || x === 6) && (y === 3 || y === 6) ? '^' : '.';
    }
    case 'desert': {
      if (contour(c, r, 14, 90, 0.035)) return '=';                                             // a dune
      if (mod(r, 13) === 5 && vnoise(c, r, 9, 95) > 0.62) return '>';                           // a wind lane
      return n < 0.012 ? '^' : n > 0.997 ? '#' : '.';                                           // a cactus, a boulder
    }
    case 'canyon': {
      const f = fbm(c, r, 9, 100), rim = f > 0.64 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fbm(c + dx, r + dy, 9, 100) <= 0.64);
      if (rim) return '#';                                                                      // a hollow mesa
      if (mod(c + 2 * r, 11) === 0 && vnoise(c, r, 6, 101) > 0.6) return '>';                   // a dust devil
      return n < 0.006 ? '^' : '.';
    }
    case 'lakes': {
      if (nearVoid(c, r, 2) && rnd(c, r, 110) < 0.5) return '=';                                // lily pads
      if (nearVoid(c, r, 4) && n < 0.06) return '^';                                            // reeds
      return n > 0.993 ? '#' : '.';                                                             // a willow
    }
    case 'meadow': {
      const k = Math.floor(c / 7) * 41 + Math.floor(r / 7) * 1361, t = hash(k);
      if (t < 0.3 && mod(r, 7) === 3 && mod(c, 7) >= 1 && mod(c, 7) <= 4) return '#';          // a hedgerow
      if (t > 0.7 && mod(c, 7) === 3 && mod(r, 7) >= 1 && mod(r, 7) <= 4) return '#';
      if (fbm(c, r, 8, 120) > 0.64) return '=';                                                 // clover
      return n < 0.005 ? '^' : '.';                                                             // a thistle
    }
    default: return '.';                                                                        // the camp
  }
}
function bottomTile(c, r, n) {
  const vein = (size, s, w) => contour(c, r, size, s, w) && vnoise(c, r, 6, s + 5) > 0.3;
  switch (regionOf(c, r)) {
    case 'forest': return vein(10, 130, 0.02) ? '#' : fbm(c, r, 7, 135) > 0.66 ? '=' : n < 0.006 ? '^' : '.';   // roots, moss
    case 'peaks': return vein(14, 140, 0.025) ? '#' : mod(r, 9) === 4 && mod(c, 3) === 0 ? '=' : n < 0.006 ? '^' : '.';   // a mine
    case 'highlands': return vein(11, 150, 0.02) ? '#' : n < 0.02 ? '^' : fbm(c, r, 6, 155) > 0.7 && mod(c + r, 2) === 0 ? '>' : '.';   // geodes
    case 'city': {                                                                              // catacombs
      const x = mod(c, 12), y = mod(r, 12);
      if ((x === 10 && mod(r, 6) !== 2) || (y === 0 && mod(c, 6) !== 3)) return '#';
      return n < 0.006 ? '^' : '.';
    }
    case 'desert': return mod(c, 14) === 7 && vnoise(c, r, 8, 160) > 0.45 ? '>' : vein(12, 165, 0.02) ? '#' : n < 0.006 ? '^' : '.';   // lava tubes
    case 'canyon': return vein(9, 170, 0.025) ? '#' : n < 0.01 ? '^' : '.';
    case 'lakes': return fbm(c, r, 7, 180) > 0.64 && mod(c + r, 2) === 0 ? '=' : vein(12, 185, 0.02) ? '#' : '.';     // grottos
    case 'meadow': return vein(10, 190, 0.02) ? '#' : n < 0.008 ? '^' : '.';                   // burrows
    default: return '.';
  }
}
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!ground(c, r) || clear[side].has(key(c, r))) continue;
  if (side === T && trail.has(key(c, r))) continue;
  const n = rnd(c, r, side === T ? 1 : 2);
  let ch = side === T ? topTile(c, r, n) : bottomTile(c, r, n);
  if (/[#^]/.test(ch) && (nearVoid(c, r) || (side === T && nearTrail(c, r)) || nearClear(side, c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
function nearClear(side, c, r) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (clear[side].has(key(c + dx, r + dy))) return true;
  return false;
}

// ---- the camp: a star of boost pads round the middle, the trails its four doors.
for (let k = 2; k <= 6; k++) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.set(T, CX + dx * k, CY + dy * k, k % 2 ? '=' : '>');
for (let r = CY - 8; r <= CY + 8; r++) for (let c = CX - 8; c <= CX + 8; c++) {
  const d = Math.max(Math.abs(c - CX), Math.abs(r - CY));
  if (d === 8 && Math.abs(c - CX) > 1 && Math.abs(r - CY) > 1 && mod(c + r, 2) === 0) g.set(T, c, r, '=');
}

// ---- the sites themselves.
const groups = [];
const put = (side, c, r, ch) => {
  if (!ground(c, r)) return;
  g.set(side, c, r, ch);
};
const chainOf = (s, cells) => groups.push(['chain', s.side, cells.map(([x, y]) => place(s)(x, y))]);
for (const s of sites) {
  const p = place(s), at = (x, y, ch, side = s.side) => put(side, ...p(x, y), ch);
  if (s.kind === 'shrine') {
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      const d = Math.max(Math.abs(x), Math.abs(y));
      if (d === 4 && !(y === 4 && Math.abs(x) <= 2)) at(x, y, '#');                            // the ring, its door south
      else if (d === 3 && !(x === 0 && y === 3)) at(x, y, '=');
    }
    at(0, 0, '#');                                                                              // the pillar
    for (const [x, y] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) at(x, y, '>');
    chainOf(s, [[0, 5], [0, 4], [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -2], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2]]);
  } else if (s.kind === 'vent') {
    const n = s.pit || 1;
    for (let y = -6 - n; y <= 7 + n; y++) for (let x = -6 - n; x <= 7 + n; x++) {
      const dx = Math.abs(x - 0.5), dy = Math.abs(y - 0.5), o = Math.max(Math.max(dx, dy), (dx + dy) / 1.5);
      const [c, r] = p(x, y);
      if (!ground(c, r)) continue;
      if (o > 5.5 + n && o <= 6.5 + n && dx > 2.5 && dy > 2.5) at(x, y, s.ring);               // the octagon, four doors
      else if (o <= 5.5 + n && mod(c + r, 3) === 0 && !nearVoid(c, r)) at(x, y, '=');
    }
    // A hook round the pit: up its west side, over the north, down the east.
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
  } else if (s.kind === 'tunnel' || s.kind === 'runway') {
    for (let x = -2; x <= 13; x++) {
      if (s.kind === 'tunnel' && x >= 3 && x <= 8) { at(x, 1, '#'); at(x, -1, '#'); }
      if (s.kind === 'tunnel' && x >= 2 && x <= 9 && x % 2 === 0) { at(x, 2, '>'); at(x, -2, '>'); }
      if (s.kind === 'runway' && x % 2 === 0) { at(x, 2, '>'); at(x, -2, '>'); }
    }
    chainOf(s, Array.from({length: 12}, (_, k) => [k, 0]));
  } else if (s.kind === 'beacon') {
    for (let k = 3; k <= 6; k++) for (const [dx, dy] of Object.values(STEP)) at(dx * k, dy * k, '>');
    for (const [dx, dy] of Object.values(STEP)) at(dx * 2, dy * 2, '=');
    for (const [x, y] of [[3, 3], [-3, 3], [3, -3], [-3, -3]]) at(x, y, '=');
    groups.push(['gem', s.side, s.c, s.r]);
  } else if (s.kind === 'dive') {
    const run = s.line.slice(-7);                                                               // up to the hole
    groups.push(['chain', s.side, run]);
    const [x, y] = s.line[s.line.length - 2];                                                   // a crystal where the snake comes out
    groups.push(['gem', other(s.side), x, y]);
  } else if (s.kind === 'bridge') {
    const [a, b] = canyonCells.get(s.c);
    groups.push(['chain', T, Array.from({length: b - a + 7}, (_, k) => [s.c, a - 3 + k])]);
  } else if (s.kind === 'causeway') {
    groups.push(['chain', T, s.islet.causeway.slice(2, 12)]);
  }
}
if (process.env.TERRA_DRAFT) {
  // Draft: put what fits and report the rest.
  for (const grp of groups) try { g.stage(grp); } catch (e) { console.log(e.message); }
} else g.stage(...groups);

// ---- checks.
const errors = [];
// The start: on the trail south of the camp, heading north, eight clear cells ahead.
const start = [CX, CY + 18, 'N'];
for (let k = 0; k <= 8; k++) if (g.get(T, CX, start[1] - k) !== '.') errors.push(`the start run is blocked at ${CX},${start[1] - k}`);
// Artifacts far apart on each face.
spots.forEach(([side, c, r], i) => spots.slice(i + 1).forEach(([s2, c2, r2]) => {
  if (side === s2 && Math.hypot(c - c2, r - r2) < 18) errors.push(`the artifacts at ${c},${r} and ${c2},${r2} on ${side} are ${Math.hypot(c - c2, r - r2).toFixed(1)} apart`);
}));
// Nothing sharp next to a trail.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (/[#^]/.test(g.get(T, c, r)) && nearTrail(c, r)) errors.push(`an obstacle at ${c},${r} next to a trail`);
// The renderer draws at most 900 walls (and 900 spikes) a face in the window round the head.
for (let r = 0; r < H; r += 4) for (let c = 0; c < W; c += 4) for (const side of [T, B]) {
  let walls = 0;
  for (let y = r - 18; y <= r + 18; y++) for (let x = c - 18; x <= c + 18; x++) if (g.get(side, mod(x, W), mod(y, H)) === '#') walls++;
  if (walls > 700) errors.push(`${walls} walls round ${c},${r} on ${side}`);
}
// Every artifact can be reached from the start by the movement rules: the snake turns a quarter at most
// per cell, not in a hole, and comes out of a hole or over the coast on the other face, heading back.
const faceOf = side => (side === T ? 0 : 1), DIRS = ['N', 'E', 'S', 'W'];
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
  if (isItem(ch) && !reached.has(`${c},${r},${faceOf(side)}`)) errors.push(`item ${ch} at ${c},${r} on ${side} cannot be reached`);
}
if (errors.length) { if (process.env.TERRA_DRAFT) console.log(errors.join('\n')); else throw new Error('\n' + errors.join('\n')); }

// ---- colours: an explorer's map, every region its own pair, the trails gold, the holes glowing.
const PAIRS = {
  top: {forest: ['#993300', '#6600cc'], peaks: ['#444444', '#999999'], highlands: ['#cc00ff', '#6600cc'], city: ['#b41e46', '#ff3300'],
    desert: ['#ff5a28', '#ff3300'], canyon: ['#ff1111', '#993300'], lakes: ['#6600cc', '#444444'], meadow: ['#ff0088', '#ff44aa'], camp: ['#ff0066', '#ff0066']},
  bottom: {forest: ['#444444', '#993300'], peaks: ['#444444', '#6600cc'], highlands: ['#6600cc', '#cc00ff'], city: ['#993300', '#b41e46'],
    desert: ['#993300', '#ff3300'], canyon: ['#b41e46', '#993300'], lakes: ['#444444', '#6600cc'], meadow: ['#b41e46', '#6600cc'], camp: ['#6600cc', '#6600cc']},
};
const colorOf = side => (c, r) => {
  if (!ground(c, r)) return '#000000';
  if (nearVoid(c, r) && holesNear(c, r)) return '#ff00ff';
  if (side === T && trail.has(key(c, r))) return '#ff6600';
  const region = regionOf(c, r), [a, b] = PAIRS[side][region];
  if (region === 'city' && side === T) return mod(c - 4, 12) >= 10 || mod(r - 6, 12) >= 10 ? b : a;
  if (region === 'peaks' && side === T && fbm(c, r, 18, 60) > 0.68) return '#ffffff';
  return fbm(c, r, 20, side === T ? 200 : 210) > 0.56 ? b : a;
};
function holesNear(c, r) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (holes.has(key(c + dx, r + dy))) return true;
  return false;
}
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'terra', name: 'Level 130', kind: 'Terra Incognita', open: true, start, colors, grid: g};
if (process.env.TERRA_DRAFT) module.exports.debug = {regionOf, trail, NAMES};
if (require.main === module) {
  console.log(g.print());
  console.log(`groups: ${groups.length}, colour layers: ${colors.top.length} + ${colors.bottom.length}`);
}

// Level 133 "Neon Metropolis": a hard open world, a city at night. A square world of 224 x 224 cells: a
// city on an island in the void, cut in two by a canal. There is no route: the thirty-two artifacts lie
// out at once, in one stage, and the player searches the streets and the undercity in any order; the HUD
// counts the ones found (open: true).
//   - a lattice of boulevards five cells wide, icy white with lanes of boost pads, runs through the whole
//     city; they are the trails, nothing sharp stands on them or beside them. Between them lie the
//     blocks, each cut into buildings and streets by its district's own rules (a split tree): towers
//     downtown, crooked alleys one cell wide in the old town, awnings of slow pads in the bazaar, neon
//     streets of boost pads, houses with yards in the suburbs, warehouses with loading doors at the docks;
//   - the canal, a zigzag of void along three lines of the lattice, crossed by the boulevards on bridges
//     and in five places by footbridges one cell wide; a park on the canal, with ponds and trees;
//   - piers at the docks: dead ends, but off the end the sea drops the snake underneath;
//   - manholes in the middle of some crossings and the canal open the way down: under the city lies the
//     undercity, metro tunnels under every boulevard (stations under the crossings) and under every
//     district its own underground: depots, sewers, catacombs, cisterns, a club, roots, steam tunnels
//     and caves under the park.
// Artifacts: the kinds of the other open worlds (shrines, vents, stone circles, tunnels, runways, beacons,
// gauntlets, a dive into the canal) and the city's own: courtyards (a building with one door, the chain
// loops round a fountain inside), roundabouts (the chain goes all the way round an island of walls),
// alleys (a chain down a dog-leg one cell wide between walls), chains along the piers (one on top, one
// underneath from the tip) and along two metro tunnels. Every site clears a square of its own out of the
// city, as far as it can from the artifacts on its face (at least 20 cells). Checks: every artifact can be
// reached from the start by the movement rules, nothing sharp on or beside a boulevard or a park path, the
// renderer's limit of walls round the head; TERRA_DRAFT=1 reports problems instead of failing.
// Colour concept: a neon city at night. Icy boulevards, grey-teal streets, roofs in neon colours by
// district (purple downtown, wine in the old town, raspberry bazaar, violet strip, lilac suburbs, rust
// docks, dark teal midtown), a pink park and a raspberry glow along every edge of the void; underneath
// the same family darker, the metro grey-teal with white stations.
const {Grid, isItem} = require('../grid');
const {mod, hash} = require('../worldkit');
const W = 224, H = 224, T = 'top', B = 'bottom';
const other = side => (side === T ? B : T);
const STEP = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const DRAFT = !!process.env.TERRA_DRAFT;
const I = (c, r) => r * W + c;
const inMap = (c, r) => c >= 0 && r >= 0 && c < W && r < H;

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

// ---- the lattice: boulevards five cells wide on these lines both ways, the blocks between them.
const AV = [37, 67, 97, 127, 157, 187];
const LO = [0, 40, 70, 100, 130, 160, 190], HI = [34, 64, 94, 124, 154, 184, 223];
const blockOf = v => { for (let i = 0; i < 7; i++) if (v >= LO[i] && v <= HI[i]) return i; return -1; };
const bandOf = v => AV.findIndex(a => Math.abs(v - a) <= 2);
// Districts by block: Old town, bazaar (K), neon strip, Midtown, Downtown, Suburbs, the Park, Industry.
const DMAP = ['OOOKNNN', 'OOMKKNN', 'MMMDDNN', 'SPPDDIN', 'SPPMIII', 'SSSSIII', 'SSSSIII'];
const NAMES = {O: 'old town', K: 'bazaar', N: 'neon strip', M: 'midtown', D: 'downtown', S: 'suburbs', P: 'park', I: 'docks'};
const toBlock = v => (blockOf(v) >= 0 ? blockOf(v) : blockOf(v + 5));
const districtOf = (c, r) => DMAP[toBlock(r)][toBlock(c)];
const PARK = [40, 100, 94, 154];
const inPark = (c, r) => c >= PARK[0] && c <= PARK[2] && r >= PARK[1] && r <= PARK[3];

// ---- the land: an island with a noisy coast, the docks straight along the south; the canal in a zigzag
// along the lattice, with the boulevards on bridges over it; piers.
const canalVoid = (c, r) => (Math.abs(r - 97) <= 2 && c <= 129) || (Math.abs(c - 127) <= 2 && r >= 95 && r <= 159) || (Math.abs(r - 157) <= 2 && c >= 125);
const avBridge = (c, r) => (Math.abs(r - 97) <= 2 && c <= 124 && bandOf(c) >= 0) ||
  (Math.abs(c - 127) <= 2 && r >= 100 && r <= 154 && bandOf(r) >= 0) ||
  (Math.abs(r - 157) <= 2 && c >= 130 && bandOf(c) >= 0);
const FOOT = [[52, 'col'], [112, 'col'], [142, 'row'], [172, 'col'], [202, 'col']];   // footbridges
const footCells = FOOT.map(([v, axis]) => {
  const out = [];
  if (axis === 'row') for (let c = 125; c <= 129; c++) out.push([c, v]);
  else for (let r = v < 125 ? 95 : 155; r <= (v < 125 ? 99 : 159); r++) out.push([v, r]);
  return out;
});
const PIERS = [142, 172];
const land = new Uint8Array(W * H);         // 0 void, 1 ground, 2 hole
const bridge = new Uint8Array(W * H);       // 1 boulevard bridge, 2 footbridge, 3 pier
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const x = c - 112, y = r - 112, d = Math.pow(x ** 6 + y ** 6, 1 / 6);
  let on = d < 95 + (fbm(c, r, 12, 7) - 0.5) * 10;
  if (r >= 180 && c >= 128 && c <= 200) on = r <= 205;
  if (canalVoid(c, r)) on = avBridge(c, r);
  if (on) land[I(c, r)] = 1;
  if (on && canalVoid(c, r)) bridge[I(c, r)] = 1;
}
footCells.forEach(cells => cells.forEach(([c, r]) => { land[I(c, r)] = 1; bridge[I(c, r)] = 2; }));
for (const pc of PIERS) for (let r = 206; r <= 217; r++) for (let c = pc - 1; c <= pc + 1; c++) { land[I(c, r)] = 1; bridge[I(c, r)] = 3; }
const ground = (c, r) => inMap(c, r) && land[I(c, r)] === 1;
const dig = (c, r) => { if (inMap(c, r) && land[I(c, r)]) land[I(c, r)] = 2; };
// The boulevards: their bands on land, but not through the park.
const avenue = new Uint8Array(W * H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (land[I(c, r)] && (bandOf(c) >= 0 || bandOf(r) >= 0) && !inPark(c, r) && bridge[I(c, r)] !== 2 && bridge[I(c, r)] !== 3) avenue[I(c, r)] = 1;
const crossing = (c, r) => bandOf(c) >= 0 && bandOf(r) >= 0;
// Distance along a boulevard to the nearest crossing.
const toCrossing = v => Math.min(...AV.map(a => Math.abs(v - a)));

// The park: paths (a ring and a cross), two ponds open through both faces.
const path = new Uint8Array(W * H);
for (let r = PARK[1]; r <= PARK[3]; r++) for (let c = PARK[0]; c <= PARK[2]; c++) {
  const e = Math.min(c - PARK[0], PARK[2] - c, r - PARK[1], PARK[3] - r);
  if (e === 5 || e === 6 || Math.abs(c - 67) <= 1 || Math.abs(r - 127) <= 1) path[I(c, r)] = 1;
}
const pond = (c0, r0, rx, ry, s) => {
  for (let r = r0 - ry - 2; r <= r0 + ry + 2; r++) for (let c = c0 - rx - 2; c <= c0 + rx + 2; c++)
    if (Math.hypot((c - c0) / rx, (r - r0) / ry) < 1 + (vnoise(c, r, 2.5, s) - 0.5) * 0.4) { dig(c, r); path[I(c, r)] = 0; }
};
pond(82, 141, 6, 4, 70);
pond(53, 113, 3, 2.5, 71);

// The start: on the boulevard north of the canal corner, downtown, heading north.
const start = [127, 88, 'N'];
// Manholes in the middle of about half the crossings, none near the start.
const manholes = [];
for (const a of AV) for (const b of AV) {
  if (!avenue[I(a, b)] || canalVoid(a, b) || Math.hypot(a - start[0], b - start[1]) < 26 || hash(a * 31 + b * 977) > 0.55) continue;
  let open = true;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!avenue[I(a + dx, b + dy)]) open = false;
  if (open) { dig(a, b); manholes.push([a, b]); }
}

// Chebyshev distance of every cell to the void, up to 8.
let voidDist;
function measureVoid() {
  voidDist = new Uint8Array(W * H).fill(255);
  let front = [];
  for (let i = 0; i < W * H; i++) if (land[i] !== 1) { voidDist[i] = 0; front.push(i); }
  for (let d = 1; d <= 8 && front.length; d++) {
    const next = [];
    for (const i of front) {
      const c = i % W, r = (i - c) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = c + dx, y = r + dy;
        if (inMap(x, y) && voidDist[I(x, y)] === 255) { voidDist[I(x, y)] = d; next.push(I(x, y)); }
      }
    }
    front = next;
  }
}
measureVoid();
const near = (arr, c, r, d = 1) => {
  for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (inMap(c + dx, r + dy) && arr[I(c + dx, r + dy)]) return true;
  return false;
};

// ---- the artifacts, by site.
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
  if (long(s)) return box(s, -5, -3, 16, 3);
  if (s.kind === 'court') return box(s, -7, -7, 7, 9);
  if (s.kind === 'alley') return box(s, -5, -3, 9, 10);
  return box(s, -7, -7, 7, 7);
}
function core(s) {
  const n = s.pit || 1;
  if (s.kind === 'vent') return [...box(s, -5 - n, -5 - n, 6 + n, 6 + n), ...box(s, -n - 1, 7 + n, n + 2, 9 + n)];
  if (long(s)) return box(s, -5, -2, 16, 2);
  if (s.kind === 'shrine') return [...box(s, -5, -5, 5, 5), ...box(s, -1, 6, 1, 8)];
  if (s.kind === 'court') return [...box(s, -6, -6, 6, 6), ...box(s, -1, 7, 1, 9)];
  if (s.kind === 'circle') return [...box(s, -6, -6, 6, 6), ...box(s, -9, -1, 9, 1)];
  if (s.kind === 'alley') return box(s, -4, -2, 8, 9);
  return box(s, -6, -6, 6, 6);
}
const centre = s => (long(s) ? place(s)(6, 0) : s.kind === 'alley' ? place(s)(4, 3) : [s.c, s.r]);
const clear = {top: new Uint8Array(W * H), bottom: new Uint8Array(W * H)};
const block = {top: new Uint8Array(W * H), bottom: new Uint8Array(W * H)};
const landing = new Uint8Array(W * H);
const spots = [];
const sites = [];
const reserve = (side, cells) => {
  for (const [c, r] of cells) {
    if (!inMap(c, r)) continue;
    clear[side][I(c, r)] = 1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inMap(c + dx, r + dy)) block[side][I(c + dx, r + dy)] = 1;
  }
};
function commit(s, cells = footprint(s)) {
  reserve(s.side, cells.filter(p => ground(...p)));
  if (s.kind === 'vent') {
    for (const [c, r] of pitOf(s)) dig(c, r);
    reserve(other(s.side), pitOf(s));
  }
  if (!['dive', 'pier', 'metro'].includes(s.kind)) spots.push([s.side, ...centre(s)]);
  sites.push(s);
}

// Past both ends of every footbridge, six cells into the blocks stay clear on both faces.
footCells.forEach(cells => {
  const [c0, r0] = cells[0], [c1, r1] = cells[cells.length - 1], dx = Math.sign(c1 - c0), dy = Math.sign(r1 - r0);
  for (let k = 1; k <= 6; k++) for (let s = -1; s <= 1; s++) {
    for (const [x, y] of [[c1 + dx * k + dy * s, r1 + dy * k + dx * s], [c0 - dx * k + dy * s, r0 - dy * k + dx * s]]) if (inMap(x, y)) landing[I(x, y)] = 1;
  }
});
reserve(T, Array.from({length: 13}, (_, k) => [start[0], start[1] - k + 1]).flatMap(([c, r]) => [[c - 1, r], [c, r], [c + 1, r]]));

// Fixed sites: a dive into the canal, chains along the piers (on top out to the tip, underneath back from
// it) and along two metro tunnels.
const FIXED = [
  {kind: 'dive', side: T, c: 82, r: 79, dir: 'S'},
  {kind: 'pier', side: T, cells: Array.from({length: 8}, (_, k) => [172, 207 + k])},
  {kind: 'pier', side: B, cells: Array.from({length: 8}, (_, k) => [142, 215 - k])},
  {kind: 'metro', side: B, cells: Array.from({length: 12}, (_, k) => [76 + k, 67])},
  {kind: 'metro', side: B, cells: Array.from({length: 12}, (_, k) => [187, 46 + k])},
];
for (const s of FIXED) {
  if (s.kind === 'dive') {
    let [c, r] = [s.c, s.r];
    s.line = [];
    for (let n = 0; ground(c, r); n++) {
      if (n > 40) throw new Error(`the dive at ${s.c},${s.r} finds no hole`);
      s.line.push([c, r]);
      c += STEP[s.dir][0]; r += STEP[s.dir][1];
    }
    if (s.line.length < 10) throw new Error(`the dive at ${s.c},${s.r} has only ${s.line.length} cells of run-up`);
    const [ax, ay] = s.dir === 'N' || s.dir === 'S' ? [1, 0] : [0, 1], nearLine = [], back = [];
    s.line.forEach(([x, y], i) => {
      for (let k = -2; k <= 2; k++) nearLine.push([x + ax * k, y + ay * k]);
      if (i >= s.line.length - 9) for (let k = -1; k <= 1; k++) back.push([x + ax * k, y + ay * k]);
    });
    commit(s, nearLine);
    reserve(other(s.side), back.filter(p => ground(...p)));
    spots.push([s.side, ...s.line[s.line.length - 1]], [other(s.side), ...s.line[s.line.length - 2]]);
  } else {
    const wide = s.kind === 'metro' ? s.cells : s.cells.flatMap(([c, r]) => [[c - 1, r], [c, r], [c + 1, r]]);
    commit(s, wide);
    spots.push([s.side, ...s.cells[s.cells.length >> 1]]);
  }
}

// The other sites find their ground in their district.
const AUTO = [
  // top
  {kind: 'court', side: T, region: 'O'}, {kind: 'alley', side: T, region: 'O'},
  {kind: 'vent', side: T, region: 'K', ring: '^'},
  {kind: 'alley', side: T, region: 'N'}, {kind: 'beacon', side: T, region: 'N'},
  {kind: 'court', side: T, region: 'M'}, {kind: 'tunnel', side: T, region: 'M'},
  {kind: 'roundabout', side: T, region: 'D'}, {kind: 'vent', side: T, region: 'D', ring: '^'},
  {kind: 'roundabout', side: T, region: 'S'},
  {kind: 'circle', side: T, region: 'P'}, {kind: 'beacon', side: T, region: 'P'},
  {kind: 'gauntlet', side: T, region: 'I'}, {kind: 'runway', side: T, region: 'I'},
  // underneath
  {kind: 'shrine', side: B, region: 'O'}, {kind: 'beacon', side: B, region: 'O'},
  {kind: 'vent', side: B, region: 'K', ring: '^'},
  {kind: 'beacon', side: B, region: 'N'},
  {kind: 'roundabout', side: B, region: 'M'}, {kind: 'alley', side: B, region: 'M'},
  {kind: 'court', side: B, region: 'D'},
  {kind: 'shrine', side: B, region: 'S'}, {kind: 'circle', side: B, region: 'S'},
  {kind: 'beacon', side: B, region: 'P'},
  {kind: 'gauntlet', side: B, region: 'I'}, {kind: 'tunnel', side: B, region: 'I'},
];
const avNear = new Uint8Array(W * H), pathNear = new Uint8Array(W * H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (near(avenue, c, r)) avNear[I(c, r)] = 1;
  if (near(path, c, r)) pathNear[I(c, r)] = 1;
}
const fits = s => {
  for (const [c, r] of core(s)) {
    if (!ground(c, r) || voidDist[I(c, r)] <= 2 || avenue[I(c, r)] || bridge[I(c, r)]) return false;
  }
  for (const [c, r] of footprint(s)) {
    if (!inMap(c, r)) return false;
    const i = I(c, r);
    if (block[s.side][i] || landing[i] || (s.side === T && (avNear[i] || pathNear[i]))) return false;
  }
  if (s.kind === 'vent') for (const [c, r] of pitOf(s)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (block[other(s.side)][I(c + dx, r + dy)] || landing[I(c + dx, r + dy)] || avenue[I(c + dx, r + dy)]) return false;
  return true;
};
const rotations = s => (['shrine', 'court', 'alley'].includes(s.kind) ? [0, 1, 2, 3] : long(s) || s.kind === 'circle' ? [0, 1] : [0]);
const districtCells = {};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (ground(c, r) && !avenue[I(c, r)]) (districtCells[districtOf(c, r)] = districtCells[districtOf(c, r)] || []).push([c, r]);
AUTO.forEach((s, k) => {
  let best = null;
  for (const [c, r] of districtCells[s.region]) {
    if (Math.hypot(c - start[0], r - start[1]) < 24) continue;
    for (const rot of rotations(s)) {
      const q = {...s, c, r, rot, mirror: k % 2 === 1};
      const [x, y] = centre(q);
      let score = Infinity;
      for (const [side, qc, qr] of spots) if (side === s.side) score = Math.min(score, Math.hypot(x - qc, y - qr));
      if (best && score <= best.score) continue;
      if (fits(q)) best = {q, score};
    }
  }
  const what = `the ${s.kind} in the ${NAMES[s.region]} on ${s.side}`;
  if (!best) { if (DRAFT) { console.log(`no ground for ${what}`); return; } throw new Error(`no ground for ${what}`); }
  if (best.score < 20) { if (DRAFT) console.log(`${what}: ${best.score.toFixed(1)} apart`); else throw new Error(`${what} is only ${best.score.toFixed(1)} from the next artifact`); }
  commit(best.q);
  if (DRAFT) console.log(`${s.kind} ${s.side} ${NAMES[s.region]}: ${best.q.c},${best.q.r} rot ${best.q.rot}, ${best.score.toFixed(1)} apart`);
});
measureVoid();

// ---- the buildings: every block is cut by a split tree with its district's sizes and street widths;
// the leaves are buildings. A building goes (its ground becomes a square) when it would touch a site,
// a footbridge landing or the void within three cells.
const RULES = {
  D: {min: 6, max: 11, street: [2]}, M: {min: 4, max: 8, street: [1, 2]}, O: {min: 3, max: 6, street: [1, 1, 2]},
  K: {min: 3, max: 5, street: [2]}, N: {min: 5, max: 9, street: [2]}, S: {min: 5, max: 6, street: [2]},
  I: {min: 7, max: 13, street: [2, 3]},
};
const buildings = [];
function split(x0, y0, x1, y1, P, s) {
  const w = x1 - x0 + 1, h = y1 - y0 + 1, lim = P.max + Math.floor(hash(s) * 3);
  if (w <= lim && h <= lim) { buildings.push([x0, y0, x1, y1]); return; }
  const across = w > h || (w === h && hash(s + 1) < 0.5), len = across ? w : h;
  const sw = P.street[Math.floor(hash(s + 2) * P.street.length)], lo = P.min, hi = len - P.min - sw;
  if (hi < lo) { buildings.push([x0, y0, x1, y1]); return; }
  const a = lo + Math.floor(hash(s + 3) * (hi - lo + 1));
  if (across) { split(x0, y0, x0 + a - 1, y1, P, s * 7 + 11); split(x0 + a + sw, y0, x1, y1, P, s * 7 + 13); }
  else { split(x0, y0, x1, y0 + a - 1, P, s * 7 + 17); split(x0, y0 + a + sw, x1, y1, P, s * 7 + 19); }
}
for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
  const d = DMAP[j][i];
  if (d === 'P') continue;
  // A block keeps a pavement of one cell along a boulevard, a quay of three along the canal.
  const side = (x, y) => (canalVoid(x, y) && !avBridge(x, y) ? 3 : 1);
  const mx = (LO[i] + HI[i]) >> 1, my = (LO[j] + HI[j]) >> 1;
  const x0 = LO[i] + (i ? side(LO[i] - 1, my) : 0), x1 = HI[i] - (i < 6 ? side(HI[i] + 1, my) : 0);
  const y0 = LO[j] + (j ? side(mx, LO[j] - 1) : 0), y1 = HI[j] - (j < 6 ? side(mx, HI[j] + 1) : 0);
  split(x0, y0, x1, y1, RULES[d], 1000 + i * 37 + j * 101);
}
const owner = new Int16Array(W * H).fill(-1);
// A building that would touch a site, a landing or the void is cut in two by a lane one cell wide, and
// the halves are tried again, down to three cells.
const sound = ([x0, y0, x1, y1]) => {
  for (let r = y0 - 1; r <= y1 + 1; r++) for (let c = x0 - 1; c <= x1 + 1; c++) {
    if (!inMap(c, r) || clear[T][I(c, r)] || landing[I(c, r)]) return false;
    if (c >= x0 && c <= x1 && r >= y0 && r <= y1 && (!ground(c, r) || voidDist[I(c, r)] <= 3 || avenue[I(c, r)])) return false;
  }
  return true;
};
const fitted = [];
const fit = b => {
  const [x0, y0, x1, y1] = b, w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (sound(b)) { fitted.push(b); return; }
  if (Math.max(w, h) < 5) return;
  if (w >= h) { const a = x0 + ((w - 1) >> 1); fit([x0, y0, a - 1, y1]); fit([a + 1, y0, x1, y1]); }
  else { const a = y0 + ((h - 1) >> 1); fit([x0, y0, x1, a - 1]); fit([x0, a + 1, x1, y1]); }
};
buildings.forEach(fit);
const kept = fitted.filter(([x0, y0, x1, y1]) => x1 - x0 >= 2 && y1 - y0 >= 2).map(([x0, y0, x1, y1], n) => {
  const d = districtOf(x0, y0), w = x1 - x0 + 1, h = y1 - y0 + 1, u = hash(x0 * 131 + y0 * 7333);
  let type = 'block';
  if (d === 'K') type = 'stall';
  else if (d === 'S') type = 'house';
  else if (d === 'I' && w >= 8 && h >= 8) type = 'ware';
  else if ((d === 'D' && u < 0.15) || (d === 'O' && u < 0.1)) type = 'plaza';
  else if ((d === 'M' || d === 'N') && w >= 7 && h >= 7 && u > 0.7) type = 'yard';
  for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) owner[I(c, r)] = n;
  return {x0, y0, x1, y1, w, h, d, type, u};
});
const g = new Grid(W, H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground(c, r)) g.set('both', c, r, '.');

// ---- the top face. Buildings first, then the boulevards, the park and the street furniture.
const solid = new Uint8Array(W * H);
const putT = (c, r, ch) => { if (ground(c, r) && !clear[T][I(c, r)]) { g.set(T, c, r, ch); if (ch === '#' || ch === '^') solid[I(c, r)] = 1; } };
for (const b of kept) {
  const {x0, y0, x1, y1, w, h, type} = b, edge = (c, r) => c === x0 || c === x1 || r === y0 || r === y1;
  const mx = (x0 + x1) >> 1, my = (y0 + y1) >> 1;
  if (type === 'plaza') { if (w >= 5 && h >= 5) putT(mx, my, '#'); continue; }
  if (type === 'stall') {                                                    // an awning of slow pads on four posts
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++)
      putT(c, r, (c === x0 || c === x1) && (r === y0 || r === y1) && w >= 3 && h >= 3 ? '#' : '=');
    continue;
  }
  if (type === 'house') {                                                    // a house in its yard
    if (w < 5 || h < 5) continue;
    for (let r = y0 + 1; r <= y1 - 1; r++) for (let c = x0 + 1; c <= x1 - 1; c++)
      if (c === x0 + 1 || c === x1 - 1 || r === y0 + 1 || r === y1 - 1) putT(c, r, '#');
    continue;
  }
  const doors = new Set();
  if (type === 'ware') { for (const c of [mx, mx + 1]) { doors.add(I(c, y0)); doors.add(I(c, y1)); } }
  if (type === 'yard') {
    const k = Math.floor(b.u * 40) % 4;
    doors.add(k === 0 ? I(mx, y0) : k === 1 ? I(mx, y1) : k === 2 ? I(x0, my) : I(x1, my));
  }
  for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) if (edge(c, r) && !doors.has(I(c, r))) putT(c, r, '#');
  if (type === 'ware') {                                                     // crates and scrap inside
    for (let r = y0 + 2; r <= y1 - 3; r++) for (let c = x0 + 2; c <= x1 - 3; c++)
      if (mod(c - x0, 5) === 2 && mod(r - y0, 4) === 2 && rnd(c, r, 9) < 0.7 && Math.abs(c - mx) > 1) { putT(c, r, '#'); putT(c + 1, r, '#'); putT(c, r + 1, '#'); putT(c + 1, r + 1, '#'); }
    for (let r = y0 + 1; r <= y1 - 1; r++) for (let c = x0 + 1; c <= x1 - 1; c++)
      if (g.get(T, c, r) === '.' && Math.abs(c - mx - 0.5) > 2 && rnd(c, r, 10) < 0.035) putT(c, r, '^');
  }
  if (type === 'yard' && w >= 7 && h >= 7) putT(mx, my, '#');
  if (type === 'yard' && b.d === 'N') for (let r = y0 + 1; r <= y1 - 1; r++) for (let c = x0 + 1; c <= x1 - 1; c++)
    if (g.get(T, c, r) === '.' && mod(c + r, 4) === 0) putT(c, r, '>');
}
// Boulevards: lanes of boost pads either side of the middle, dashed, away from the crossings.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!avenue[I(c, r)] || !ground(c, r) || voidDist[I(c, r)] <= 1) continue;
  const bc = bandOf(c), br = bandOf(r);
  if (bc >= 0 && br >= 0) continue;
  const off = bc >= 0 ? c - AV[bc] : r - AV[br], t = bc >= 0 ? r : c;
  if (Math.abs(off) === 1 && toCrossing(t) > 4 && mod(t, 6) === 0) putT(c, r, '>');
}
// The park: trees on a loose lattice, flower beds of slow pads, none on the paths.
for (let r = PARK[1]; r <= PARK[3]; r++) for (let c = PARK[0]; c <= PARK[2]; c++) {
  if (!ground(c, r) || pathNear[I(c, r)] || voidDist[I(c, r)] <= 2) continue;
  if (mod(c, 4) === 1 && mod(r, 4) === 1 && rnd(c, r, 11) < 0.6) putT(c, r, '#');
  else if (fbm(c, r, 6, 12) > 0.6 && mod(c + r, 2) === 0) putT(c, r, '=');
}
// Street furniture by district. A spike never stands in an alley one cell wide or next to another spike.
const freeT = (c, r) => ground(c, r) && !solid[I(c, r)];
const spikeOk = (c, r) => {
  if (!((freeT(c - 1, r) || freeT(c + 1, r)) && (freeT(c, r - 1) || freeT(c, r + 1)))) return false;
  if (!(freeT(c - 1, r) && freeT(c + 1, r)) && !(freeT(c, r - 1) && freeT(c, r + 1))) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g.get(T, c + dx, r + dy) === '^') return false;
  return true;
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const i = I(c, r);
  if (!ground(c, r) || avenue[i] || owner[i] >= 0 || inPark(c, r) || bridge[i] || clear[T][i] || landing[i] || avNear[i] || voidDist[i] <= 2) continue;
  const n = rnd(c, r, 13), d = districtOf(c, r);
  let ch = '.';
  if (d === 'O') ch = n < 0.03 ? '^' : fbm(c, r, 5, 14) > 0.6 && mod(c + r, 2) === 0 ? '=' : '.';        // bollards, cobbles
  else if (d === 'M') ch = n < 0.02 ? '^' : '.';
  else if (d === 'D') ch = n < 0.012 ? '^' : '.';
  else if (d === 'K') ch = n < 0.015 ? '^' : mod(c, 4) === 0 && mod(r, 4) === 0 ? '>' : '.';             // lanterns
  else if (d === 'N') ch = n < 0.025 ? '^' : mod(c + 2 * r, 5) === 0 ? '>' : '.';                        // neon
  else if (d === 'S') ch = n < 0.008 ? '^' : mod(c, 7) === 3 && mod(r, 2) === 0 ? '=' : '.';           // speed bumps
  else if (d === 'I') ch = n < 0.035 ? '^' : mod(r, 9) === 4 && mod(c, 8) < 5 ? '>' : '.';              // scrap, conveyors
  if (ch === '^' && !spikeOk(c, r)) ch = '.';
  if (ch !== '.') putT(c, r, ch);
}

// ---- the undercity: metro tunnels under the boulevards (walls along both sides with gaps, a track of
// boost pads, open stations under the crossings), and under every district its own underground.
const contour = (c, r, size, s, w) => Math.abs(fbm(c, r, size, s) - 0.5) < w;
const lattice = (c, r, n, s) => hash(Math.floor(c / n) * 53 + Math.floor(r / n) * 1297 + s * 7);
function bottomTile(c, r, n) {
  if (avenue[I(c, r)]) {
    const bc = bandOf(c), br = bandOf(r);
    if (bc >= 0 && br >= 0) return '.';
    const off = bc >= 0 ? c - AV[bc] : r - AV[br], t = bc >= 0 ? r : c;
    if (toCrossing(t) <= 5) return '.';
    if (Math.abs(off) === 2) return mod(t, 13) >= 3 ? '#' : '.';
    return off === 0 && mod(t, 5) === 0 ? '>' : '.';
  }
  const vein = (size, s, w) => contour(c, r, size, s, w) && vnoise(c, r, 6, s + 5) > 0.3;
  switch (districtOf(c, r)) {
    case 'D': {                                                                                 // depot columns
      if (lattice(c, r, 6, 20) < 0.7 && mod(c, 6) >= 2 && mod(c, 6) < 4 && mod(r, 6) >= 2 && mod(r, 6) < 4) return '#';
      return n < 0.012 ? '^' : '.';
    }
    case 'M': {                                                                                 // sewers
      if (mod(c, 9) === 4 && mod(r, 9) > 1) return '#';
      if (mod(r, 9) === 4 && mod(c, 9) !== 4 && mod(c, 9) !== 3 && mod(c, 9) !== 5) return '=';
      return n < 0.015 ? '^' : '.';
    }
    case 'O': {                                                                                 // catacombs
      const x = mod(c, 6), y = mod(r, 6);
      if (x === 0 && y !== 0 && lattice(c, r - 1, 6, 21) > 0.35 && !(y === 3 && lattice(c, r, 6, 22) < 0.5)) return '#';
      if (y === 0 && x !== 0 && lattice(c - 1, r, 6, 23) > 0.35 && !(x === 3 && lattice(c, r, 6, 24) < 0.5)) return '#';
      return x === 3 && y === 3 && n < 0.3 ? '^' : '.';
    }
    case 'K': {                                                                                 // cisterns
      if (mod(c, 4) === 2 && mod(r, 4) === 2) return '#';
      return fbm(c, r, 7, 25) > 0.58 ? '=' : n < 0.008 ? '^' : '.';
    }
    case 'N': {                                                                                 // the club: chevrons
      if (mod(c - Math.abs(mod(r, 8) - 4), 7) === 0 && mod(r, 8) !== 0) return '>';
      return n < 0.022 ? '^' : '.';
    }
    case 'S': return vein(9, 26, 0.022) ? '#' : n < 0.012 ? '^' : '.';                           // roots
    case 'I': {                                                                                 // steam tunnels
      if (mod(r, 12) === 6 && mod(c, 12) >= 3) return '#';
      return mod(c, 4) === 1 && mod(r, 4) === 1 && n < 0.45 ? '^' : '.';
    }
    case 'P': return vein(8, 27, 0.025) ? '#' : fbm(c, r, 5, 28) > 0.68 && n < 0.3 ? '^' : '.';   // caves
    default: return '.';
  }
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const i = I(c, r);
  if (!ground(c, r) || clear[B][i] || bridge[i]) continue;
  let ch = bottomTile(c, r, rnd(c, r, 2));
  if (/[#^]/.test(ch) && (voidDist[i] <= 2 || landing[i] || near(clear[B], c, r))) ch = '.';
  if (ch !== '.') g.set(B, c, r, ch);
}

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
  } else if (s.kind === 'court') {
    // A building eleven cells square with one door; inside, a ring of slow pads and a fountain.
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.max(Math.abs(x), Math.abs(y));
      if (d === 5 && !(x === 0 && y === 5)) at(x, y, '#');
      else if (d === 4 && x !== 0) at(x, y, '=');
    }
    at(0, 0, '#');
    for (const [x, y] of [[-2, 7], [2, 7], [6, 6], [-6, 6]]) at(x, y, '>');
    chainOf(s, [[0, 6], [0, 5], [0, 4], [0, 3], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -2], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2]]);
  } else if (s.kind === 'roundabout') {
    // An island of walls, the chain all the way round it; bollards at the corners, zebras on the approaches.
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) at(x, y, '#');
    for (const [x, y] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) at(x, y, '^');
    for (const [x, y] of [[5, 0], [-5, 0], [0, -5], [1, 5], [-1, 5], [5, 1], [-5, 1], [1, -5]]) at(x, y, '=');
    chainOf(s, [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -2], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2]]);
  } else if (s.kind === 'alley') {
    // A dog-leg one cell wide between walls, open at both ends.
    const cells = [...Array.from({length: 7}, (_, k) => [k, 0]), ...Array.from({length: 5}, (_, k) => [6, k + 1])];
    const lane = new Set([...cells, [-1, 0], [-2, 0], [-3, 0], [6, 6], [6, 7], [6, 8]].map(([x, y]) => `${x},${y}`));
    for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
      if (!lane.has(`${x + dx},${y + dy}`)) at(x + dx, y + dy, '#');
    for (const [x, y] of [[-3, -2], [-3, 2], [8, 7], [4, 7]]) at(x, y, '^');
    chainOf(s, cells);
  } else if (s.kind === 'vent') {
    const n = s.pit || 1;
    for (let y = -6 - n; y <= 7 + n; y++) for (let x = -6 - n; x <= 7 + n; x++) {
      const dx = Math.abs(x - 0.5), dy = Math.abs(y - 0.5), o = Math.max(Math.max(dx, dy), (dx + dy) / 1.5);
      const [c, r] = p(x, y);
      if (!ground(c, r)) continue;
      if (o > 5.5 + n && o <= 6.5 + n && dx > 2.5 && dy > 2.5) at(x, y, s.ring);
      else if (o <= 5.5 + n && mod(c + r, 3) === 0 && voidDist[I(c, r)] > 1) at(x, y, '=');
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
  } else if (s.kind === 'pier' || s.kind === 'metro') {
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
  if (side === s2 && Math.hypot(c - c2, r - r2) < 20) errors.push(`the artifacts at ${c},${r} and ${c2},${r2} on ${side} are ${Math.hypot(c - c2, r - r2).toFixed(1)} apart`);
}));
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!/[#^]/.test(g.get(T, c, r))) continue;
  if (near(avenue, c, r) || near(path, c, r)) errors.push(`something sharp at ${c},${r} beside a boulevard or a park path`);
}
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

// ---- colours: a neon city at night.
const ROOF = {D: '#6600cc', M: '#444444', O: '#b41e46', K: '#ff0066', N: '#cc00ff', S: '#ff44aa', I: '#993300'};
const UNDER = {D: ['#444444', '#6600cc'], M: ['#6600cc', '#444444'], O: ['#993300', '#b41e46'], K: ['#b41e46', '#993300'],
  N: ['#6600cc', '#cc00ff'], S: ['#b41e46', '#6600cc'], I: ['#444444', '#993300'], P: ['#6600cc', '#b41e46']};
// The glow runs along the canal, the ponds and the holes, not round the coast.
const inland = (c, r) => Math.pow((c - 112) ** 6 + (r - 112) ** 6, 1 / 6) < 86 && !(r > 200 && c > 125);
const colorOf = side => (c, r) => {
  const i = I(c, r);
  if (!ground(c, r)) return '#000000';
  if (bridge[i]) return side === T ? '#ff3300' : '#ff6600';
  if (voidDist[i] <= 1 && inland(c, r)) return '#ff0066';
  if (side === T) {
    if (avenue[i]) return '#ffffff';
    if (inPark(c, r)) return path[i] ? '#999999' : '#ff0088';
    if (owner[i] >= 0 && kept[owner[i]].type !== 'plaza' && kept[owner[i]].type !== 'house') return ROOF[kept[owner[i]].d];
    if (owner[i] >= 0 && kept[owner[i]].type === 'house') {
      const b = kept[owner[i]];
      if (b.w >= 5 && b.h >= 5 && c > b.x0 && c < b.x1 && r > b.y0 && r < b.y1) return ROOF.S;
    }
    return '#999999';
  }
  if (avenue[i]) return crossing(c, r) ? '#ffffff' : '#999999';
  const [a, b2] = UNDER[districtOf(c, r)];
  return fbm(c, r, 24, 310) > 0.55 ? b2 : a;
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'metropolis', name: 'Level 133', kind: 'Neon Metropolis', open: true, start, colors, grid: g};
if (DRAFT) module.exports.debug = {regionOf: districtOf, trail: new Set(), NAMES: []};
if (require.main === module) {
  console.log(g.print());
  console.log(`groups: ${groups.length}, colour layers: ${colors.top.length} + ${colors.bottom.length}`);
}

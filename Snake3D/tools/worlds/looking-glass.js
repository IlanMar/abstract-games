// Level 24 "Looking Glass": the medium-hard world of the four after Aqueduct, both faces of a mirror.
// A square world, an endless plane (the 48 x 48 tile repeats) pierced only by four mirror pools: 3 x 3
// holes framed by wall corners. The road is laid on both faces. It runs on top into a pool, comes out on
// the underside heading back under itself, turns away and runs on to the next pool, and so on: top,
// underside, top, underside, top, and into the start. Where the top is busy the underside under it is
// quiet and the other way round (Flip Side, Dual). Beside the road each stretch has its own trim from the
// story behind the glass:
//   - chess: a chequer of slow pads two and three cells out, a wall rook every eight cells further off;
//   - roses: slow-pad petals two cells out, a spike thorn behind every rose;
//   - cards: card soldiers of wall standing three and four cells out, a boost pad between each two;
//   - clocks: boost-pad ticks two cells out, a spike for every hour further off.
// Stages: a chain leads into every pool and ends one cell before it, the next item waits on the other
// face just where the snake comes out, and the chain from there turns the snake away from the pool
// (Weave). The rest is middle strength: chains through the bends, chains of five and seven cells on the
// straights, a crystal only where no chain fits. No wall or spike stands next to the road on its own face, and past every corner three cells
// straight on stay clear.
const {Grid, MOVES} = require('../grid');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const OTHER = {top: B, bottom: T}, BACK = {N: 'S', S: 'N', E: 'W', W: 'E'};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the road over both faces. Runs of moves as in g.route; 'D' dives: the next cell is the middle of
// a pool's edge, the snake falls through it onto the other face and comes back the way it came.
const RUNS = 'N24 E16 D W4 S14 E20 N18 D S6 E6 S18 W10 D E3 S8 W22 N12 D S12 W9 N2';
const path = [{side: T, c: start[0], r: start[1], h: 'N', hole: false}];
const pools = [];
{
  let side = T, [c, r] = start, h = 'N';
  for (const run of RUNS.split(' ')) {
    if (run === 'D') {
      [c, r] = g.move(c, r, h);
      pools.push({at: g.move(c, r, h), entry: [c, r], index: path.length});
      path.push({side, c, r, h, hole: true});
      side = OTHER[side]; h = BACK[h];
      continue;
    }
    const [, m, n] = run.match(/^([A-Z])(\d+)$/);
    if (path[path.length - 1].hole && m !== h) throw new Error(`the run after a dive must head ${h}`);
    for (let i = 0; i < +n; i++) { [c, r] = g.move(c, r, m); h = m; path.push({side, c, r, h, hole: false}); }
  }
  if (side !== T || key(c, r) !== key(...start)) throw new Error(`the road ends at ${c},${r} on ${side}, not at the start`);
  path.pop();
  path[0].h = h;
}
const L = path.length;
const at = i => path[mod(i, L)];
for (const side of [T, B]) {
  const seen = new Set();
  for (const p of path) if (p.side === side && !p.hole) {
    if (seen.has(key(p.c, p.r))) throw new Error(`the road crosses itself on ${side} at ${p.c},${p.r}`);
    seen.add(key(p.c, p.r));
  }
}
// The pools, cut through both faces; no road cell may lie in one except the cell it dives through.
const poolCell = new Set();
for (const {at: [pc, pr]} of pools) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  const q = wrap(pc + dx, pr + dy);
  g.hole(...q);
  poolCell.add(key(...q));
}
for (const p of path) if (!p.hole && poolCell.has(key(p.c, p.r))) throw new Error(`the road runs through a pool at ${p.c},${p.r}`);

// Corners (the cell where the heading changes next step) and stretches; a dive ends a stretch too.
const seg = [], corners = [], dives = new Set(pools.map(p => p.index));
{ let s = 0; for (let i = 1; i <= L; i++) { seg[i % L] = s; if (dives.has(i % L) || (!at(i).hole && at(i + 1).h !== at(i).h && !at(i + 1).hole)) { if (!dives.has(i % L)) corners.push(i); s++; } } }
const stretches = s => s;   // stretch number of a path index: seg[i]

// Distance d from the road on each face (8 neighbours), the road cell i each cell hangs from, u along it.
const near = {top: new Map(), bottom: new Map()};
for (const side of [T, B]) {
  let front = [];
  path.forEach((p, i) => { if (p.side === side) { near[side].set(key(p.c, p.r), {d: 0, i}); front.push([[p.c, p.r], i]); } });
  for (let d = 1; front.length; d++) {
    const next = [];
    for (const [[c, r], i] of front) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const q = wrap(c + dx, r + dy);
      if (near[side].has(key(...q))) continue;
      near[side].set(key(...q), {d, i});
      next.push([q, i]);
    }
    front = next;
  }
}
function local(side, c, r) {
  const {d, i} = near[side].get(key(c, r));
  const p = at(i), [hx, hy] = MOVES[p.h];
  let dx = c - p.c, dy = r - p.r;
  if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
  if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H;
  return {d, i, u: i + dx * hx + dy * hy, v: dx * hy - dy * hx, s: seg[i], c, r};
}

// Past every corner three cells straight on stay clear, with the cells round them, on the corner's face.
const runout = {top: new Set(), bottom: new Set()};
for (const k of corners) {
  const p = at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) {
    q = g.move(...q, p.h);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout[p.side].add(key(...wrap(q[0] + dx, q[1] + dy)));
  }
}

// ---- the trim beside each stretch, on the stretch's own face.
const TRIM = {
  chess: ({u, d}) => (d === 2 || d === 3) && mod(u + d, 2) === 0 ? '=' : d === 5 && mod(u, 8) === 4 ? '#' : '.',
  roses: ({u, d}) => d === 2 && mod(u, 5) < 2 ? '=' : d === 3 && mod(u, 5) === 0 ? '^' : '.',
  cards: ({u, d}) => (d === 3 || d === 4) && mod(u, 4) < 2 ? '#' : d === 3 && mod(u, 4) === 3 ? '>' : '.',
  clocks: ({u, d}) => d === 2 && mod(u, 3) === 0 ? '>' : d === 4 && mod(u, 6) === 3 ? '^' : '.'
};
const CYCLE = ['chess', 'roses', 'cards', 'clocks', 'roses', 'chess', 'clocks', 'cards'];
const nStretch = Math.max(...seg) + 1;
const theme = Array.from({length: nStretch}, (_, s) => CYCLE[s % CYCLE.length]);
const REACH = 5;
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (poolCell.has(key(c, r))) continue;
  const q = local(side, c, r);
  if (q.d < 2 || q.d > REACH) continue;
  // Under a busy stretch of the other face the trim keeps to pads.
  const o = local(OTHER[side], c, r);
  let ch = TRIM[theme[q.s]](q);
  if (/[#^]/.test(ch) && (runout[side].has(key(c, r)) || o.d <= 1)) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
// The frames of the pools: wall corners on both faces, two cells from the pool's middle.
for (const {at: [pc, pr]} of pools) for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.set('both', ...wrap(pc + dx, pr + dy), '#');
// Far from the road: a scatter of slow pads on top, boost-pad stars on the underside.
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (!poolCell.has(key(c, r)) && local(side, c, r).d > REACH && g.get(side, c, r) === '.' && hash(c + (side === B ? 99 : 0), r) < 0.05) g.set(side, c, r, side === T ? '=' : '>');

for (const p of path) if (!p.hole) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(p.side, ...wrap(p.c + dx, p.r + dy)))) throw new Error(`an obstacle at ${wrap(p.c + dx, p.r + dy)} on ${p.side} stands next to the road`);

// ---- stages, by path index. Each stage begins within three cells of the end of the one before and on
// the same heading, unless a pool lies between: then the lead-in chain ends right before the pool and
// the stage after it begins on the cell where the snake comes out.
const stages = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const marks = [...corners.filter(k => k > 11).map(k => ({k, dive: false})), ...[...dives].filter(k => k > 11).map(k => ({k, dive: true})),
    ...corners.map(k => ({k: k + L, dive: false})), ...[...dives].map(k => ({k: k + L, dive: true}))].sort((a, b) => a.k - b.k);
  for (let n = 0; n < marks.length; n++) {
    const {k, dive} = marks[n];
    if (k + 2 > end) break;
    const pre = dive ? 6 : n % 2 ? 4 : 6;
    while (k - pre - pos >= 2) {
      const room = k - pre - pos;
      let to;
      if (room >= 6) { const len = room >= 8 && kind % 2 === 0 ? 6 : 4; stages.push([['chain', pos, pos + len]]); to = pos + len; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      pos = to + 2;
    }
    if (dive) {
      // The lead-in: a straight chain up to the cell before the pool. The next stage starts where the
      // snake comes out on the other face: a chain on to the next bend if it is near, else a crystal.
      stages.push([['chain', Math.max(pos, k - 6), k - 1]]);
      pos = k + 1;
      const next = marks[n + 1];
      if (next && !next.dive && next.k - pos <= 7) {
        let last = n + 1;
        while (marks[last + 1] && !marks[last + 1].dive && marks[last + 1].k - marks[last].k <= 4) last++;
        stages.push([['chain', pos, marks[last].k + 2]]);
        pos = marks[last].k + 4;
        n = last;
      }
      continue;
    }
    let last = n;
    while (marks[last + 1] && !marks[last + 1].dive && marks[last + 1].k - marks[last].k <= 4 && marks[last + 1].k + 2 <= end) last++;
    const tight = marks[last + 1] && marks[last + 1].k - marks[last].k <= 8;
    const to = tight ? marks[last].k + 1 : marks[last].k + 2;
    if (k - pos >= 4 && n % 3 === 0) stages.push([['gem', pos], ['chain', pos + 2, to]]);
    else stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
    n = last;
  }
  while (end - pos >= 9) { stages.push([['chain', pos, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
{
  const first = s => s[0][1], last = s => Math.max(...s.map(([, ...ix]) => ix[ix.length - 1]));
  const range = (a, b) => Array.from({length: b - a + 1}, (_, k) => a + k);
  stages.forEach((s, k) => {
    const e = last(s), f = k + 1 < stages.length ? first(stages[k + 1]) : first(stages[0]) + L;
    const dived = range(e + 1, f - 1).some(i => at(i).hole);
    if (dived) { if (f - e !== 2 || !at(e + 1).hole) throw new Error(`stage ${k + 2} is not right after the pool`); }
    else {
      if (f - e > 3) throw new Error(`stage ${k + 2} begins ${f - e} cells after stage ${k + 1}`);
      for (const i of range(e + 1, f)) if (at(i).h !== at(e).h) throw new Error(`stage ${k + 2} starts round a bend`);
    }
    g.stage(...s.map(([kind, ...ix]) => {
      const cells = kind === 'chain' ? range(ix[0], ix[1]) : ix;
      const ps = cells.map(at), side = ps[0].side;
      if (ps.some(p => p.side !== side || p.hole)) throw new Error(`stage ${k + 1}: a group crosses a pool`);
      const list = ps.map(p => [p.c, p.r]);
      return kind === 'gem' ? ['gem', side, ...list[0]] : [kind === 'gems' ? 'gems' : 'chain', side, list];
    }));
  });
}

// ---- colours: the top is the sunny side of the glass, a caramel road through rose gardens and a dark
// chessboard far off; the underside is its night, a pink road through violet. Under every pool frame a
// raspberry glow on both faces.
const floors = {chess: ['#b41e46', '#ff0066'], roses: ['#ff0088', '#ff44aa'], cards: ['#993300', '#ff5a28'], clocks: ['#6600cc', '#ff00ff']};
const nearPool = (c, r) => pools.some(({at: [pc, pr]}) => { const dx = Math.abs(c - pc), dy = Math.abs(r - pr);
  return Math.max(Math.min(dx, W - dx), Math.min(dy, H - dy)) <= 3; });
const colorOf = side => (c, r) => {
  const q = local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff99cc');
  if (nearPool(c, r)) return '#ff0066';
  if (q.d > REACH) return side === T ? (mod(Math.floor(c / 4) + Math.floor(r / 4), 2) ? '#993300' : '#b41e46') : '#6600cc';
  const [main, band] = floors[theme[q.s]];
  return side === B && q.d > 1 ? '#6600cc' : q.d === 1 ? band : main;
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'looking-glass', name: 'Level 24', kind: 'Looking Glass', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\npools:', pools.map(p => p.at).join(' '), '\nthemes:', theme.join(' '));

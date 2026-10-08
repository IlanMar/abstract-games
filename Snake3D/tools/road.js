// A road over both faces, for world scripts in the manner of the middle and late classic levels, where
// half the play is on the underside. Written from the road of looking-glass.js.
//
//   const R = road(g, [c, r, 'N'], 'N12 E8 D W3 S10 ...')
//
// Runs of moves as in g.route. 'D' dives: the next cell is a hole or the void past the end of the land;
// the snake falls through it onto the other face of the same cell and comes back the way it came, so the
// run after a 'D' heads the other way (W after E, SW after NE) and is at least six cells long (the
// player needs them to find the next item). The road must come back to its start on
// top. R.at(i) is the road cell i, wrapping round: {side, c, r, h (the move that reached it), hole}.
// R.local(side, c, r) gives, for any cell of a face, its distance d from the road on that face, the road
// index i (u along it, v across it) and the stretch s. R.corners and R.dives list road indices.
//
//   const {stages, pads} = autoStages(R, {...}); placeStages(g, R, stages); putPads(g, R, pads)
//
// lays the stages out along the road like the classic levels: long chains, a chain through every run of
// close bends, a lead-in chain right up to each dive and the next stage right where the snake comes out.
const {hexStep} = require('./grid');
const OTHER = {top: 'bottom', bottom: 'top'};
const BACK = {N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', SE: 'NW', NW: 'SE'};
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

function road(g, [c0, r0, h0], runs) {
  const path = [{side: 'top', c: c0, r: r0, h: h0, hole: false}];
  let side = 'top', c = c0, r = r0, h = h0;
  for (const run of runs.split(/\s+/).filter(Boolean)) {
    if (run === 'D') {
      [c, r] = g.move(c, r, h);
      path.push({side, c, r, h, hole: true});
      side = OTHER[side]; h = BACK[h];
      continue;
    }
    const [, m, n] = run.match(/^([A-Z]+)(\d+)$/);
    if (path[path.length - 1].hole && m !== h) throw new Error(`the run after a dive at ${c},${r} must head ${h}`);
    // A player who comes out of a dive needs a few cells to find the item before the road turns.
    if (path[path.length - 1].hole && +n < 6 && path.length > 1 && runs.trim().split(/\s+/).pop() !== run) throw new Error(`the run after the dive at ${c},${r} is ${n} cells: give it six`);
    for (let i = 0; i < +n; i++) { [c, r] = g.move(c, r, m); h = m; path.push({side, c, r, h, hole: false}); }
  }
  if (side !== 'top' || key(c, r) !== key(c0, r0)) throw new Error(`the road ends at ${c},${r} on ${side}, not at its start`);
  path.pop();
  path[0].h = h;
  const L = path.length, at = i => path[mod(i, L)];
  const holes = new Set(path.filter(p => p.hole).map(p => key(p.c, p.r)));
  const on = {top: new Set(), bottom: new Set()};
  for (const p of path) if (!p.hole) {
    if (on[p.side].has(key(p.c, p.r))) throw new Error(`the road crosses itself on ${p.side} at ${p.c},${p.r}`);
    if (holes.has(key(p.c, p.r))) throw new Error(`the road runs over the hole at ${p.c},${p.r}`);
    on[p.side].add(key(p.c, p.r));
  }
  // Corners: the cell after which the heading changes (not at a dive). A dive or a corner ends a stretch.
  const corners = [], dives = [], seg = [];
  path.forEach((p, i) => { if (p.hole) dives.push(i); });
  for (let i = 0; i < L; i++) if (!at(i).hole && !at(i + 1).hole && at(i + 1).h !== at(i).h) corners.push(i);
  { let s = 0; for (let i = 0; i < L; i++) { seg[i] = s; if (corners.includes(i) || at(i).hole) s++; } }
  // The cells before the first corner or dive belong to the last stretch: the start lies on a straight.
  const first = Math.min(...corners, ...dives);
  for (let i = 0; i <= first && !at(i).hole; i++) seg[i] = seg[L - 1];

  // Distance from the road on each face: 8 neighbours in a square world, 6 in a hex one.
  const W = g.w, H = g.h;
  const wrap = (c, r) => [mod(c, W), mod(r, H)];
  const nbrs = (c, r) => g.hex ? ['N', 'NE', 'SE', 'S', 'SW', 'NW'].map(m => g.step(c, r, m))
    : [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(([dx, dy]) => wrap(c + dx, r + dy));
  const near = {top: new Map(), bottom: new Map()};
  for (const sd of ['top', 'bottom']) {
    let front = [];
    path.forEach((p, i) => { if (p.side === sd && !p.hole) { near[sd].set(key(p.c, p.r), {d: 0, i}); front.push([p.c, p.r, i]); } });
    for (let d = 1; front.length; d++) {
      const next = [];
      for (const [c, r, i] of front) for (const q of nbrs(c, r)) {
        if (near[sd].has(key(...q))) continue;
        near[sd].set(key(...q), {d, i});
        next.push([...q, i]);
      }
      front = next;
    }
  }
  const xy = (c, r) => g.hex ? [c * 0.866, r + 0.5 * (c & 1)] : [c, r];
  const delta = (a, b) => { const [ax, ay] = xy(...a), [bx, by] = xy(...b), WW = g.hex ? W * 0.866 : W;
    let dx = bx - ax, dy = by - ay; dx -= Math.round(dx / WW) * WW; dy -= Math.round(dy / H) * H; return [dx, dy]; };
  function local(sd, c, r) {
    const e = near[sd].get(key(c, r));
    if (!e) return {d: Infinity, i: 0, u: 0, v: 0, s: 0, c, r};
    const {d, i} = e, p = at(i);
    const a = at(i - 1).hole ? p : at(i - 1), b = at(i + 1).hole ? p : at(i + 1);
    let [hx, hy] = delta([a.c, a.r], [b.c, b.r]);
    if (!hx && !hy) [hx, hy] = g.hex ? delta([p.c, p.r], hexStep(p.c, p.r, p.h, H)) : {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]}[p.h];
    const n = Math.hypot(hx, hy), [ox, oy] = delta([p.c, p.r], [c, r]);
    return {d, i, u: i + Math.round((ox * hx + oy * hy) / n), v: hx * oy - hy * ox < 0 ? 1 : -1, s: seg[i], c, r};
  }
  return {length: L, cells: path, at, corners, dives, seg, holes, on, local, nbrs,
    has: (sd, c, r) => on[sd].has(key(c, r))};
}

// Stages along the road, by road index: each a list of groups ['gem', i], ['gems', i, j, ...] or
// ['chain', i, j]. pads: [[i, '>' or '='], ...] for the road itself.
//   first: index of the first stage (11: the first 2 s the snake runs on its own);
//   lengths: straight chain lengths, used in turn; lead: [long, short] cells a corner chain begins before
//   its bend; launch: straights this long get a crystal, a boost strip and a long chain (0: none);
//   pair: every pair-th corner stage also has a crystal on the straight before it; gate(i): true where
//   a stage ending at i should be followed by a '>=' gate on the road; gaps: empty road cells between
//   two stages on one heading, used in turn (11 puts the next stage at the edge of sight, 12 cells
//   ahead); a stage after a gap is shorter, and none waits where the snake comes out of a dive; crumbs:
//   every crumbs-th gap of 6 cells or more gets crystals every three cells leading to the stage (0: none);
//   rails: every rails-th lone bend gets no chain, the next stage waits two cells past it and the painted
//   road shows the turn (0: none; placeStages then needs {bends: 1}).
function autoStages(R, {first = 11, lengths = [9, 12], lead = [7, 4], launch = 0, pair = 0, gate = () => false,
  gaps = [1], crumbs = 0, rails = 0} = {}) {
  const L = R.length, stages = [], pads = [];
  const end = L + first - 3;
  const marks = [...R.corners.map(k => ({k, dive: false})), ...R.dives.map(k => ({k, dive: true}))]
    .flatMap(m => [m, {k: m.k + L, dive: m.dive}]).filter(m => m.k > first && m.k + 2 <= end).sort((a, b) => a.k - b.k);
  // free: the next stage may wait gaps[...] cells further on (not the first one, nor where the snake
  // comes out of a dive); wait never leaves less than room cells for it before limit.
  // A long wait is sometimes strewn with crumbs: crystals every three cells that lead on to the stage,
  // which takes them in as its first group (every crumbs-th long wait; 0: none).
  let pos = first, nLen = 0, nCorner = 0, nGap = 0, nLong = 0, nRail = 0, free = false;
  const lastEnd = () => Math.max(...stages[stages.length - 1].map(([, ...ix]) => ix[ix.length - 1]));
  const wait = (limit, room) => {
    const from = pos, extra = free ? Math.max(0, Math.min(gaps[nGap++ % gaps.length] - 1, limit - pos - room)) : 0;
    free = true;
    pos += extra;
    if (extra < 5 || !crumbs || nLong++ % crumbs) return [];
    return [['gems', ...Array.from({length: Math.floor((extra - 1) / 3) + 1}, (_, k) => from + k * 3)]];
  };
  const fill = limit => {           // straight chains from pos up to limit (the last cell they may take)
    while (limit - pos >= 4) {
      const crumb = wait(limit, 6);
      let len = Math.min(lengths[nLen++ % lengths.length] - 1, limit - pos);
      if (limit - pos - len < 6) len = limit - pos;      // too little left for another chain: take it all
      stages.push([...crumb, ['chain', pos, pos + len]]);
      const e = pos + len;
      if (gate(e) && limit - e >= 4) { pads.push([e + 1, '>'], [e + 2, '=']); pos = e + 3; }
      else pos = e + 2;
    }
  };
  for (let n = 0; n < marks.length; n++) {
    const {k, dive} = marks[n];
    if (dive) {
      // A lead-in chain right up to the cell before the dive; the next stage begins where the snake comes out.
      fill(k - 6);
      stages.push([['chain', Math.min(pos, k - 3), k - 1]]);
      pos = k + 1;
      free = false;
      continue;
    }
    if (launch && k - pos >= launch) {
      stages.push([['gem', pos]]);
      pads.push([pos + 1, '>'], [pos + 2, '>'], [k - 6, '=']);
      stages.push([['chain', pos + 3, k - 7]]);
      pos = k - 5;
      free = false;
    }
    const pre = lead[nCorner % lead.length];
    fill(k - pre - 2);
    // One chain through the run of close bends that starts here.
    let last = n;
    while (marks[last + 1] && !marks[last + 1].dive && marks[last + 1].k - marks[last].k <= 5) last++;
    const nextK = marks[last + 1] ? marks[last + 1].k : end + 3;
    // Rails: a lone bend with a long straight after it is left to the painted road.
    if (rails && last === n && stages.length && free && nextK - k >= 12 && k + 2 - lastEnd() <= 12 && nRail++ % rails === rails - 1) {
      pos = k + 2;
      free = false;
      continue;
    }
    const crumb = wait(k - Math.min(pre, 3), 0);
    const to = Math.min(marks[last].k + (nextK - marks[last].k <= 7 ? 1 : 3), nextK - (marks[last + 1] && marks[last + 1].dive ? 4 : 3));
    const from = Math.min(pos, k - 1);
    if (crumb.length) stages.push([...crumb, ['chain', from, to]]);
    else if (pair && nCorner % pair === 0 && k - from >= 5) stages.push([['gem', from], ['chain', from + 2, to]]);
    else stages.push([['chain', from, to]]);
    nCorner++;
    pos = to + 2;
    n = last;
  }
  fill(end);
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else if (end === pos) stages.push([['gem', pos]]);
  return {stages, pads};
}

// Puts the stages on the grid and checks the thread: each stage begins within twelve cells (the edge of
// sight) of the end of the one before and on the same heading (or past at most `bends` bends of a painted road), or, across a dive, right on the cell where the snake comes out.
function placeStages(g, R, stages, {bends = 0} = {}) {
  const L = R.length, at = R.at;
  const firstOf = s => s[0][1], lastOf = s => Math.max(...s.map(([, ...ix]) => ix[ix.length - 1]));
  const range = (a, b) => Array.from({length: b - a + 1}, (_, k) => a + k);
  stages.forEach((s, k) => {
    const e = lastOf(s), f = k + 1 < stages.length ? firstOf(stages[k + 1]) : firstOf(stages[0]) + L;
    const n = (k + 1) % stages.length + 1;
    if (f <= e) throw new Error(`stage ${n} begins before stage ${k + 1} ends`);
    const holes = range(e + 1, f - 1).filter(i => at(i).hole);
    if (holes.length) { if (holes.length > 1 || f !== holes[0] + 1 || holes[0] - e > 3) throw new Error(`stage ${n} is not right after the dive past stage ${k + 1}`); }
    else {
      if (f - e > 12) throw new Error(`stage ${n} begins ${f - e} cells after stage ${k + 1}`);
      if (range(e + 1, f).filter(i => at(i).h !== at(i - 1).h).length > bends) throw new Error(`stage ${n} starts round a bend`);
    }
    g.stage(...s.map(([kind, ...ix]) => {
      const cells = kind === 'chain' ? range(ix[0], ix[1]) : ix;
      const ps = cells.map(at), side = ps[0].side;
      if (ps.some(p => p.side !== side || p.hole)) throw new Error(`stage ${k + 1}: a group runs through a dive`);
      const list = ps.map(p => [p.c, p.r]);
      return kind === 'gem' ? ['gem', side, ...list[0]] : [kind, side, list];
    }));
  });
}

// Pads on the road itself, on free floor only.
function putPads(g, R, pads) {
  for (const [i, ch] of pads) { const p = R.at(i); if (!p.hole && g.get(p.side, p.c, p.r) === '.') g.set(p.side, p.c, p.r, ch); }
}

module.exports = {road, autoStages, placeStages, putPads, OTHER, BACK};

// Common pieces of a world script on tools/road.js, for new worlds. Scripts written before it keep their own
// copies of these pieces and are not to be changed (levels.js must rebuild unchanged).
//
//   const kit = require('../worldkit');
//   const gap = kit.diveGaps(g, R);             // the dive cells and the cells beside them
//   ...add holes of your own to gap...
//   kit.punch(g, R, gap);                       // cut them, checking the road stays on land
//   const glow = kit.glow(g, gap);              // the cells round the holes, for a highlight colour
//   const runout = kit.runouts(g, R);           // past every corner, cells kept clear on its face
//   kit.paint(g, R, {skip: gap, keep: [glow], runout}, (side, c, r, q, n) => '...');
//   kit.checkRoad(g, R);                        // nothing sharp next to the road
//
// Everything wraps round the world's edges and works in square and hex worlds alike.
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const unkey = k => k.split(',').map(Number);
// A fixed pseudo-random number in [0, 1) for an integer.
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// The cells the road dives through, as a set of keys. Square: the dive cell and its two neighbours
// across the road. Hex: the dive cell and its neighbours that are not road on either face.
function diveGaps(g, R) {
  const gap = new Set();
  for (const p of R.cells) if (p.hole) {
    gap.add(key(p.c, p.r));
    if (g.hex) {
      for (const o of R.nbrs(p.c, p.r)) if (!R.has('top', ...o) && !R.has('bottom', ...o)) gap.add(key(...o));
    } else {
      const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
      for (const [dx, dy] of across) gap.add(key(mod(p.c + dx, g.w), mod(p.r + dy, g.h)));
    }
  }
  return gap;
}

// Cuts the holes in `gap` through both faces; throws if the road (other than its dive cells) runs over one.
function punch(g, R, gap, what = 'a hole') {
  for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over ${what} at ${p.c},${p.r}`);
  for (const k of gap) g.hole(...unkey(k));
}

// The cells within one step of any cell of `cells` (square: the 3 x 3 block, hex: the disk of radius one).
function glow(g, cells) {
  const out = new Set();
  for (const k of cells) {
    const [c, r] = unkey(k);
    if (g.hex) g.disk(c, r, 1).forEach(q => out.add(key(...q)));
    else for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.add(key(mod(c + dx, g.w), mod(r + dy, g.h)));
  }
  return out;
}

// Past every corner, `n` cells straight on and the cells round them, per face: {top: Set, bottom: Set}.
// Keep walls and spikes off them, or a snake that turns a little late runs into one.
function runouts(g, R, n = 3) {
  const out = {top: new Set(), bottom: new Set()};
  for (const k of R.corners) {
    const p = R.at(k);
    let q = [p.c, p.r];
    for (let s = 0; s < n; s++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) out[p.side].add(key(...o)); }
  }
  return out;
}

// Fills both faces cell by cell. draw(side, c, r, q, n) returns a tile ('.', '#', '^', '>', '=') for every
// cell that is not road and not in `skip`; q is R.local(side, c, r) and n a fixed random number for the
// cell and face. A wall or spike is dropped where it would stand next to the road (q.d <= 1), on a
// runout of its face, or in any set of `keep`. `cells` limits the fill to a list of keys (a world over
// the void: only its land).
function paint(g, R, {skip = new Set(), keep = [], runout = {top: new Set(), bottom: new Set()}, cells = null} = {}, draw) {
  const all = cells || (function* () { for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) yield key(c, r); })();
  for (const k of all) {
    if (skip.has(k)) continue;
    const [c, r] = unkey(k);
    for (const side of ['top', 'bottom']) {
      const q = R.local(side, c, r);
      if (q.d === 0) continue;
      let ch = draw(side, c, r, q, hash(c * 131 + r * 71 + (side === 'top' ? 0 : 7919)));
      if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || keep.some(s => s.has(k)))) ch = '.';
      if (ch !== '.') g.set(side, c, r, ch);
    }
  }
}

// Throws if a wall or a spike stands next to the road on the road's face.
function checkRoad(g, R) {
  for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
    if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);
}

// The road's own colour in two-cell stripes: road(q, ['#ff6600', '#ff5a28']) for a cell with q.d === 0.
const stripe = (q, [a, b]) => (mod(q.i, 4) < 2 ? a : b);

// The steepest step between neighbours of a relief (height[r][c]; square: across the four sides, hex: the
// six); it must not pass 0.5.
function steepest(g, R, height) {
  let worst = 0;
  const side = (c, r) => g.hex ? R.nbrs(c, r) : [g.move(c, r, 'E'), g.move(c, r, 'S')];
  for (let r = 0; r < g.h; r++) for (let c = 0; c < g.w; c++) for (const [x, y] of side(c, r)) worst = Math.max(worst, Math.abs(height[r][c] - height[y][x]));
  return worst;
}

module.exports = {mod, key, unkey, hash, diveGaps, punch, glow, runouts, paint, checkRoad, stripe, steepest};

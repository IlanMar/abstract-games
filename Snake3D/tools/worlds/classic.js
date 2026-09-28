// Classic levels: the 36 levels and 6 bonus levels of the 2005 mobile "Snakes", converted from the
// decoded level files in tools/classic-data.json. The data was decoded by the scripts in Snake3D/original
// (kept out of git); its README describes the original file formats.
// This module exports a list of worlds, one per original level, in the original play order.
//
// What maps to what:
//   solid wall -> '#', breakable wall -> '^' (it hurts less and breaks, like a spike), green speed-up
//   area -> '>', red slow-down area -> '=', gap in the floor -> ' '. Every other cell is floor.
//   Pick-ups the level script shows -> crystals; a power path (start marker, path cells, end marker)
//   -> a chain. The script is played out in waves: a stage is every item that becomes active when the
//   items of the previous stage have been taken. Letters, extra lives, seekers and drones have no
//   counterpart in this engine and are left out.
//   Floor colours are the original per-cell colours (12-bit RGB).
// Geometry: the original world wraps round like this engine's, so no frame is added. Its hex levels
// shift odd rows, this engine odd columns, so hex levels are turned a quarter turn. A level that
// starts on the underside is turned over, so that the snake starts on top as the engine expects.
const {Grid, MOVES, isItem} = require('../grid');
const walkable = ch => ch === '.' || isItem(ch);
const DATA = require('../classic-data.json');

const TILE = {' ': ' ', '#': '#', '^': '^', '>': '>', '=': '=', '.': '.'};
const HEX_DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

function convert(L, number) {
  const hex = L.hex;
  const W = hex ? L.h : L.w, H = hex ? L.w : L.h;
  const flip = L.start[1] === 0;              // the snake starts on the underside: turn the slab over
  const topLayer = flip ? 0 : 1;
  const side = layer => (layer === topLayer ? 'top' : 'bottom');
  // Original cell (x, z) -> picture cell (c, r). z runs north, picture lines run south.
  const at = (x, z) => {
    let c = hex ? z : x, r = hex ? x : L.h - 1 - z;
    if (flip) c = (W - c) % W;
    return [c, r];
  };
  const g = new Grid(W, H, hex);
  for (const layer of [0, 1]) for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) {
    const [c, r] = at(x, z);
    g[side(layer)][r][c] = TILE[L.tiles[layer][z][x]];
  }
  const key = (c, r) => `${c},${r}`;
  const near = (c, r) => (hex ? HEX_DIRS : Object.keys(MOVES)).map(m => g.move(c, r, m));

  // Marks: power path start (5), path (4), end (6), pick-up (15), extra life (35).
  const marks = new Map();
  for (const [x, layer, z, t] of L.marks) {
    const [c, r] = at(x, z), k = `${side(layer)}:${key(c, r)}`;
    if (!marks.has(k)) marks.set(k, new Set());
    marks.get(k).add(t);
  }
  const markAt = (s, c, r) => marks.get(`${s}:${key(c, r)}`) || new Set();

  // A power path: the longest walk from its start marker over path cells on the same face.
  function tracePath(s, c0, r0) {
    const inPath = (c, r) => { const m = markAt(s, c, r); return m.has(4) || m.has(6); };
    let best = [];
    const seen = new Set([key(c0, r0)]);
    let budget = 20000;
    (function walk(cell, list) {
      if (list.length > best.length) best = list.slice();
      if (--budget < 0) return;
      for (const n of near(...cell)) {
        const k = key(...n);
        if (seen.has(k) || !inPath(...n)) continue;
        seen.add(k); list.push(n);
        walk(n, list);
        list.pop(); seen.delete(k);
      }
    })([c0, r0], [[c0, r0]]);
    return best;
  }

  // ---- the level script, played out in waves. A row's targets are switched on when it is taken; '&a:b'
  // and '|a:b' both name several (the original picks one of a '|' pair at random: here both play), and
  // several rows may share an id. A pick-up that nothing refers to is in play from the start.
  const rows = L.script.map(([id, feat, state, target, kind, param]) =>
    ({id, feat, state, kind, param, count: 0,
      targets: target === 'x' || target[0] === '~' ? [] : target.replace(/[&|]/g, '').split(':').map(Number)}));
  const byId = new Map();
  for (const it of rows) { if (!byId.has(it.id)) byId.set(it.id, []); byId.get(it.id).push(it); }
  const referred = new Set(rows.flatMap(it => it.targets));
  const isPickup = it => {
    if (it.feat === null) return false;
    const [x, layer, z] = L.feat[it.feat], [c, r] = at(x, z);
    return markAt(side(layer), c, r).has(15);
  };
  const waves = [];
  const visited = new Set();
  let active = rows.filter(it => it.state === 1 || (it.state === 0 && !referred.has(it.id) && isPickup(it)));
  while (active.length) {
    const wave = active.filter(it => !visited.has(it));
    if (!wave.length) break;
    wave.forEach(it => visited.add(it));
    const next = [];
    const fire = id => {
      for (const it of byId.get(id) || []) {
        if (it.kind === 'a') { if (++it.count === it.param) it.targets.forEach(fire); }
        else next.push(it);
      }
    };
    wave.forEach(it => it.targets.forEach(fire));
    waves.push(wave);
    active = next;
  }

  // ---- items of every wave: chains for power paths, crystals for pick-ups.
  const chainOf = new Map(), chainCells = new Map(), owner = new Map(), skipped = [];
  const stages = [];
  for (const wave of waves) {
    const groups = [];
    for (const it of wave) {
      if (it.feat === null) continue;                   // a gate of the script
      const [x, layer, z] = L.feat[it.feat];
      const s = side(layer), [c, r] = at(x, z), m = markAt(s, c, r);
      if (m.has(5)) {
        const fk = `${s}:${key(c, r)}`;
        if (!chainOf.has(fk)) {
          const cells = tracePath(s, c, r);
          if (cells.some(q => owner.has(`${s}:${key(...q)}`))) { skipped.push(`path at ${c},${r} overlaps another`); continue; }
          if (cells.length < 2) { skipped.push(`path at ${c},${r} has no cells`); continue; }
          chainOf.set(fk, cells);
          for (const q of cells) owner.set(`${s}:${key(...q)}`, fk);
          chainCells.set(fk, {s, cells});
        }
        groups.push({kind: 'chain', id: fk});
      } else if (m.has(15)) groups.push({kind: 'gem', s, c, r});
    }
    if (groups.length) stages.push(groups);
  }
  // A crystal lying on a power path that is in play gives way to the path.
  for (const st of stages) for (let i = st.length - 1; i >= 0; i--) {
    const q = st[i];
    if (q.kind === 'gem' && owner.has(`${q.s}:${key(q.c, q.r)}`)) st.splice(i, 1);
  }
  // Crystals and chains lie on plain floor of their own face.
  for (const {s, cells} of chainCells.values()) for (const [c, r] of cells) if (g[s][r][c] !== ' ') g[s][r][c] = '.';
  for (const st of stages) for (let i = st.length - 1; i >= 0; i--) {
    const q = st[i];
    if (q.kind === 'gem') {
      if (g[q.s][q.r][q.c] === ' ') { skipped.push(`crystal at ${q.c},${q.r} is not on floor`); st.splice(i, 1); }
      else g[q.s][q.r][q.c] = '.';
    }
  }
  const kept = stages.filter(st => st.length);

  // ---- letters. A chain has a letter of its own. Crystals that are always in play together share an
  // upper-case letter (each cell is still a crystal of its own).
  const chainLetter = new Map();
  for (const st of kept) for (const q of st) if (q.kind === 'chain' && !chainLetter.has(q.id)) chainLetter.set(q.id, g.letter('chain'));
  const gemStages = new Map();
  kept.forEach((st, i) => { for (const q of st) if (q.kind === 'gem') {
    const k = `${q.s}:${key(q.c, q.r)}`;
    if (!gemStages.has(k)) gemStages.set(k, {q, list: []});
    if (!gemStages.get(k).list.includes(i)) gemStages.get(k).list.push(i);
  } });
  const bySignature = new Map();
  for (const {q, list} of gemStages.values()) {
    const sig = q.s + ' ' + list.join(' ');
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(q);
  }
  const gemLetter = new Map();
  for (const qs of bySignature.values()) {
    const ch = g.letter('gem');
    for (const q of qs) { gemLetter.set(`${q.s}:${key(q.c, q.r)}`, ch); g[q.s][q.r][q.c] = ch; }
  }
  for (const [fk, ch] of chainLetter) { const {s, cells} = chainCells.get(fk); for (const [c, r] of cells) g[s][r][c] = ch; }
  for (const st of kept) {
    const letters = new Set();
    for (const q of st) letters.add(q.kind === 'chain' ? chainLetter.get(q.id) : gemLetter.get(`${q.s}:${key(q.c, q.r)}`));
    g.stages.push([...letters].join(''));
  }

  // ---- start: the original start cell, heading down the longest clear run.
  const [sx, , sz] = L.start;
  const [c0, r0] = at(sx, sz);
  if (!walkable(g.top[r0][c0])) g.top[r0][c0] = '.';
  const dirs = hex ? ['N', 'NE', 'SE', 'S', 'SW', 'NW'] : ['N', 'E', 'S', 'W'];
  let heading = dirs[0], bestRun = -1;
  for (const d of dirs) {
    let p = [c0, r0], run = 0;
    while (run < 16) { p = g.move(...p, d); if (!walkable(g.top[p[1]][p[0]])) break; run++; }
    if (run > bestRun) { bestRun = run; heading = d; }
  }

  // ---- colours: the original per-cell paint, expanded from 12-bit.
  const paint = layer => {
    const hexOf = i => '#' + [...L.palette[i]].map(d => d + d).join('');
    const pic = Array.from({length: H}, () => Array(W));
    for (let z = 0; z < L.h; z++) for (let x = 0; x < L.w; x++) {
      const [c, r] = at(x, z);
      pic[r][c] = hexOf(L.colors[layer][z].charCodeAt(x) - 48);
    }
    return g.layers((c, r) => pic[r][c]);
  };
  const colors = {top: paint(topLayer), bottom: paint(1 - topLayer)};

  const bonus = L.file.startsWith('bonus');
  const n = bonus ? L.file.slice(-1) : String(number);
  return {
    key: bonus ? `classic-bonus-${n}` : `classic-${n.padStart(2, '0')}`,
    name: bonus ? `Classic Bonus ${n}` : `Classic ${n}`,
    kind: bonus ? 'Bonus Level' : L.name,
    start: [c0, r0, heading], colors, grid: g, skipped, source: L.file
  };
}

let number = 0;
const worlds = DATA.map(L => convert(L, L.file.startsWith('bonus') ? 0 : ++number));
module.exports = worlds;
if (require.main === module) {
  const pick = process.argv[2];
  for (const w of worlds) {
    if (pick && w.key !== pick && w.source !== pick) continue;
    console.log(`${w.key} (${w.source}) ${w.kind}: ${w.grid.w}x${w.grid.h}${w.grid.hex ? ' hex' : ''}, ${w.grid.stages.length} stages, start ${w.start.join(' ')}`);
    for (const s of w.skipped) console.log('  skipped: ' + s);
    if (pick) console.log(w.grid.print());
  }
}

/* Autopilot for testing levels in the real engine. Load it on the game page from the console:
     document.head.append(Object.assign(document.createElement('script'), {src: 'tools/autopilot.js'}))
   then autopilot.check(2) plays map 2 (Level 2) round its whole loop and every stage on its own,
   starting from the stage selector's spawn, and autopilot.route(2) reports stages whose items the
   player cannot see in time. Maps: 0 Initial, 1 Hexagone, 2.. the worlds of levels.js.
   Before each step it writes the snake's turn queue, following a breadth-first plan over the movement
   rules that avoids walls, spikes and its own body. A stage it cannot finish is a stage to redesign. */
window.autopilot = (() => {
  const CONTROL = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  const HEX = [[0, 1], [1, 2], [1, -2], [0, -1], [-1, -2], [-1, 2]];
  const mod = (a, m) => ((a % m) + m) % m;

  function planner(g) {
    const map = g.map, n = map.hex ? 6 : 4;
    const dir = (ci, di) => (map.hex ? [di * HEX[ci][0], di / HEX[ci][1]] : [di * CONTROL[ci][0], di * CONTROL[ci][1]]);
    // One step of Player.move: the side follows dirIndex, a hole flips the snake and forbids a turn next step.
    const next = (s, turn, avoid) => {
      if (s.inVoid && turn) return null;
      const side = s.di === -1 ? 0 : 1;
      const ci = mod(s.ci + turn, n);
      const d = dir(ci, s.di);
      const x = s.x + d[0], z = s.z + d[1];
      const idx = map.index(x, z);
      if (map.env[0][idx] === -1) return {x, z, ci, di: -s.di, inVoid: true, idx, side};
      const v = map.env[side][idx];
      if (v === 1 || v === 2) return null;
      if (avoid && avoid.has(idx * 2 + side)) return null;
      return {x, z, ci, di: s.di, inVoid: false, idx, side};
    };
    // The cells of a chain in path order, starting from one end.
    const chainOrder = group => {
      const cells = group.items.map(it => it.idx), set = new Set(cells);
      const nb = idx => {
        const it = group.items.find(i => i.idx === idx);
        const w = map.worldOf(it.dx, it.dy, 0, 0, {x: 0, z: 0});
        const out = new Set();
        for (let ci = 0; ci < n; ci++) { const d = dir(ci, 1); const j = map.index(w.x + d[0], w.z + d[1]); if (set.has(j) && j !== idx) out.add(j); }
        return [...out];
      };
      const ends = cells.filter(c => nb(c).length <= 1);
      const order = [ends.length ? ends[0] : cells[0]], seen = new Set(order);
      while (order.length < cells.length) {
        const nx = nb(order[order.length - 1]).find(c => !seen.has(c));
        if (nx === undefined) return null;
        order.push(nx); seen.add(nx);
      }
      return order;
    };
    // Shortest list of turns that finishes one group of the current stage.
    // With stay, the plan does not go through a hole while every goal is on the snake's own face.
    const plan = (s, avoid, length, stay = false, maxNodes = 600000) => {
      const goals = [];
      for (const grp of g.levels.groups.values()) {
        if (!grp.items.length) continue;
        if (grp.items[0].type === 'energy') goals.push({kind: 'gem', idx: grp.items[0].idx, side: grp.side});
        else {
          const order = chainOrder(grp);
          if (!order) return {error: `chain ${grp.id} is not a path`};
          if (order.length !== grp.combo) return {error: `chain ${grp.id} has ${order.length} of ${grp.combo} cells`};
          goals.push({kind: 'chain', side: grp.side, orders: [order, order.slice().reverse()]});
        }
      }
      if (!goals.length) return {turns: []};
      stay = stay && goals.every(q => q.side === s.side);
      const key = (st, ph) => `${((st.idx * n + st.ci) * 2 + (st.di > 0 ? 1 : 0)) * 2 + (st.inVoid ? 1 : 0)}|${ph}`;
      const queue = [{...s, ph: '', d: 0, parent: null}];
      const seen = new Set([key(s, '')]);
      for (let qi = 0; qi < queue.length; qi++) {
        if (queue.length > maxNodes) return {error: 'search too large'};
        const cur = queue[qi];
        for (const turn of [0, 1, -1]) {
          const nx = next(cur, turn, cur.d < length ? avoid : null);
          if (!nx || (stay && nx.inVoid)) continue;
          // The planned path must not cross itself while the body is still there.
          let hit = false;
          if (!nx.inVoid) for (let a = cur, k = 0; a && k < length; a = a.parent, k++) if (a.idx === nx.idx && a.side === nx.side && !a.inVoid) { hit = true; break; }
          if (hit) continue;
          let ph = '', done = false;
          if (cur.ph) {
            const [gi, e, j] = cur.ph.split(':').map(Number);
            const goal = goals[gi];
            if (nx.inVoid || nx.side !== goal.side || nx.idx !== goal.orders[e][j]) continue;   // chain broken
            if (j + 1 === goal.orders[e].length) done = true; else ph = `${gi}:${e}:${j + 1}`;
          } else if (!nx.inVoid) {
            goals.forEach((goal, gi) => {
              if (goal.side !== nx.side) return;
              if (goal.kind === 'gem' && goal.idx === nx.idx) done = true;
              if (goal.kind === 'chain') for (let e = 0; e < 2; e++) if (!ph && goal.orders[e][0] === nx.idx) {
                if (goal.orders[e].length === 1) done = true; else ph = `${gi}:${e}:1`;
              }
            });
          }
          const node = {...nx, ph, d: cur.d + 1, parent: cur, turn};
          if (done) {
            const turns = [];
            for (let a = node; a.parent; a = a.parent) turns.unshift(a.turn);
            return {turns};
          }
          const k = key(nx, ph);
          if (seen.has(k)) continue;
          seen.add(k);
          queue.push(node);
        }
      }
      return {error: 'no path'};
    };
    return {plan};
  }

  // Installs the autopilot on the current snake: before each step it writes the next planned turn.
  function drive(g, onStep) {
    const p = g.player, step = p.step.bind(p), errors = new Set();
    let turns = [], planned = '';
    p.step = () => {
      let turn = 0;
      if (p.onGame && !p.isDead && !p.tailTouched) {
        const now = `${g.levels.index}/${g.levels.groups.size}`;
        if (now !== planned || !turns.length) {
          const avoid = new Set();
          for (let i = 1; i < p.trail.length - 1; i++) { const t = p.trail[i]; avoid.add(g.map.index(t.x, t.z) * 2 + (t.y > 0 ? 0 : 1)); }
          const here = {x: p.pos.x, z: p.pos.z, ci: p.ci, di: p.dirIndex, inVoid: p.beenRev, idx: g.map.index(p.pos.x, p.pos.z), side: p.side};
          const r = planner(g).plan(here, avoid, p.trail.length);
          if (r.error) errors.add(`stage ${g.levels.index + 1}: ${r.error}`);
          turns = r.turns || [];
          planned = now;
        }
        turn = turns.shift() || 0;
        p.rots[0] = turn;
        p.rots[1] = 0;
      }
      if (onStep) onStep(turn);
      step();
    };
    return errors;
  }

  // Plays `mapIndex` from `stage` for up to `seconds` of game time. With single, stops after one stage.
  function run(mapIndex, stage = 0, seconds = 900, {single = false, stageLimit = 90} = {}) {
    const g = window.nsnakes;
    g.frozen = false;
    g.startMap(mapIndex, stage);
    g.beginSelectedStage();
    const p = g.player, errors = drive(g), log = [];
    let t = 0, stageTime = 0, last = g.levels.index, finished = false;
    while (t < seconds) {
      g.update(1 / 60); t += 1 / 60; stageTime += 1 / 60;
      if (p.isDead || p.tailTouched) { log.push({stage: g.levels.index + 1, result: p.tailTouched ? 'bit its tail' : 'died'}); break; }
      if (g.levels.index !== last) {
        log.push({stage: last + 1, time: +stageTime.toFixed(1), length: p.sizeBegin});
        const wrapped = g.levels.index < last;
        last = g.levels.index;
        stageTime = 0;
        if (wrapped || single) { finished = true; break; }
      }
      if (stageTime > stageLimit) { log.push({stage: g.levels.index + 1, result: 'stuck'}); break; }
    }
    let spikes = 0;
    for (let s = 0; s < 2; s++) for (let i = 0; i < g.map.env[s].length; i++) if (g.map.env[s][i] !== g.map.pristine[s][i]) spikes++;
    return {finished, time: +t.toFixed(1), stages: log.filter(e => e.time !== undefined).length, spikes, log, errors: [...errors]};
  }

  // Can a player find the way? Plays the loop, wrap to stage 1 included, like a person who does not
  // know the map: until one of the stage's items has been on screen the snake keeps going straight,
  // follows the way when it ends, and has to guess at a fork. The first 3 steps of a stage are always
  // straight (reaction time), so a chain that runs into a hole leads the player over the edge. Once an
  // item has been seen, the planner drives. Items on the other face are hidden under the floor.
  // Run once with the page's landscape camera and once with a portrait phone camera; a stage is flagged
  // when its first item shows up after more than 8 steps (2 s) or only after a guess at a fork.
  function route(mapIndex) {
    const flagged = [], views = {};
    for (const view of ['landscape', 'portrait']) {
      const r = walk(mapIndex, view === 'portrait');
      views[view] = r;
      for (const s of r.stages) if (s.lost || s.guesses || (s.seen < 0 ? s.steps : s.seen) > 8)
        flagged.push(`${view}, stage ${s.stage}: ${s.lost ? 'not found' : s.seen < 0 ? `taken unseen after ${s.steps} steps` : `seen after ${s.seen} steps`}${s.guesses ? `, ${s.guesses} guess(es) at a fork` : ''}`);
    }
    return {complete: views.landscape.complete && views.portrait.complete, flagged, views};
  }

  function walk(mapIndex, portrait) {
    const g = window.nsnakes, T3 = window.THREE;
    const draw = g.post.render;
    g.post.render = () => {};   // cameras and items still update, nothing is drawn
    const phone = new T3.PerspectiveCamera(90, 0.46, 0.3, 1000);
    const v = new T3.Vector3();
    try {
      g.frozen = false;
      g.startMap(mapIndex, 0);
      const p = g.player, map = g.map, n = map.hex ? 6 : 4, pl = planner(g);
      const onScreen = () => {
        g.camera.updateMatrixWorld();
        let cam = g.camera;
        if (portrait) { phone.position.copy(g.camera.position); phone.quaternion.copy(g.camera.quaternion); phone.updateMatrixWorld(); cam = phone; }
        for (const it of g.levels.items.values()) {
          if (!it.inView || it.side !== p.side) continue;
          v.set(it.wx, it.side === 0 ? 0.5 : -0.5, -it.wz).project(cam);
          if (v.z < 1 && Math.abs(v.x) < 0.97 && Math.abs(v.y) < 0.97) return true;
        }
        return false;
      };
      // A way is open when its next 3 cells are floor on this face.
      const open = turn => {
        const ci = (p.ci + turn + 12) % n;
        const d = map.hex ? [p.dirIndex * HEX[ci][0], p.dirIndex / HEX[ci][1]] : [p.dirIndex * CONTROL[ci][0], p.dirIndex * CONTROL[ci][1]];
        for (let k = 1; k <= 3; k++) {
          const idx = map.index(p.pos.x + d[0] * k, p.pos.z + d[1] * k);
          if (map.env[0][idx] === -1 || map.env[p.side][idx] === 1 || map.env[p.side][idx] === 2) return false;
        }
        return true;
      };
      const plannedTurn = () => {
        const avoid = new Set();
        for (let i = 1; i < p.trail.length - 1; i++) { const t = p.trail[i]; avoid.add(map.index(t.x, t.z) * 2 + (t.y > 0 ? 0 : 1)); }
        const here = {x: p.pos.x, z: p.pos.z, ci: p.ci, di: p.dirIndex, inVoid: p.beenRev, idx: map.index(p.pos.x, p.pos.z), side: p.side};
        const r = pl.plan(here, avoid, p.trail.length, true);
        return (r.turns || pl.plan(here, avoid, p.trail.length).turns) || [];
      };
      const stages = [];
      let cur = null, seen = false, turns = [], planned = '';
      // Cells as the world scripts write them: column, picture line, face.
      const lines = map.hex ? map.h - 1 : map.h;
      const cell = () => { const i = map.index(p.pos.x, p.pos.z); return `${Math.floor(i / map.h)},${lines - 1 - (i % map.h)}${p.side ? 'B' : 'T'}`; };
      const begin = label => { cur = {stage: label, steps: 0, seen: -1, guesses: 0, lost: false, path: []}; stages.push(cur); };
      const step = p.step.bind(p);
      p.step = () => {
        let turn = 0;
        if (cur && p.onGame && !p.isDead && !p.tailTouched) {
          if (cur.seen < 0 && seen) cur.seen = cur.steps;
          const blind = cur.seen < 0 && !cur.lost;
          if (blind && cur.steps > 30) cur.lost = true;
          if (blind && !cur.lost) {
            if (cur.steps >= 3 && !p.beenRev && !open(0)) {
              const left = open(-1), right = open(1);
              if (left && right) { cur.guesses++; turn = plannedTurn()[0] || 0; }
              else if (left || right) turn = left ? -1 : 1;
            }
            turns = [];
          } else {
            const now = `${g.levels.index}/${g.levels.groups.size}`;
            if (now !== planned || !turns.length) { turns = plannedTurn(); planned = now; }
            turn = turns.shift() || 0;
          }
          p.rots[0] = turn;
          p.rots[1] = 0;
          cur.steps++;
        }
        step();
        if (cur && cur.path.length < 40) cur.path.push(cell() + (turn > 0 ? '+' : turn < 0 ? '-' : ''));
      };
      let last = g.levels.index, wrapped = false;
      for (let t = 0; t < 900 && !p.isDead && !p.tailTouched; t += 1 / 60) {
        g.update(1 / 60);
        g.render();
        seen = onScreen();
        if (p.onGame && !cur) begin('1');
        if (g.levels.index !== last) {
          if (wrapped) break;
          wrapped = g.levels.index < last;
          last = g.levels.index;
          begin(wrapped ? 'loop to 1' : String(last + 1));
          seen = false;
        }
        if (wrapped && cur.seen >= 0) break;
      }
      return {complete: wrapped, died: p.isDead || p.tailTouched ? `stage ${cur.stage} at ${cell()}` : false, stages};
    } finally {
      g.post.render = draw;
      g.toMenu();
    }
  }

  // The whole loop from stage 1, then every stage from the selector's spawn.
  function check(mapIndex) {
    const loop = run(mapIndex, 0);
    const total = window.nsnakes.map.levels.length;
    const failed = [];
    let slowest = 0;
    for (let k = 0; k < total; k++) {
      const r = run(mapIndex, k, 120, {single: true, stageLimit: 60});
      if (!r.finished || r.errors.length) failed.push({stage: k + 1, log: r.log, errors: r.errors});
      else slowest = Math.max(slowest, r.log[0].time);
    }
    const slow = loop.log.filter(e => e.time > 12).map(e => `stage ${e.stage}: ${e.time} s`);
    window.nsnakes.toMenu();
    return {
      loop: {finished: loop.finished, stages: `${loop.stages}/${total}`, time: loop.time, spikes: loop.spikes, errors: loop.errors, end: loop.log[loop.log.length - 1], slow},
      single: {failed, slowest}
    };
  }

  // Positions the snake a moment into a stage and freezes the game, for a screenshot.
  function view(mapIndex, stage, seconds = 1.5) {
    const g = window.nsnakes;
    g.frozen = false;
    g.startMap(mapIndex, stage);
    g.beginSelectedStage();
    for (let i = 0; i < seconds * 60; i++) g.update(1 / 60);
    const fade = document.getElementById('fade');
    fade.style.transitionDuration = '0s';
    fade.style.opacity = 0;
    g.frozen = true;
  }

  return {run, check, route, view, planner};
})();

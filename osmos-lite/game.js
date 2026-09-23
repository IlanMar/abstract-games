'use strict';

// ============================================================================
// CONFIG — всё, что крутится при тюнинге ощущения. Расстояния в пикселях мира
// (при зуме 1 это пиксели экрана), время в секундах.
// Можно менять прямо из консоли браузера: CONFIG.drag = 0.6 — применится сразу.
// ============================================================================
const CONFIG = {
  // --- управление: реактивный выброс капли ------------------------------------
  // Тап в пустое место — клетка выстреливает туда крошечную каплю своей массы и по
  // закону сохранения импульса уплывает в обратную сторону: Δv = f·u / (1 − f).
  ejectMassFraction: 0.015, // доля массы клетки в одной капле
  ejectSpeed: 1500,         // px/с: скорость капли относительно клетки → отдача ≈ 23 px/с за тап
  ejectMinRadius: 6,        // клетка меньше этого уже не стреляет — нечем
  holdDelay: 0.3,           // с: палец держится дольше — капли идут очередью
  holdRate: 7,              // капель в секунду в очереди
  moteSteerTime: 0.35,      // с: капля в жидкости теряет ~63% скорости за это время
  moteGrace: 0.35,          // с: столько свежую каплю не может снова проглотить её же клетка
  maxMotes: 300,            // потолок числа капель: самые старые сверх него исчезают

  // --- среда ----------------------------------------------------------------
  drag: 0.35,             // 1/с: вязкость жидкости; скорость падает в e раз за 1/drag с
  dragMassFeel: 0.15,     // крупная клетка тормозится медленнее: drag · m^-dragMassFeel
  maxSpeed: 560,          // px/с: мягкий потолок скорости
  overspeedDrag: 4,       // 1/с: как быстро срезается всё, что выше потолка

  // --- указатель (мышь или палец) --------------------------------------------
  deadZone: 10,           // px экрана за краем клетки: тап по самой клетке не стреляет

  // --- масса и размеры --------------------------------------------------------
  density: 1,             // масса = density · r², значит при слиянии r = √(r1² + r2²)
  playerRadius: 22,

  // --- мир и население --------------------------------------------------------
  worldRadius: 1350,      // мир — круглая чаша, край мягкий. С 60 клетками на экране
                          // iPhone на старте ~9 клеток; при 1500 и 49 было ~4
  enemyCount: 60,         // организмов на карте радиуса densityRadius; на другой карте их
  densityRadius: 1350,    // число растёт с площадью — плотность, а не пустота
  enemyDensity: 1,        // множитель плотности (ползунок в меню)
  maxEnemies: 700,        // потолок — чтобы огромная и плотная карта держала 60+ FPS
  maxEnemySize: 5,        // самый крупный организм — во столько раз больше стартовой клетки
  difficulty: 0.5,        // 0…1: доля крупных хищников против мелкой добычи. 0.5 — доли как в
                          // population (~31% крупнее игрока); 0 — ~3%, 1 — ~80%
  // Доли и размеры в долях стартового радиуса игрока. На Normal 70% можно съесть, 30%
  // больше тебя. Добыча не мельче 0.4: крошка в 0.3 давала 9% массы, а дорога до неё
  // тапами стоила дороже. Опасные — лестницей: съев добычу (~15 стартовых масс, радиус
  // ×4), обгоняешь охотников и середину, гиганты — цель на потом.
  population: [
    { count: 42, min: 0.40, max: 0.85 },  // добыча
    { count: 9,  min: 1.10, max: 1.60 },  // охотники — чуть крупнее, их больше всего
    { count: 6,  min: 1.60, max: 2.50 },  // середина
    { count: 3,  min: 3.00, max: 5.00 },  // гиганты
  ],
  nearFood: 6,            // столько кусков добычи кладётся в кольцо nearFoodRing у старта
  nearFoodRing: [140, 460],
  threatSafe: 420,        // px: ближе к старту никого крупнее игрока
  refillShare: 0.7,       // съели больше 30% — вдалеке, вне экрана, появится новая мелочь
  driftSpeed: [12, 42],   // px/с: собственный дрейф организмов
  wanderTurn: 0.5,        // рад/√с: насколько блуждает направление дрейфа
  steerTime: 2.5,         // с: за сколько организм возвращается к своему дрейфу после толчка

  // --- поглощение ---------------------------------------------------------------
  absorbRatio: 1.0,       // как в Osmos: кто больше хоть немного — тот и ест.
                          // >1 — почти равные не едят друг друга, а мягко отталкиваются
  tintRange: 1.35,        // цвет: к этому соотношению радиусов чужая клетка полностью
                          // зелёная (меньше) или красная (больше)
  captureReach: 0.6,      // 1 — захват при касании, 0 — когда жертва целиком за мембраной
  mergePull: 120,         // 1/с²: коснувшиеся клетки притягиваются, пока меньшая не уйдёт внутрь
  absorptionTime: 0.55,   // с: базовое время растворения (крупная жертва дольше)

  // --- столкновения ---------------------------------------------------------------
  bounceStiffness: 900,   // 1/с²: жёсткость мягкого отталкивания ровни
  bounceDamping: 18,      // 1/с: гашение отскока
  wallStiffness: 40,      // 1/с²: край мира — мягкая упругая стенка
  wallDamping: 6,

  // --- камера -------------------------------------------------------------------
  cameraAutoZoom: true,   // камера отъезжает при росте и на скорости; false — масштаб постоянный
  cameraStiffness: 3.4,   // рад/с: пружина камеры; меньше — ленивее и заметнее вес
  cameraLookAhead: 0.66,  // с: камера смотрит на столько секунд пути вперёд (≈2/stiffness
                          // держит клетку в центре на ровном ходу, больше — вид чуть впереди)
  cameraMaxLead: 0.22,    // доля короткой стороны экрана: предел упреждения
  viewSize: 950,          // px: базовый зум = √(W·H) / viewSize
  zoomGrowth: 0.55,       // как сильно отъезжает камера при росте (0 — никак, 1 — клетка
                          // на экране всегда одного размера)
  zoomSmoothness: 0.8,    // с: инерция зума
  speedZoomOut: 0.08,     // на полной скорости камера отъезжает на столько

  // --- визуал ---------------------------------------------------------------------
  wobble: 0.02,           // амплитуда дрожания мембраны, доля радиуса
  breathe: 0.012,         // и её «дыхание»
  stretch: 0.09,          // вытягивание вдоль скорости на maxSpeed
  nucleusLag: 0.22,       // ядро отстаёт при ускорении: доля радиуса при ускорении nucleusAccelRef
  nucleusAccelRef: 400,   // px/с²
  puffCount: 7,           // пузырьков брызгами при выстреле

  // --- шаг симуляции ----------------------------------------------------------------
  maxStep: 1 / 120,       // физика бьёт кадр на подшаги не длиннее этого
  maxFrameDt: 0.1,        // после свёрнутой вкладки кадр не длиннее этого
  maxDPR: 3,              // родное разрешение iPhone (DPR 3)
  maxFps: 60,             // потолок кадров на любом экране (0 — частота экрана): ровные
                          // 60 глаже, чем 60…120 вперемешку, и дешевле для батареи
  targetFps: 60,          // ниже этого среднего FPS качество само ступенчато снижается
  perfWindow: 2,          // с: окно, по которому меряется средний кадр
};

// ============================================================================

const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d', { alpha: false });
const hintEl = $('hint'), overEl = $('over'), debugEl = $('debug');

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const expK = (dt, tau) => 1 - Math.exp(-dt / tau);   // доля пути к цели за dt, не зависит от FPS
const massOf = r => CONFIG.density * r * r;
const baseMass = () => massOf(CONFIG.playerRadius);

const touchUI = matchMedia('(pointer: coarse)').matches;
if (touchUI) {
  hintEl.textContent = 'Tap anywhere — the cell spits a droplet there and drifts the other way';
  overEl.firstElementChild.textContent = 'Absorbed — tap to restart';
}

// Цвета: игрок, добыча, ровня, угроза
const RGB_PLAYER = [110, 190, 255];
const RGB_FOOD   = [ 95, 225, 165];
const RGB_EQUAL  = [175, 185, 205];
const RGB_THREAT = [255, 118,  92];

let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, vx: 0, vy: 0, zoom: 1, fx: 0, fy: 0, fr: CONFIG.playerRadius };
const input = { down: false, x: 0, y: 0, held: 0, streamT: 0 };
let cells = [], order = [], player = null, cellId = 0;
let time = 0, dead = false, deadT = 0, spawnT = 0, shots = 0;
let firstRun = true, debug = false, fps = 60, last = performance.now();

// ============================================================================
// Организмы
// ============================================================================

function makeCell(x, y, r, isPlayer) {
  return {
    x, y, vx: 0, vy: 0, r, m: massOf(r), isPlayer,
    id: ++cellId, lo: 0,                // порядковый номер и левый край для sweep
    eatenBy: null, offX: 0, offY: 0, m0: 0, absorbT: 1,
    dead: false, born: isPlayer ? 1 : 0, flash: 0, tint: 0,
    wander: Math.random() * TAU, cruise: 0, ph: Math.random() * 100,
    steer: CONFIG.steerTime, parent: null, grace: 0, mote: false,   // для выброшенных капель
    // только для отрисовки
    svx: 0, svy: 0, st: 0, ang: 0,     // сглаженная скорость, растяжение, его угол
    pvx: 0, pvy: 0, ax: 0, ay: 0,      // скорость до кадра и сглаженное ускорение
    nx: 0, ny: 0, nvx: 0, nvy: 0,      // смещение ядра — маленькая пружина внутри клетки
    sx: 0, sy: 0, sr: 0, vis: false,
  };
}

function setMass(c, m) {
  c.m = m > 0 ? m : 0;
  c.r = Math.sqrt(c.m / CONFIG.density);
}

function giveDrift(c) {
  // мелочь шустрее, гиганты еле ползут
  const [a, b] = CONFIG.driftSpeed;
  c.cruise = lerp(a, b, Math.random()) * clamp(Math.sqrt(CONFIG.playerRadius / c.r), 0.45, 1.3);
  c.vx = Math.cos(c.wander) * c.cruise;
  c.vy = Math.sin(c.wander) * c.cruise;
}

// Ищет свободное место; farFromView — только вне экрана (для подсадки новых),
// maxDist — не дальше этого от центра мира (там стартует игрок)
function place(r, safe, farFromView, maxDist) {
  const R = Math.min(CONFIG.worldRadius - r - 40, maxDist || Infinity);
  for (let tries = 0; tries < 80; tries++) {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (Math.hypot(x - player.x, y - player.y) < safe + r + player.r) continue;
    if (farFromView) {
      const view = Math.hypot(W, H) / 2 / cam.zoom;
      if (Math.hypot(x - cam.x, y - cam.y) < view + r * 2) continue;
    }
    let free = true;
    for (const o of cells) {
      if (Math.hypot(x - o.x, y - o.y) < o.r + r + 24) { free = false; break; }
    }
    if (free) return { x, y };
  }
  return null;
}

function spawn(r, safe, farFromView, maxDist) {
  const p = place(r, safe, farFromView, maxDist);
  if (!p) return null;
  const c = makeCell(p.x, p.y, r, false);
  giveDrift(c);
  cells.push(c);
  return c;
}

// Сколько организмов в мире: плотность постоянна, число растёт с площадью карты
function enemyTotal() {
  const area = (CONFIG.worldRadius / CONFIG.densityRadius) ** 2;
  return Math.max(1, Math.min(CONFIG.maxEnemies, Math.round(CONFIG.enemyCount * CONFIG.enemyDensity * area)));
}

// Сложность смещает доли: крупные группы тяжелеют в dangerFactor раз, мелкие — легчают
function dangerFactor() { return Math.pow(4, (CONFIG.difficulty - 0.5) * 2); }
function groupWeight(g) {
  const f = dangerFactor();
  return g.min > 1 ? g.count * f : g.max < 1 ? g.count / f : g.count;
}

function reset() {
  cells = [];
  player = makeCell(0, 0, CONFIG.playerRadius, true);
  cells.push(player);
  const r0 = CONFIG.playerRadius, maxE = CONFIG.maxEnemySize;
  const weights = CONFIG.population.map(groupWeight), total = enemyTotal();
  const weight = weights.reduce((sum, w) => sum + w, 0);
  const near = Math.min(1, CONFIG.worldRadius / 1500);        // на маленькой карте всё ближе
  for (const [gi, g] of CONFIG.population.entries()) {
    const n = Math.round(weights[gi] * total / weight);
    const lo = Math.min(g.min, maxE), hi = Math.min(g.max, maxE);
    for (let i = 0; i < n; i++) {
      const r = r0 * lerp(lo, hi, Math.random());
      // крупных не сажаем рядом, а первые куски добычи — наоборот, в кольце у старта
      if (r > r0) spawn(r, CONFIG.threatSafe * near, false);
      else if (i < CONFIG.nearFood) spawn(r, CONFIG.nearFoodRing[0], false, CONFIG.nearFoodRing[1]);
      else spawn(r, 220 * near, false);
    }
  }
  for (const c of cells) c.born = 1;    // стартовое население видно сразу
  resetParticles();
  dead = false; deadT = 0; spawnT = 0;
  input.down = false; ripples.length = 0;
  overEl.classList.remove('show');
  if (firstRun) {
    // При самом первом запуске камера сразу на игроке, при рестарте — плавно доедет
    cam.x = cam.fx = player.x; cam.y = cam.fy = player.y;
    cam.zoom = targetZoom();
    firstRun = false;
  }
}

// ============================================================================
// Ввод: мышь и палец через pointer events
// ============================================================================

let activePointer = null;

cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  if (menuOpen) { closeMenu(); return; }
  if (dead) {
    if (deadT > 0.5) reset();           // тап-рестарт, но не тот же тап, что пришёлся на смерть
    return;
  }
  activePointer = e.pointerId;
  input.down = true; input.x = e.clientX; input.y = e.clientY;
  input.held = 0; input.streamT = 0;
  eject(input.x, input.y);              // каждый тап — сразу капля, без задержек
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (activePointer !== null && e.pointerId !== activePointer) return;
  input.x = e.clientX; input.y = e.clientY;
});
function release(e) {
  if (e && activePointer !== null && e.pointerId !== activePointer) return;
  activePointer = null;
  input.down = false;
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('lostpointercapture', release);
window.addEventListener('blur', () => release());
cv.addEventListener('contextmenu', e => e.preventDefault());
// iOS Safari: никаких щипков-зумов и прокрутки страницы
document.addEventListener('gesturestart', e => e.preventDefault());
// (кроме меню: иначе на iPhone не тянутся ползунки)
document.addEventListener('touchmove', e => {
  if (!(e.target instanceof Element && e.target.closest('#menu'))) e.preventDefault();
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && menuOpen) closeMenu();
  if (e.code === 'KeyD' && !menuOpen) setDebug(!debug);
  if (dead && deadT > 0.5 && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR')) reset();
});

document.addEventListener('visibilitychange', () => {
  last = performance.now();
  perf.hold = 1;                        // первые кадры после возврата бывают рваными — не мерить
  release();
});

// Выстрел каплей в сторону точки экрана (sx, sy). Клетка отдаёт каплю своей массы,
// импульс сохраняется: (M − dm)·v' + dm·(v + u·n) = M·v  →  v' = v − n·u·dm / (M − dm)
function eject(sx, sy) {
  const p = player;
  if (dead || p.eatenBy || p.r < CONFIG.ejectMinRadius) return false;
  const px = (p.x - cam.x) * cam.zoom + W / 2, py = (p.y - cam.y) * cam.zoom + H / 2;
  const dx = sx - px, dy = sy - py, d = Math.hypot(dx, dy);
  if (d <= p.r * cam.zoom + CONFIG.deadZone) return false;    // тап по самой клетке — мимо
  const nx = dx / d, ny = dy / d;

  const M = p.m, dm = M * CONFIG.ejectMassFraction, u = CONFIG.ejectSpeed;
  setMass(p, M - dm);
  const m = makeCell(0, 0, Math.sqrt(dm / CONFIG.density), false);
  const gap = p.r + m.r + 1;                                   // рождается сразу за мембраной
  m.x = p.x + nx * gap; m.y = p.y + ny * gap;
  m.vx = p.vx + nx * u; m.vy = p.vy + ny * u;
  p.vx -= nx * u * dm / (M - dm);
  p.vy -= ny * u * dm / (M - dm);

  m.mote = true; m.parent = p; m.grace = CONFIG.moteGrace; m.steer = CONFIG.moteSteerTime;
  m.born = 1; m.tint = -1; m.wander = Math.atan2(ny, nx);
  m.cruise = CONFIG.driftSpeed[0] * 0.5;                        // растратив разгон, еле дрейфует
  cells.push(m);

  puff(m.x, m.y, nx, ny, p.vx, p.vy);
  ripple(sx, sy);
  p.flash = Math.min(1, p.flash + 0.25);
  shots++;
  trimMotes();
  return true;
}

// Слишком много капель — убираем самые старые, которые никого не едят и не едомы.
// Считаются только капли: организмов на большой карте может быть и 700.
function trimMotes() {
  let extra = -CONFIG.maxMotes;
  for (const c of cells) if (c.mote) extra++;
  if (extra <= 0) return;
  const busy = new Set();
  for (const c of cells) if (c.eatenBy) busy.add(c.eatenBy);
  const old = cells.filter(c => c.mote && !c.eatenBy && !busy.has(c)).sort((a, b) => a.id - b.id);
  const drop = new Set(old.slice(0, extra));
  cells = cells.filter(c => !drop.has(c));
}

// Зажатый палец — очередь капель после короткой паузы
function updateInput(dt) {
  if (!input.down || dead) return;
  input.held += dt;
  if (input.held < CONFIG.holdDelay) return;
  input.streamT -= dt;
  while (input.streamT <= 0) {
    eject(input.x, input.y);
    input.streamT += 1 / CONFIG.holdRate;
  }
}

// ============================================================================
// Физика: один подшаг длиной h
// ============================================================================

function stepPlayer(h) {
  const p = player;
  if (p.eatenBy) return;
  // Двигатель — только выстрелы (eject), здесь клетка просто плывёт по инерции
  const relM = p.m / baseMass();

  // Вязкость: экспонента, а не v -= v·drag·h — так не зависит от шага
  const drag = CONFIG.drag * Math.pow(relM, -CONFIG.dragMassFeel);
  const d = Math.exp(-drag * h);
  p.vx *= d; p.vy *= d;

  // Мягкий потолок: превышение гаснет, а не обрезается
  const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (s > CONFIG.maxSpeed) {
    const ns = CONFIG.maxSpeed + (s - CONFIG.maxSpeed) * Math.exp(-CONFIG.overspeedDrag * h);
    p.vx *= ns / s; p.vy *= ns / s;
  }
}

function stepDrifters(h) {
  const jitter = CONFIG.wanderTurn * Math.sqrt(h) * 1.732;   // случайное блуждание с дисперсией σ²·t
  for (const c of cells) {
    if (c.isPlayer || c.eatenBy) continue;
    if (c.grace > 0) c.grace -= h;
    const k = expK(h, c.steer);          // у капли своя, быстрая вязкость
    c.wander += (Math.random() * 2 - 1) * jitter;
    c.vx += (Math.cos(c.wander) * c.cruise - c.vx) * k;
    c.vy += (Math.sin(c.wander) * c.cruise - c.vy) * k;
  }
}

function capture(big, small) {
  small.eatenBy = big;
  small.offX = small.x - big.x;
  small.offY = small.y - big.y;
  small.m0 = small.m;
  // мелочь растворяется быстро, жертва почти своего размера — дольше
  small.absorbT = CONFIG.absorptionTime * clamp(0.35 + 1.3 * Math.sqrt(small.m / big.m), 0.35, 1.6);
}

// Sort-and-sweep: клетки лежат в массиве по левому краю, пары проверяются, только пока
// их проекции на x перекрываются. Вместо n²/2 пар — почти линейно. Сортировка
// вставками: от подшага к подшагу порядок почти не меняется, так что она за O(n).
function collide(h) {
  const n = cells.length, ratio = CONFIG.absorbRatio;
  for (let i = 0; i < n; i++) { const c = cells[i]; c.lo = c.x - c.r; }
  for (let i = 1; i < n; i++) {
    const c = cells[i];
    let j = i - 1;
    while (j >= 0 && cells[j].lo > c.lo) { cells[j + 1] = cells[j]; j--; }
    cells[j + 1] = c;
  }
  for (let i = 0; i < n; i++) {
    const a = cells[i];
    if (a.eatenBy) continue;
    const hi = a.x + a.r;
    for (let j = i + 1; j < n; j++) {
      const b = cells[j];
      if (b.lo >= hi) break;
      if (a.eatenBy) break;
      if (b.eatenBy) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 >= rs * rs) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      const big = a.r >= b.r ? a : b, small = big === a ? b : a;

      if (small.grace > 0 && small.parent === big) continue;   // свежая капля уходит от своей клетки
      if (big.r > small.r && big.r >= small.r * ratio) {
        // Заметно крупнее — не толкаемся, а ждём, пока жертва войдёт под мембрану
        if (d < big.r + small.r * CONFIG.captureReach) { capture(big, small); continue; }
        // Коснулись, но ещё не внутри — слипаются: взаимное притяжение, импульс сохраняется
        const Fp = CONFIG.mergePull * (rs - d) * big.m * small.m / (big.m + small.m);
        const sx = small === b ? nx : -nx, sy = small === b ? ny : -ny;   // от меньшей к большей: −s
        small.vx -= sx * Fp / small.m * h; small.vy -= sy * Fp / small.m * h;
        big.vx   += sx * Fp / big.m * h;   big.vy   += sy * Fp / big.m * h;
        continue;
      }
      // Ровня: мягкая пружина с гашением, равные и противоположные силы — импульс сохраняется
      const overlap = rs - d;
      const relVn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const mr = a.m * b.m / (a.m + b.m);
      const F = Math.max(0, CONFIG.bounceStiffness * overlap - CONFIG.bounceDamping * relVn) * mr;
      a.vx -= nx * F / a.m * h; a.vy -= ny * F / a.m * h;
      b.vx += nx * F / b.m * h; b.vy += ny * F / b.m * h;
    }
  }
}

function walls(h) {
  const R = CONFIG.worldRadius;
  for (const c of cells) {
    if (c.eatenBy) continue;
    const d = Math.sqrt(c.x * c.x + c.y * c.y), p = d + c.r - R;
    if (p <= 0 || d < 1e-6) continue;
    const nx = c.x / d, ny = c.y / d, vn = c.vx * nx + c.vy * ny;
    const a = CONFIG.wallStiffness * p + (vn > 0 ? CONFIG.wallDamping * vn : 0);
    c.vx -= nx * a * h; c.vy -= ny * a * h;
  }
}

function absorb(h) {
  let removed = false;
  for (const c of cells) {
    if (!c.eatenBy) continue;
    const big = c.eatenBy;
    // Жертву затягивает к центру хищника и растворяет
    const pull = Math.exp(-h * 3 / c.absorbT);
    c.offX *= pull; c.offY *= pull;
    c.x = big.x + c.offX; c.y = big.y + c.offY;

    let dm = c.m0 * h / c.absorbT;
    if (dm >= c.m - c.m0 * 0.002) { dm = c.m; c.dead = true; removed = true; }
    // Масса переходит вместе со своим импульсом: съесть быструю мошку — лёгкий толчок
    const M = big.m + dm;
    big.vx = (big.m * big.vx + dm * c.vx) / M;
    big.vy = (big.m * big.vy + dm * c.vy) / M;
    setMass(big, M);
    setMass(c, c.m - dm);
    big.flash = Math.min(1, big.flash + dm / big.m * 6);
  }
  if (!removed) return;

  // Кого доедал растворившийся — того доест тот, кто съел его самого
  for (const c of cells) {
    if (!c.eatenBy || !c.eatenBy.dead || c.dead) continue;
    const eater = c.eatenBy;
    if (eater.eatenBy && !eater.eatenBy.dead) {
      c.offX += eater.offX; c.offY += eater.offY;
      c.eatenBy = eater.eatenBy;
    } else {
      c.eatenBy = null;
      c.vx = eater.vx; c.vy = eater.vy;
    }
  }
  if (player.dead && !dead) {
    dead = true; deadT = 0;
    const eater = player.eatenBy;
    cam.fr = eater ? eater.r : player.r;
  }
  cells = cells.filter(c => !c.dead);
}

function stepCamera(h) {
  // Фокус: игрок, а после смерти — тот, кто его съел
  let fx = cam.fx, fy = cam.fy, vx = 0, vy = 0;
  const focus = !player.dead ? player : (player.eatenBy && !player.eatenBy.dead ? player.eatenBy : null);
  if (focus) {
    fx = focus.x; fy = focus.y; vx = focus.vx; vy = focus.vy;
    cam.fr = focus.r;
    if (focus === player && player.eatenBy) { vx = player.eatenBy.vx; vy = player.eatenBy.vy; }
  }
  cam.fx = fx; cam.fy = fy;

  // Упреждение по скорости, но не дальше края экрана
  let lx = vx * CONFIG.cameraLookAhead, ly = vy * CONFIG.cameraLookAhead;
  const lmax = CONFIG.cameraMaxLead * Math.min(W, H) / cam.zoom, l = Math.hypot(lx, ly);
  if (l > lmax) { lx *= lmax / l; ly *= lmax / l; }

  // Критически задемпфированная пружина: догоняет без перелёта, на разгоне отстаёт
  const w = CONFIG.cameraStiffness;
  cam.vx += (w * w * (fx + lx - cam.x) - 2 * w * cam.vx) * h;
  cam.vy += (w * w * (fy + ly - cam.y) - 2 * w * cam.vy) * h;
  cam.x += cam.vx * h;
  cam.y += cam.vy * h;
}

function step(h) {
  stepPlayer(h);
  stepDrifters(h);
  collide(h);
  walls(h);
  for (const c of cells) {
    if (c.eatenBy) continue;
    c.x += c.vx * h;
    c.y += c.vy * h;
  }
  absorb(h);
  stepCamera(h);
}

// Подсаживаем мелочь вне экрана, чтобы мир не пустел
function repopulate(dt) {
  spawnT -= dt;
  const others = cells.length - (player.dead ? 0 : 1);   // съеденного игрока в cells уже нет
  if (spawnT > 0 || others >= Math.round(enemyTotal() * CONFIG.refillShare)) return;
  spawnT = 1.2;
  const pr = player.dead ? CONFIG.playerRadius : player.r;
  const f = dangerFactor(), big = Math.random() < 0.3 * f / (0.3 * f + 0.7 / f);
  const r = Math.min(pr * (big ? lerp(1.1, 2.2, Math.random()) : lerp(0.4, 0.85, Math.random())),
    CONFIG.playerRadius * CONFIG.maxEnemySize, CONFIG.worldRadius * 0.12);
  spawn(r, 400, true);
}

function targetZoom() {
  const base = clamp(Math.sqrt(W * H) / CONFIG.viewSize, 0.55, 1.3);
  if (!CONFIG.cameraAutoZoom) return base;
  const grow = Math.pow(CONFIG.playerRadius / Math.max(cam.fr, 1), CONFIG.zoomGrowth);
  const sp = player && !player.dead ? Math.hypot(player.vx, player.vy) / CONFIG.maxSpeed : 0;
  return base * grow / (1 + CONFIG.speedZoomOut * clamp(sp, 0, 1.5));
}

// ============================================================================
// Брызги выстрела — чисто визуальные, массу не несут
// ============================================================================

const PARTS = [];
for (let i = 0; i < 240; i++) PARTS.push({ life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, s: 1 });
let partNext = 0;

function resetParticles() { for (const p of PARTS) p.life = 0; }

// Брызги у рождения капли: веер вдоль выстрела
function puff(x, y, nx, ny, vx, vy) {
  const size = Math.sqrt(player.r / CONFIG.playerRadius);
  for (let i = 0; i < CONFIG.puffCount; i++) {
    const p = PARTS[partNext]; partNext = (partNext + 1) % PARTS.length;
    const spread = (Math.random() - 0.5) * 1.1, kick = (120 + Math.random() * 260) * size;
    const cx = nx * Math.cos(spread) - ny * Math.sin(spread);
    const cy = nx * Math.sin(spread) + ny * Math.cos(spread);
    p.x = x; p.y = y;
    p.vx = vx + cx * kick; p.vy = vy + cy * kick;
    p.max = p.life = 0.35 + Math.random() * 0.4;
    p.s = (0.7 + Math.random() * 1.2) * size;
  }
}

// Круг в точке тапа — отклик пальцу, в координатах экрана
const ripples = [];
function ripple(x, y) {
  if (ripples.length > 12) ripples.shift();
  ripples.push({ x, y, t: 0 });
}

function updateParticles(dt) {
  const d = Math.exp(-2.2 * dt);
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

// ============================================================================
// Визуальные состояния — сглаживание всего, что видно
// ============================================================================

function updateVisuals(dt) {
  const kv = expK(dt, 0.15), ka = expK(dt, 0.06), kt = expK(dt, 0.3);
  const pr = player.dead ? CONFIG.playerRadius : player.r;
  const K = 70, C = 9;                                   // пружина ядра: чуть недодемпфирована — дрожит
  for (const c of cells) {
    // ускорение за кадр — по нему отстаёт ядро
    const rax = dt > 0 ? (c.vx - c.pvx) / dt : 0, ray = dt > 0 ? (c.vy - c.pvy) / dt : 0;
    c.ax += (rax - c.ax) * ka; c.ay += (ray - c.ay) * ka;

    c.svx += (c.vx - c.svx) * kv; c.svy += (c.vy - c.svy) * kv;
    const sp = Math.sqrt(c.svx * c.svx + c.svy * c.svy);
    c.st += (CONFIG.stretch * clamp(sp / CONFIG.maxSpeed, 0, 1) - c.st) * kv;
    if (sp > 1) c.ang = Math.atan2(c.svy, c.svx);

    let tx = -c.ax / CONFIG.nucleusAccelRef * CONFIG.nucleusLag * c.r;
    let ty = -c.ay / CONFIG.nucleusAccelRef * CONFIG.nucleusLag * c.r;
    const tl = Math.sqrt(tx * tx + ty * ty), tmax = c.r * 0.28;
    if (tl > tmax) { tx *= tmax / tl; ty *= tmax / tl; }
    c.nvx += (-K * (c.nx - tx) - C * c.nvx) * dt; c.nx += c.nvx * dt;
    c.nvy += (-K * (c.ny - ty) - C * c.nvy) * dt; c.ny += c.nvy * dt;

    c.flash *= Math.exp(-3 * dt);
    if (c.born < 1) c.born = Math.min(1, c.born + dt / 1.2);
    if (!c.isPlayer) {
      // знак — съедобна или опасна, модуль — насколько; даже чуть меньшая уже заметно зелёная
      const lq = Math.log(c.r / pr) / Math.log(CONFIG.tintRange);
      const q = lq === 0 ? 0 : Math.sign(lq) * Math.max(0.45, Math.min(1, Math.abs(lq)));
      c.tint += (q - c.tint) * kt;
    }
  }
}

// ============================================================================
// Отрисовка
// ============================================================================

// Ступени качества. Начинаем с родного разрешения и всех эффектов; если средний кадр
// не укладывается в targetFps, сначала упрощаются эффекты, и только потом разрешение.
const QUALITY = [
  { dpr: 3,   detail: 2 },
  { dpr: 3,   detail: 1 },    // без органелл, мембрана из меньшего числа точек
  { dpr: 2,   detail: 1 },
  { dpr: 1.5, detail: 0 },    // и без дальних слоёв пыли
  { dpr: 1,   detail: 0 },
];
// hold — секунды, пока не меряем; before — средний кадр до последнего понижения;
// locked — понижение не помогло, дальше качество не трогаем
const perf = { q: 0, prev: 0, hold: 2, sum: 0, n: 0, work: 0, before: 0, locked: false };

const effDpr = q => Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR, QUALITY[q].dpr);

// Следующая ступень, которая на этом устройстве действительно что-то меняет
// (на экране с DPR 2 ступени «3» и «2» одинаковы — их пропускаем)
function nextQuality(q) {
  for (let n = q + 1; n < QUALITY.length; n++) {
    if (effDpr(n) !== effDpr(q) || QUALITY[n].detail !== QUALITY[q].detail) return n;
  }
  return q;
}

function monitorPerf(rawDt) {
  if (perf.locked || document.hidden || rawDt > 0.25) return;    // пауза, свёрнутая вкладка
  if (perf.hold > 0) { perf.hold -= rawDt; perf.sum = perf.n = 0; return; }
  perf.sum += rawDt; perf.n++;
  if (perf.sum < CONFIG.perfWindow) return;
  const avg = perf.sum / perf.n;
  perf.sum = perf.n = 0;
  if (perf.before) {
    // Прошлое понижение не ускорило кадр — значит, частоту режет не нагрузка, а
    // ограничение (энергосбережение iOS держит страницы на 30 FPS). Возвращаем
    // качество и больше его не трогаем: хуже картинка тут ничего не даст.
    if (avg > perf.before * 0.9) {
      perf.q = perf.prev;
      perf.locked = true;
      resize();
      return;
    }
    perf.before = 0;
  }
  const next = nextQuality(perf.q);
  if (avg > 1.12 / CONFIG.targetFps && next !== perf.q) {
    perf.before = avg;
    perf.prev = perf.q;
    perf.q = next;
    perf.hold = 1;
    resize();
  }
}

// Фон — глубина жидкости и виньетка — рисуется один раз в маленький канвас и
// растягивается на экран: одна текстура вместо градиентов и лишних слоёв CSS
const bg = document.createElement('canvas'), bgx = bg.getContext('2d');
function buildBackground() {
  const w = 192, h = Math.max(64, Math.round(w * H / Math.max(W, 1)));
  bg.width = w; bg.height = h;
  bgx.fillStyle = '#030509';
  bgx.fillRect(0, 0, w, h);
  bgx.save();
  bgx.translate(w / 2, h * 0.42); bgx.scale(1.2 * w, 0.9 * h);
  let g = bgx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, '#0b1629'); g.addColorStop(0.48, '#070c18'); g.addColorStop(1, '#030509');
  bgx.fillStyle = g; bgx.fillRect(-1, -1, 2, 2);
  bgx.restore();
  bgx.save();
  bgx.translate(w / 2, h / 2); bgx.scale(w * 0.71, h * 0.71);
  g = bgx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  bgx.fillStyle = g; bgx.fillRect(-1, -1, 2, 2);
  bgx.restore();
}

function resize() {
  const dpr = effDpr(perf.q);
  // размер самого канваса: на iPhone он выше окна — заходит под панель Safari
  const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
  // Пересоздание буфера канваса на DPR 3 — это 12 МБ и пустой кадр; без причины не надо.
  // На iPhone при повороте приходят и resize, и orientationchange.
  if (w === W && h === H && dpr === DPR) return;
  DPR = dpr; W = w; H = h;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  buildBackground();
}
window.addEventListener('resize', () => { resize(); perf.hold = 1; });
window.addEventListener('orientationchange', () => setTimeout(resize, 50));

function rnd(i, seed) {                 // детерминированный хеш -> [0,1)
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(seed, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Пыль: слои с параллаксом, бесконечная плитка без хранения точек
const DUST = [
  { p: 0.10, zp: 0.15, tile: 360, count: 9, size: 1.0, color: 'rgba(140,170,225,0.22)', dx: 4,  dy: 1.5 },
  { p: 0.30, zp: 0.40, tile: 420, count: 6, size: 1.4, color: 'rgba(150,190,240,0.18)', dx: 7,  dy: -3 },
  { p: 0.65, zp: 0.75, tile: 520, count: 4, size: 1.8, color: 'rgba(170,210,255,0.14)', dx: -5, dy: 4 },
  { p: 1.00, zp: 1.00, tile: 460, count: 4, size: 2.2, color: 'rgba(160,220,255,0.10)', dx: 0,  dy: 0 },
];

function drawDust() {
  for (let li = QUALITY[perf.q].detail ? 0 : 2; li < DUST.length; li++) {
    const L = DUST[li], lz = Math.pow(cam.zoom, L.zp), T = L.tile;
    const ox = cam.x * L.p + time * L.dx, oy = cam.y * L.p + time * L.dy;
    const hw = W / 2 / lz, hh = H / 2 / lz;
    const x0 = Math.floor((ox - hw) / T), x1 = Math.floor((ox + hw) / T);
    const y0 = Math.floor((oy - hh) / T), y1 = Math.floor((oy + hh) / T);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) continue;
    ctx.fillStyle = L.color;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const cell = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663);
        for (let k = 0; k < L.count; k++) {
          const id = cell ^ Math.imul(k + 1, 83492791);
          const px = (tx + rnd(id, 1 + li)) * T, py = (ty + rnd(id, 7 + li)) * T;
          const s = L.size * (0.6 + rnd(id, 13 + li) * 0.9);
          ctx.fillRect((px - ox) * lz + W / 2 - s / 2, (py - oy) * lz + H / 2 - s / 2, s, s);
        }
      }
    }
  }
}

function drawBoundary() {
  const z = cam.zoom, cx = -cam.x * z + W / 2, cy = -cam.y * z + H / 2, R = CONFIG.worldRadius * z;
  // Если край мира далеко за экраном — рисовать нечего
  const far = Math.hypot(cam.x, cam.y) * z;
  if (far + Math.hypot(W, H) / 2 < R - 20) return;
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, R, 0, TAU, true);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(120,170,255,0.035)'; ctx.lineWidth = 18; ctx.stroke();
  ctx.strokeStyle = 'rgba(140,190,255,0.14)';  ctx.lineWidth = 1.5; ctx.stroke();
}

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const light = c => mix(c, [255, 255, 255], 0.5);

// Палитра квантуется в 33 оттенка (плюс игрок): у каждого готовые спрайты свечения и ядра.
// drawImage готовой текстуры на GPU дешевле, чем новый радиальный градиент на каждую клетку.
const PAL = new Map();
function sprite(size, stops) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const x = cnv.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, color] of stops) g.addColorStop(at, color);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return cnv;
}
function paletteOf(c) {
  const key = c.isPlayer ? -1 : Math.round((clamp(c.tint, -1, 1) + 1) * 16);
  let p = PAL.get(key);
  if (!p) {
    const t = key / 16 - 1;
    const col = key < 0 ? RGB_PLAYER : t < 0 ? mix(RGB_EQUAL, RGB_FOOD, -t) : mix(RGB_EQUAL, RGB_THREAT, t);
    const lc = light(col), inner = key < 0 ? 0.5 / 2.4 : 0.5 / 1.9;
    // Цитоплазма — градиент единичного радиуса: клетка рисуется в масштабе sr, так что
    // один объект годится для любой клетки этого оттенка, прозрачность — через globalAlpha
    const body = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.03), k = key < 0 ? 1.25 : 1;
    body.addColorStop(0, rgba(col, 0.06 * k));
    body.addColorStop(0.55, rgba(col, 0.14 * k));
    body.addColorStop(0.86, rgba(col, 0.32 * k));
    body.addColorStop(1, rgba(col, 0.72));
    p = {
      col, lc, body,
      rim: rgba(lc, key < 0 ? 0.6 : 0.45),
      dot: rgba(lc, 0.7),
      organelle: rgba(lc, 0.32),
      glow: sprite(128, [[0, rgba(col, 1)], [inner, rgba(col, 1)], [1, rgba(col, 0)]]),
      core: sprite(64, [[0, 'rgba(255,255,255,1)'], [0.35, rgba(lc, 0.6)], [1, rgba(col, 0)]]),
    };
    PAL.set(key, p);
  }
  return p;
}

function alphaOf(c) {
  let a = c.born;
  if (c.eatenBy) a *= Math.sqrt(clamp(c.m / c.m0, 0, 1));
  return a;
}

// Контур единичного радиуса. Точек — примерно одна на 8 px экранного контура (у мелких
// клеток не меньше 16), и идут они не ломаной, а квадратичными кривыми через середины
// соседних точек: у крупной клетки на весь экран не остаётся углов.
const MEM = new Float64Array(2 * 160);        // точки контура, переиспользуются

function membrane(sr, ph) {
  const n = QUALITY[perf.q].detail > 1 ? clamp(Math.round(sr * 0.8), 16, 160) : clamp(Math.round(sr * 0.5), 12, 96);
  const A = CONFIG.wobble;
  const br = 1 + CONFIG.breathe * Math.sin(time * 1.6 + ph);
  for (let i = 0; i < n; i++) {
    const th = i / n * TAU;
    const k = br * (1 + A * (0.5 * Math.sin(3 * th + time * 1.1 + ph)
                           + 0.3 * Math.sin(5 * th - time * 1.7 + ph * 2)
                           + 0.2 * Math.sin(7 * th + time * 2.3 + ph * 3)));
    MEM[2 * i] = Math.cos(th) * k;
    MEM[2 * i + 1] = Math.sin(th) * k;
  }
  ctx.beginPath();
  ctx.moveTo((MEM[2 * n - 2] + MEM[0]) / 2, (MEM[2 * n - 1] + MEM[1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = i + 1 < n ? i + 1 : 0;
    ctx.quadraticCurveTo(MEM[2 * i], MEM[2 * i + 1],
      (MEM[2 * i] + MEM[2 * j]) / 2, (MEM[2 * i + 1] + MEM[2 * j + 1]) / 2);
  }
  ctx.closePath();
}

function drawGlow(c, pal, a) {
  const R = c.sr * (c.isPlayer ? 2.4 : 1.9);
  ctx.globalAlpha = Math.min(1, (c.isPlayer ? 0.22 : 0.11) * a * (1 + c.flash * 1.8));
  ctx.drawImage(pal.glow, c.sx - R, c.sy - R, R * 2, R * 2);
}

function drawBody(c, pal, a) {
  const sr = c.sr;
  ctx.globalAlpha = a;
  if (sr < 2.5) {
    ctx.fillStyle = pal.dot;
    ctx.beginPath(); ctx.arc(c.sx, c.sy, Math.max(sr, 1), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  // Мембрана и цитоплазма — в повёрнутой и чуть вытянутой вдоль скорости системе,
  // в масштабе радиуса: контур и градиент единичные
  ctx.save();
  ctx.translate(c.sx, c.sy);
  ctx.rotate(c.ang);
  const s = 1 + c.st;
  ctx.scale(s * sr, sr / s);          // площадь сохраняется
  membrane(sr, c.ph);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, sr * 0.035) / sr;
  ctx.strokeStyle = pal.rim;
  ctx.stroke();
  ctx.restore();

  // Ядро: медленно плавает и отстаёт при ускорении — видно, что внутри есть масса
  const z = cam.zoom;
  const nx = c.sx + c.nx * z + sr * 0.06 * Math.sin(time * 0.6 + c.ph);
  const ny = c.sy + c.ny * z + sr * 0.06 * Math.cos(time * 0.47 + c.ph * 1.3);
  const nr = sr * (c.isPlayer ? 0.36 : 0.3);
  ctx.globalAlpha = a * (c.isPlayer ? 0.85 : 0.6);
  ctx.drawImage(pal.core, nx - nr, ny - nr, nr * 2, nr * 2);
  ctx.globalAlpha = 1;

  // Органеллы — только когда клетка на экране достаточно крупная
  if (sr > 10 && QUALITY[perf.q].detail > 1) {
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.organelle;
    const os = Math.max(1, sr * 0.045);
    for (let k = 0; k < 4; k++) {
      const an = c.ph * (k + 1) + time * (0.15 + 0.05 * k) * (k & 1 ? 1 : -1);
      const rr = sr * (0.45 + 0.1 * Math.sin(time * 0.4 + k + c.ph));
      const ox = c.sx + c.nx * z * 0.5 + Math.cos(an) * rr;
      const oy = c.sy + c.ny * z * 0.5 + Math.sin(an) * rr;
      ctx.beginPath(); ctx.arc(ox, oy, os, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

const byRadius = (a, b) => a.r - b.r;

function drawCells() {
  const z = cam.zoom;
  for (const c of cells) {
    c.sx = (c.x - cam.x) * z + W / 2;
    c.sy = (c.y - cam.y) * z + H / 2;
    c.sr = c.r * z;
    const m = c.sr * 2.5 + 4;
    c.vis = c.sx > -m && c.sx < W + m && c.sy > -m && c.sy < H + m && c.sr > 0.2;
  }
  // мелкие снизу: жертва видна сквозь полупрозрачного хищника, пока растворяется
  order.length = 0;
  for (const c of cells) order.push(c);
  order.sort(byRadius);

  const minGlow = QUALITY[perf.q].detail ? 2 : 4;
  ctx.globalCompositeOperation = 'lighter';
  for (const c of order) if (c.vis && c.sr > minGlow) drawGlow(c, paletteOf(c), alphaOf(c));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const c of order) if (c.vis) drawBody(c, paletteOf(c), alphaOf(c));
}

const PART_COLOR = rgba(RGB_PLAYER, 0.45), RIPPLE_COLOR = rgba(RGB_PLAYER, 0.4);

function drawParticles() {
  const z = cam.zoom;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = PART_COLOR;
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    const t = p.life / p.max;
    const x = (p.x - cam.x) * z + W / 2, y = (p.y - cam.y) * z + H / 2, s = Math.max(0.6, p.s * z);
    ctx.globalAlpha = t * t;
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawRipples(dt) {
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = RIPPLE_COLOR;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.t += dt;
    const k = r.t / 0.45;
    if (k >= 1) { ripples.splice(i, 1); continue; }
    ctx.globalAlpha = (1 - k) * (1 - k);
    ctx.beginPath(); ctx.arc(r.x, r.y, 5 + 18 * Math.sqrt(k), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function render(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(bg, 0, 0, W, H);        // заодно и очистка: канвас непрозрачный
  drawDust();
  drawBoundary();
  drawParticles();
  drawCells();
  drawRipples(dt);
}

// ============================================================================
// Главный цикл
// ============================================================================

function checkFinite() {
  for (const c of cells) {
    if (Number.isFinite(c.x + c.y + c.vx + c.vy + c.m)) continue;
    console.error('NaN in physics', c);
    c.vx = c.vy = 0;
    if (!Number.isFinite(c.x + c.y)) c.x = c.y = 0;
    if (!Number.isFinite(c.m) || c.m <= 0) setMass(c, massOf(CONFIG.playerRadius * 0.5));
  }
  if (!Number.isFinite(cam.x + cam.y + cam.vx + cam.vy + cam.zoom)) {
    console.error('NaN in camera');
    cam.x = cam.fx; cam.y = cam.fy; cam.vx = cam.vy = 0; cam.zoom = 1;
  }
}

let looping = false, debugT = 0, nextDraw = 0;

function startLoop() {
  if (looping) return;
  looping = true;
  last = performance.now();
  nextDraw = 0;
  requestAnimationFrame(frame);
}

function frame(now) {
  // Пауза: цикл просто не продолжается — ни одного кадра и ни одного пробуждения
  // процессора, последний кадр остаётся на экране. closeMenu запустит его снова.
  if (menuOpen) { looping = false; return; }

  // Потолок FPS. rAF идёт с частотой экрана, поэтому на 120 Гц кадр рисуется через раз,
  // на 90 Гц — три из четырёх: в среднем ровно maxFps. Сроки идут по сетке, а не «от
  // прошлого кадра», иначе на 90 Гц выходило бы 45. Допуск 2 мс — на дрожание vsync.
  if (CONFIG.maxFps > 0) {
    const step = 1000 / CONFIG.maxFps;
    if (now < nextDraw - 2) { requestAnimationFrame(frame); return; }
    nextDraw = now - nextDraw > step ? now + step : nextDraw + step;   // отстали — новая сетка
  }
  const work0 = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) dt = 0;
  monitorPerf(dt);
  dt = Math.min(dt, CONFIG.maxFrameDt);
  if (dt > 0) fps += (1 / dt - fps) * 0.05;

  for (const c of cells) { c.pvx = c.vx; c.pvy = c.vy; }
  updateInput(dt);
  if (dt > 0) {
    const n = Math.ceil(dt / CONFIG.maxStep), h = dt / n;
    for (let i = 0; i < n; i++) step(h);
  }
  time += dt;

  const tz = targetZoom();
  cam.zoom = Math.exp(lerp(Math.log(cam.zoom), Math.log(tz), expK(dt, CONFIG.zoomSmoothness)));

  updateParticles(dt);
  updateVisuals(dt);
  repopulate(dt);
  checkFinite();

  if (shots >= 4) hintEl.classList.add('hide');
  if (dead) {
    deadT += dt;
    if (deadT > 0.5) overEl.classList.add('show');
  }

  render(dt);
  perf.work += (performance.now() - work0 - perf.work) * 0.05;
  debugT -= dt;
  if (debug && debugT <= 0) {           // текст 4 раза в секунду, а не каждый кадр: это DOM
    debugT = 0.25;
    const sp = player.dead ? 0 : Math.hypot(player.vx, player.vy);
    debugEl.textContent =
      `fps    ${fps.toFixed(0)}\n` +
      `speed  ${sp.toFixed(0)} px/s\n` +
      `shots  ${shots}\n` +
      `mass   ${(player.m / baseMass()).toFixed(2)} × start\n` +
      `radius ${player.r.toFixed(1)}\n` +
      `zoom   ${cam.zoom.toFixed(2)}\n` +
      `cells  ${cells.length}\n` +
      `dpr    ${DPR}  quality ${perf.q}\n` +
      `js     ${perf.work.toFixed(2)} ms/frame`;
  }
  requestAnimationFrame(frame);
}

// ============================================================================
// Меню настроек — кнопка в правом нижнем углу. Пока оно открыто, игра на паузе.
// Настройки запоминаются в localStorage этого браузера.
// ============================================================================

const menuBtn = $('menuBtn'), menuEl = $('menu'), newBtn = $('b-new'), sepEl = menuEl.querySelector('.m-sep');
// v2: храним только отличия от умолчаний. В v1 лежали все значения разом, и новые
// умолчания (например, баланс Normal) не доходили до тех, кто хоть раз тронул меню.
const SAVE_KEY = 'abstract-cell-settings-v2';
try { localStorage.removeItem('abstract-cell-settings'); } catch (e) {}
const SLIDERS = [
  { id: 'eject',   key: 'ejectMassFraction', k: 0.01, fmt: v => `${+(v * 100).toFixed(2)}%` },
  { id: 'enemies', key: 'enemyDensity',      k: 0.01, fmt: v => `${+v.toFixed(2)}× · ${enemyTotal()} cells`, world: true },
  { id: 'diff',    key: 'difficulty',        k: 0.01, world: true,
    fmt: v => `${['Easy', 'Normal', 'Hard', 'Brutal'][v < 0.3 ? 0 : v < 0.65 ? 1 : v < 0.9 ? 2 : 3]} · ${Math.round(v * 100)}%` },
  { id: 'map',     key: 'worldRadius',       k: 1,    fmt: v => `${(v / DEFAULTS.worldRadius).toFixed(1)}×`, world: true },
  { id: 'maxe',    key: 'maxEnemySize',      k: 1,    fmt: v => `${v.toFixed(1)}× you`, world: true },
];
const SAVED_KEYS = ['ejectMassFraction', 'cameraAutoZoom', 'enemyDensity', 'difficulty', 'worldRadius', 'maxEnemySize'];
const DEFAULTS = {};
for (const k of SAVED_KEYS) DEFAULTS[k] = CONFIG[k];
let menuOpen = false, worldBuiltWith = {};

function setDebug(on) {
  debug = on;
  debugEl.classList.toggle('show', on);
  $('s-debug').checked = on;
}

function saveSettings() {
  const data = { debug };
  for (const k of SAVED_KEYS) if (CONFIG[k] !== DEFAULTS[k]) data[k] = CONFIG[k];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadSettings() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  if (!data || typeof data !== 'object') return;
  for (const sl of SLIDERS) {
    if (!(sl.key in data)) continue;
    const el = $('s-' + sl.id), v = Number(data[sl.key]);
    if (Number.isFinite(v)) CONFIG[sl.key] = clamp(v, el.min * sl.k, el.max * sl.k);
  }
  if (typeof data.cameraAutoZoom === 'boolean') CONFIG.cameraAutoZoom = data.cameraAutoZoom;
  if (data.debug === true) setDebug(true);
}

// Настройки мира вступают в силу с новым миром — пока он не создан, подсвечиваем кнопку
function markPending() {
  const pending = SLIDERS.some(sl => sl.world && CONFIG[sl.key] !== worldBuiltWith[sl.key]);
  newBtn.classList.toggle('pending', pending);
  sepEl.classList.toggle('pending', pending);
}

function syncMenu() {
  for (const sl of SLIDERS) {
    $('s-' + sl.id).value = CONFIG[sl.key] / sl.k;
    $('o-' + sl.id).textContent = sl.fmt(CONFIG[sl.key]);
  }
  $('s-zoom').checked = CONFIG.cameraAutoZoom;
  $('s-debug').checked = debug;
  markPending();
}

function newWorld() {
  for (const sl of SLIDERS) if (sl.world) worldBuiltWith[sl.key] = CONFIG[sl.key];
  reset();
  markPending();
}

function openMenu() {
  release();
  menuOpen = true;
  syncMenu();
  menuEl.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  menuOpen = false;
  menuEl.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  perf.hold = 1;
  startLoop();                          // last обновится там же — без скачка времени после паузы
}

for (const sl of SLIDERS) {
  $('s-' + sl.id).addEventListener('input', e => {
    CONFIG[sl.key] = +(Number(e.target.value) * sl.k).toFixed(6);
    for (const o of SLIDERS) $('o-' + o.id).textContent = o.fmt(CONFIG[o.key]);
    markPending();
    saveSettings();
  });
}
$('s-zoom').addEventListener('change', e => { CONFIG.cameraAutoZoom = e.target.checked; saveSettings(); });
$('s-debug').addEventListener('change', e => { setDebug(e.target.checked); saveSettings(); });
$('b-defaults').addEventListener('click', () => {
  Object.assign(CONFIG, DEFAULTS);
  syncMenu();
  saveSettings();
});
newBtn.addEventListener('click', () => { newWorld(); closeMenu(); });
menuBtn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
// Тапы по меню не должны доходить до игры
for (const el of [menuBtn, menuEl]) el.addEventListener('pointerdown', e => e.stopPropagation());
window.addEventListener('resize', () => { if (menuOpen) render(0); });   // на паузе кадр не рисуется сам

loadSettings();
resize();
for (const sl of SLIDERS) if (sl.world) worldBuiltWith[sl.key] = CONFIG[sl.key];
reset();
startLoop();

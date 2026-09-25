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
  moteSteerTime: 0.7,       // с: капля в жидкости теряет ~63% скорости за это время;
                            // путь по инерции ∝ этому времени (~1000 px при ejectSpeed 1500)
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
  maxEnemies: 4000,       // потолок — чтобы огромная и плотная карта держала 60 FPS
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

  // --- поведение организмов (переключается в меню, действует сразу) --------------
  // drift — блуждают сами по себе; hunt — гонятся за мелкими и бегут от крупных (и от
  // игрока тоже); school — плывут стаями с соседями своего размера; whirl — вся жидкость
  // кружит водоворотом вокруг центра; still — стоят, пока их не толкнут
  enemyAI: 'drift',
  aiThink: [0.18, 0.36],  // с: как часто организм заново решает, куда плыть
  aiSense: 240,           // px: базовое чутьё, у крупных дальше (+3·r, не больше aiSenseMax)
  aiSenseMax: 650,
  huntBoost: 1.9,         // во сколько раз быстрее своего дрейфа гонится за добычей
  fleeBoost: 2.1,         // и убегает от угрозы
  whirlSpeed: 1.8,        // скорость в водовороте — в долях своего дрейфа

  // --- бактерии: тёмные хищники со щупальцами (переключатель в меню) ---------------
  // Щупальцем хватают всех, кто меньше и проплывает в пределах досягаемости, и
  // подтягивают к себе, пока не коснутся — дальше обычное поглощение. Вырваться можно:
  // хватка слабее очереди выстрелов, а натянутое сильнее reach·bacteriaHold щупальце рвётся.
  // Двигаются всегда как в режиме hunt, какое бы поведение ни было у остальных.
  bacteria: true,
  bacteriaCount: 5,       // на карте радиуса densityRadius; растёт с площадью, √плотности и
  bacteriaMax: 60,        // сложностью, но не больше этого
  bacteriaSize: [1.25, 2.2], // радиус в долях стартовой клетки (при рестарте — текущей)
  bacteriaReach: [30, 0.6],  // px + доля радиуса: докуда дотягиваются щупальца от мембраны
  bacteriaGrip: 85,       // px/с²: с каким ускорением щупальце подтягивает добычу. Стоящую
                          // клетку с 40 px втягивает за ~1.1 с; очередь через 0.6 с после
                          // хватки вырывает, стоит ~15 выстрелов (~20% массы)
  bacteriaResist: 1.5,    // 1/с: и сколько гасит её попыток уплыть
  bacteriaHold: 1.6,      // щупальце рвётся, если добыча дальше reach · hold
  bacteriaArms: 3,        // скольких держит одновременно
  bacteriaCooldown: 0.7,  // с: после обрыва не хватает снова
  bacteriaSpeed: 0.6,     // дрейф в долях обычного: медленные, берут засадой

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

  // --- звук -------------------------------------------------------------------------
  sound: true,            // все звуки (включатся с первым касанием — правило браузеров)
  ambience: true,         // тихий фон: «дышащий» аккорд, гул воды, далёкие пузырьки

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
// Цвета игроков в сетевой игре: 0 — хост (и одиночная игра). Зелёного и красного нет —
// это цвета добычи и угрозы
const PLAYER_RGB = [RGB_PLAYER, [255, 125, 205], [180, 135, 255], [255, 215, 95], [255, 160, 80], [95, 230, 230]];

let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, vx: 0, vy: 0, zoom: 1, fx: 0, fy: 0, fr: CONFIG.playerRadius };
const input = { down: false, x: 0, y: 0, held: 0, streamT: 0 };
let cells = [], order = [], player = null, cellId = 0;
let time = 0, dead = false, deadT = 0, spawnT = 0, bactT = 0, shots = 0;
let firstRun = true, debug = false, fps = 60, last = performance.now();
// Сетевая игра (net.js). role: null — одиночная; 'host' — этот телефон считает весь мир;
// 'client' — шлёт хосту тапы и рисует его снимки. remotes — гости у хоста: соединение,
// цвет, клетка; focus — за кем у гостя следит камера; localCfg — свои настройки мира
// гостя, пока вместо них действуют хостовы (чтобы не сохранить чужие)
const net = { role: null, myColor: 0, remotes: [], focus: null, localCfg: {} };

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
    tx: 0, ty: 0, think: Math.random() * 0.2,   // желаемая скорость по enemyAI и когда её пересчитать
    bact: false, arms: null, grabCd: 0,           // бактерия: щупальца и пауза между хватками
    color: 0, owner: null,             // игрок: цвет и гость-хозяин (null — свой, на этом телефоне)
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
  c.vx = c.tx = Math.cos(c.wander) * c.cruise;
  c.vy = c.ty = Math.sin(c.wander) * c.cruise;
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
      if (!farFromGuests(x, y, r)) continue;
    }
    let free = true;
    const pad = 24 / Math.sqrt(Math.max(1, CONFIG.enemyDensity));   // в тесноте зазор меньше — иначе не влезут
    for (const o of cells) {
      // от других игроков — как от своего: не ближе safe
      if (Math.hypot(x - o.x, y - o.y) < o.r + r + (o.isPlayer ? Math.max(pad, safe) : pad)) { free = false; break; }
    }
    if (free) return { x, y };
  }
  return null;
}

// Вне экранов гостей: хост знает их размер в пикселях мира (гость присылает)
function farFromGuests(x, y, r) {
  for (const rp of net.remotes) {
    const c = rp.cell || rp.eater;
    if (c && Math.hypot(x - c.x, y - c.y) < rp.viewR + r * 2) return false;
  }
  return true;
}

function spawn(r, safe, farFromView, maxDist) {
  const p = place(r, safe, farFromView, maxDist);
  if (!p) return null;
  const c = makeCell(p.x, p.y, r, false);
  giveDrift(c);
  cells.push(c);
  return c;
}

// Бактерия — обычная клетка (ест и едома как все) плюс щупальца
function spawnBact(r, safe, farFromView) {
  const c = spawn(r, safe, farFromView);
  if (!c) return null;
  c.bact = true;
  c.cruise *= CONFIG.bacteriaSpeed;
  c.vx = c.tx = c.vx * CONFIG.bacteriaSpeed;
  c.vy = c.ty = c.vy * CONFIG.bacteriaSpeed;
  c.arms = [];
  for (let i = 0; i < CONFIG.bacteriaArms; i++) c.arms.push({ t: null, ext: 0, ang: 0, len: 0 });
  return c;
}

function bactRadius(pr) {
  const [a, b] = CONFIG.bacteriaSize;
  return Math.min(pr * lerp(a, b, Math.random()),
    CONFIG.playerRadius * CONFIG.maxEnemySize, CONFIG.worldRadius * 0.12);
}

function bacteriaTotal() {
  if (!CONFIG.bacteria) return 0;
  const area = (CONFIG.worldRadius / CONFIG.densityRadius) ** 2;
  const n = CONFIG.bacteriaCount * area * Math.sqrt(CONFIG.enemyDensity * dangerFactor());
  return clamp(Math.round(n), 1, CONFIG.bacteriaMax);
}

const reachOf = b => CONFIG.bacteriaReach[0] + CONFIG.bacteriaReach[1] * b.r;

// Включили в меню — подсаживаем вне экрана; выключили — убираем. Кого бактерия уже
// растворяла, тот свободен (как когда растворился сам хищник)
function setBacteria(on) {
  if (on) {
    let n = 0;
    for (const c of cells) if (c.bact) n++;
    const pr = player.dead ? CONFIG.playerRadius : Math.max(CONFIG.playerRadius, player.r);
    for (let i = n; i < bacteriaTotal(); i++) spawnBact(bactRadius(pr), 400, true);
  } else {
    for (const c of cells) {
      const e = c.eatenBy;
      if (e && e.bact && !e.eatenBy) { c.eatenBy = null; c.vx = e.vx; c.vy = e.vy; }
    }
    cells = cells.filter(c => !c.bact || c.eatenBy);
  }
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
  if (!firstRun) Sound.rebirth();
  cells = [];
  player = makeCell(0, 0, CONFIG.playerRadius, true);
  player.color = net.myColor;
  cells.push(player);
  const r0 = CONFIG.playerRadius, maxE = CONFIG.maxEnemySize;
  const weights = CONFIG.population.map(groupWeight), total = enemyTotal();
  const weight = weights.reduce((sum, w) => sum + w, 0);
  const near = Math.min(1, CONFIG.worldRadius / 1500);        // на маленькой карте всё ближе
  const top = CONFIG.population[CONFIG.population.length - 1], rMax = CONFIG.worldRadius * 0.3;
  // бактерии — первыми, пока карта пуста: на тесной им иначе не находится места.
  // Хищники: не ближе крупных, да ещё на длину щупальца дальше
  const nb = bacteriaTotal();
  for (let i = 0; i < nb; i++) spawnBact(bactRadius(r0), CONFIG.threatSafe * near + 120, false);
  for (const [gi, g] of CONFIG.population.entries()) {
    const n = Math.round(weights[gi] * total / weight);
    // Гиганты растут вслед за ползунком: при maxEnemySize больше их max — до maxEnemySize,
    // равномерно по логарифму, чтобы средних гигантов было не меньше, чем исполинов
    const lo = Math.min(g.min, maxE), hi = g === top ? maxE : Math.min(g.max, maxE);
    const logR = g === top && hi > g.max;
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const r = Math.min(rMax, r0 * (logR ? lo * Math.pow(hi / lo, u) : lerp(lo, hi, u)));
      // крупных не сажаем рядом, а первые куски добычи — наоборот, в кольце у старта
      if (r > r0) spawn(r, CONFIG.threatSafe * near, false);
      else if (i < CONFIG.nearFood) spawn(r, CONFIG.nearFoodRing[0], false, CONFIG.nearFoodRing[1]);
      else spawn(r, 220 * near, false);
    }
  }
  for (const c of cells) c.born = 1;    // стартовое население видно сразу
  resetParticles();
  dead = false; deadT = 0; spawnT = 0; bactT = 0;
  input.down = false; ripples.length = 0;
  overEl.classList.remove('show');
  if (firstRun) {
    // При самом первом запуске камера сразу на игроке, при рестарте — плавно доедет
    cam.x = cam.fx = player.x; cam.y = cam.fy = player.y;
    cam.zoom = targetZoom();
    firstRun = false;
  }
  if (net.role === 'host') netWorldReset();   // гости — в новый мир тоже
}

// Сетевая игра: игрок (свой или гостя) появляется в уже живущем мире — в свободном
// месте, где рядом нет никого крупнее
function spawnPlayerCell(color, owner) {
  const r = CONFIG.playerRadius;
  let at = null;
  for (let k = 0; k < 20 && !at; k++) {
    const q = place(r, 0, false);
    if (!q) continue;
    let safe = true;
    for (const o of cells) {
      if (o.r > r && Math.hypot(q.x - o.x, q.y - o.y) < CONFIG.threatSafe * 0.7 + o.r) { safe = false; break; }
    }
    if (safe) at = q;
  }
  if (!at) at = place(r, 0, false) || { x: 0, y: 0 };
  const c = makeCell(at.x, at.y, r, true);
  c.color = color; c.owner = owner;
  cells.push(c);
  return c;
}

// Тап после гибели: в одиночной — новый мир, в сетевой мир общий — только новая клетка
function restart() {
  if (net.role === 'client') netRespawn();
  else if (net.role === 'host') {
    player = spawnPlayerCell(net.myColor, null);
    dead = false; deadT = 0; input.down = false;
    overEl.classList.remove('show');
    Sound.rebirth();
  } else reset();
}

// ============================================================================
// Звук. Ни одного файла — всё синтезирует Web Audio на лету. Мягкость держится на трёх
// вещах: 1) атака — плавный линейный подъём 20–400 мс, без удара в начале (резкость
// была именно в нём); 2) только синусы, ниже 1 кГц и под фильтром — ни шума, ни
// обертонов; 3) общий длинный тёмный хвост — звук растворяется, как в толще воды.
// Ноты поглощения — из минорной пентатоники, в тон фоновому аккорду A–E. Браузеры
// (особенно iOS Safari) дают включить звук только по жесту — контекст создаётся на
// первом касании.
// ============================================================================

const Sound = (() => {
  const PENTA = [0, 3, 5, 7, 10, 12];                     // полутона от A3: A C D E G A
  const AMB_LEVEL = 0.02;                                 // фон — на пороге слышимости (автор просил тише)
  let ac = null, out = null, wet = null, noise = null, amb = null;
  let lastEat = -1, lastGrab = -1, bubbleT = 3;

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    // Общий выход через бережный компрессор: очередь капель не складывается в гул
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -24; comp.knee.value = 18; comp.ratio.value = 3;
    comp.attack.value = 0.01; comp.release.value = 0.4;
    comp.connect(ac.destination);
    out = ac.createGain(); out.gain.value = 0.42; out.connect(comp);   // общая громкость

    // Хвост: 2.2 с тёмного затухающего шума, без щелчка в начале — толща воды
    const sr = ac.sampleRate, len = Math.round(sr * 2.2), fade = sr * 0.02;
    const ir = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.1;          // верх срезан сильно
        d[i] = lp * Math.min(1, i / fade) * Math.pow(1 - i / len, 2.2);
      }
    }
    const conv = ac.createConvolver(); conv.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.9;
    wet.connect(conv); conv.connect(out);

    // Секунда белого шума — для фонового гула воды
    noise = ac.createBuffer(1, sr, sr);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    buildAmbience();
    return true;
  }

  // Фон: тихий аккорд A–E–A под фильтром, который медленно «дышит», и глухой шум воды
  function buildAmbience() {
    amb = ac.createGain(); amb.gain.value = 0; amb.connect(out);
    const breath = ac.createGain(); breath.gain.value = 1; breath.connect(amb);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.5;
    lp.connect(breath);
    for (const [f, v] of [[110, 0.45], [164.9, 0.3], [220.7, 0.2]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; g.gain.value = v;
      o.connect(g); g.connect(lp); o.start();
    }
    const hum = ac.createBufferSource(), hlp = ac.createBiquadFilter(), hg = ac.createGain();
    hum.buffer = noise; hum.loop = true;
    hlp.type = 'lowpass'; hlp.frequency.value = 200; hg.gain.value = 0.3;
    hum.connect(hlp); hlp.connect(hg); hg.connect(breath); hum.start();
    // Две медленные волны: фильтр открывается раз в ~17 с, громкость колышется раз в ~11 с
    const lfo = (hz, depth, param) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = hz; g.gain.value = depth;
      o.connect(g); g.connect(param); o.start();
    };
    lfo(0.06, 150, lp.frequency);
    lfo(0.09, 0.3, breath.gain);
  }

  const live = () => ac && CONFIG.sound && ac.state === 'running';

  // Огибающая: линейный подъём за a секунд (экспонента в конце подъёма «бьёт»), потом
  // плавное затухание — за d секунд падает до ~1% (5 постоянных времени)
  function env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0, t + a, d / 5);
  }
  // Синус, скользящий по частоте f0 → f1 за glide секунд, под фильтром cutoff;
  // send — доля в хвост
  function tone(f0, f1, glide, peak, a, d, cutoff, send, t) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.5;
    env(g, t, peak, a, d);
    o.connect(f); f.connect(g); g.connect(out);
    if (send > 0) {
      const s = ac.createGain(); s.gain.value = send;
      g.connect(s); s.connect(wet);
    }
    o.start(t); o.stop(t + a + d + 0.1);
  }

  return {
    // Вызывается на каждом жесте: создаёт контекст или будит его после паузы iOS
    unlock() {
      if (!CONFIG.sound) return;
      if (!ac && !init()) return;
      this.update();
    },
    // Включили/выключили в меню. Звук выключен — контекст спит и не тратит батарею
    update() {
      if (!ac) return;
      if (!CONFIG.sound) { ac.suspend().catch(() => {}); return; }
      if (ac.state !== 'running') ac.resume().catch(() => {});
      amb.gain.setTargetAtTime(CONFIG.ambience ? AMB_LEVEL : 0, ac.currentTime, 0.8);
    },
    sleep() { if (ac) ac.suspend().catch(() => {}); },

    // Выброс капли: тихое округлое «пуф», тон чуть оседает. Крупная клетка — ниже
    eject(r) {
      if (!live()) return;
      const k = clamp(Math.pow(CONFIG.playerRadius / r, 0.25), 0.6, 1.3) * (0.96 + Math.random() * 0.08);
      tone(320 * k, 210 * k, 0.2, 0.07, 0.025, 0.32, 700, 0.5, ac.currentTime);   // ниже 200 Гц динамик iPhone почти не играет
    },

    // Игрок кого-то проглотил. frac = r жертвы / r игрока: крупная жертва — нота ниже
    // и чуть громче. Своя же капля — почти неслышный вздох
    eat(frac, own) {
      if (!live()) return;
      const t = ac.currentTime;
      if (own) { tone(520, 560, 0.1, 0.015, 0.03, 0.2, 900, 0.6, t); return; }
      if (t - lastEat < 0.08) return;                     // каскад — не чаще 12 нот в секунду
      lastEat = t;
      frac = clamp(frac, 0, 1);
      const f = 220 * Math.pow(2, PENTA[Math.round((1 - frac) * (PENTA.length - 1))] / 12);
      const peak = 0.05 + 0.06 * frac;
      tone(f * 0.97, f, 0.12, peak, 0.04, 1.4, 1200, 0.8, t);            // сама нота
      tone(f * 0.5, f * 0.5, 0.01, peak * 0.4, 0.07, 1.1, 600, 0.6, t);  // тёплая октава ниже
    },

    // Игрока поглотили: медленный низкий выдох, уходящий вниз
    death() {
      if (!live()) return;
      const t = ac.currentTime;
      tone(196, 65, 2.5, 0.1, 0.4, 2.6, 500, 0.8, t);
      tone(98, 49, 2.5, 0.05, 0.5, 2.4, 300, 0.6, t);
    },

    // Игрока схватило щупальце: глухой короткий рывок вниз
    grab() {
      if (!live()) return;
      const t = ac.currentTime;
      if (t - lastGrab < 0.3) return;
      lastGrab = t;
      tone(260, 175, 0.25, 0.06, 0.02, 0.45, 450, 0.5, t);
      tone(390, 260, 0.2, 0.02, 0.02, 0.3, 700, 0.4, t);
    },

    // Новая жизнь: тихое восходящее A–E–A
    rebirth() {
      if (!live()) return;
      const t = ac.currentTime;
      [220, 329.6, 440].forEach((f, i) => tone(f, f, 0.01, 0.045, 0.08, 1.2, 1500, 0.9, t + i * 0.14));
    },

    // Изредка где-то вдалеке всплывает пузырёк — почти один только хвост
    tick(dt) {
      if (!live() || !CONFIG.ambience) return;
      bubbleT -= dt;
      if (bubbleT > 0) return;
      bubbleT = 2 + Math.random() * 5;
      const f = 300 + Math.random() * 300;
      tone(f, f * 1.15, 0.15, 0.008, 0.02, 0.2, 900, 1.5, ac.currentTime);
    },
  };
})();

// ============================================================================
// Ввод: мышь и палец через pointer events
// ============================================================================

let activePointer = null;

cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  Sound.unlock();
  if (menuOpen) { closeMenu(); return; }
  if (dead) {
    if (deadT > 0.5) restart();         // тап-рестарт, но не тот же тап, что пришёлся на смерть
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
cv.addEventListener('pointerup', e => { Sound.unlock(); release(e); });   // старым iOS нужен именно отпуск
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
  Sound.unlock();
  if (e.code === 'Escape' && menuOpen) closeMenu();
  if (e.code === 'KeyD' && !menuOpen) setDebug(!debug);
  if (dead && deadT > 0.5 && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR')) restart();
});

document.addEventListener('visibilitychange', () => {
  last = performance.now();
  perf.hold = 1;                        // первые кадры после возврата бывают рваными — не мерить
  release();
  if (document.hidden) Sound.sleep(); else Sound.update();
});

// Выстрел каплей в сторону точки экрана (sx, sy). Клетка отдаёт каплю своей массы,
// импульс сохраняется: (M − dm)·v' + dm·(v + u·n) = M·v  →  v' = v − n·u·dm / (M − dm)
function eject(sx, sy) {
  const p = player;
  if (dead || p.dead || p.eatenBy || p.r < CONFIG.ejectMinRadius) return false;
  const px = (p.x - cam.x) * cam.zoom + W / 2, py = (p.y - cam.y) * cam.zoom + H / 2;
  const dx = sx - px, dy = sy - py, d = Math.hypot(dx, dy);
  if (d <= p.r * cam.zoom + CONFIG.deadZone) return false;    // тап по самой клетке — мимо
  const nx = dx / d, ny = dy / d;

  if (net.role === 'client') {
    // Выстрелит хост, капля придёт со снимком; отклик пальцу — сразу
    netTap(nx, ny);
    const g = p.r + 2;
    puff(p.x + nx * g, p.y + ny * g, nx, ny, p.vx, p.vy, p.r);
  } else ejectCell(p, nx, ny);
  ripple(sx, sy);
  Sound.eject(p.r);
  p.flash = Math.min(1, p.flash + 0.25);
  shots++;
  return true;
}

// Сама физика выстрела — для любого игрока, в том числе гостя на хосте
function ejectCell(p, nx, ny) {
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

  puff(m.x, m.y, nx, ny, p.vx, p.vy, p.r);
  trimMotes();
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
  for (const c of cells) if (c.isPlayer && !c.eatenBy) coast(c, h);
}

function coast(p, h) {
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
  const ai = CONFIG.enemyAI !== 'drift';
  for (const c of cells) {
    if (c.isPlayer || c.eatenBy) continue;
    if (c.grace > 0) c.grace -= h;
    const k = expK(h, c.steer);          // у капли своя, быстрая вязкость
    c.wander += (Math.random() * 2 - 1) * jitter;
    // Капли всегда просто дрейфуют; организмы — к скорости, выбранной в think
    const own = c.bact || (ai && !c.mote);
    const tx = own ? c.tx : Math.cos(c.wander) * c.cruise;
    const ty = own ? c.ty : Math.sin(c.wander) * c.cruise;
    c.vx += (tx - c.vx) * k;
    c.vy += (ty - c.vy) * k;
  }
}

// ============================================================================
// Поведение организмов (CONFIG.enemyAI). Раз в aiThink с каждый организм выбирает
// желаемую скорость (tx, ty), а stepDrifters плавно к ней подтягивает — с той же
// ленью steerTime, что и дрейф, так что вес и инерция не пропадают.
// Соседей ищем по сетке: организмов бывают тысячи, перебор всех пар не потянуть.
// Сетка — связные списки в типизированных массивах, в кадре ничего не создаётся.
// ============================================================================

const GRID = 200;                        // px: ячейка сетки соседей
let gHead = new Int32Array(0), gNext = new Int32Array(0), gN = 0, gOff = 0;
const bigs = [], near = [];              // крупнее пол-ячейки — отдельно: их край далеко от центра

function buildGrid() {
  gOff = CONFIG.worldRadius + GRID;
  gN = Math.ceil(2 * gOff / GRID);
  if (gHead.length < gN * gN) gHead = new Int32Array(gN * gN);
  if (gNext.length < cells.length) gNext = new Int32Array(cells.length * 2);
  gHead.fill(-1, 0, gN * gN);
  bigs.length = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.eatenBy) continue;
    if (c.r > GRID / 2) { bigs.push(c); continue; }
    const gx = clamp(Math.floor((c.x + gOff) / GRID), 0, gN - 1);
    const gy = clamp(Math.floor((c.y + gOff) / GRID), 0, gN - 1);
    const b = gy * gN + gx;
    gNext[i] = gHead[b]; gHead[b] = i;
  }
}

// Все, чей край ближе S к краю c, — в near
function gather(c, S) {
  near.length = 0;
  const reach = S + c.r + GRID / 2;
  const x0 = clamp(Math.floor((c.x - reach + gOff) / GRID), 0, gN - 1);
  const x1 = clamp(Math.floor((c.x + reach + gOff) / GRID), 0, gN - 1);
  const y0 = clamp(Math.floor((c.y - reach + gOff) / GRID), 0, gN - 1);
  const y1 = clamp(Math.floor((c.y + reach + gOff) / GRID), 0, gN - 1);
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      for (let i = gHead[gy * gN + gx]; i >= 0; i = gNext[i]) nearTest(c, cells[i], S);
    }
  }
  for (const o of bigs) nearTest(c, o, S);
}

function nearTest(c, o, S) {
  if (o === c) return;
  const dx = o.x - c.x, dy = o.y - c.y, rr = S + c.r + o.r;
  if (dx * dx + dy * dy < rr * rr) near.push(o);
}

// Итоговая желаемая скорость: направление (dx, dy) и модуль speed, у края мира
// направление заворачивает внутрь — иначе беглецы липнут к стенке
function aim(c, dx, dy, speed) {
  let l = Math.sqrt(dx * dx + dy * dy);
  if (l < 1e-9) { c.tx = c.ty = 0; return; }
  dx /= l; dy /= l;
  const d = Math.sqrt(c.x * c.x + c.y * c.y), edge = d + c.r - (CONFIG.worldRadius - 160);
  if (edge > 0 && d > 1) {
    const w = Math.min(edge / 160, 1) * 1.5;
    dx -= c.x / d * w; dy -= c.y / d * w;
    l = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= l; dy /= l;
  }
  c.tx = dx * speed; c.ty = dy * speed;
}

// Охота: самая выгодная добыча рядом (масса / расстояние) и бегство от всех, кто крупнее.
// Игрок для них такой же организм: мелкие от него удирают, крупные за ним гонятся.
function thinkHunt(c) {
  const S = Math.min(CONFIG.aiSense + 3 * c.r, CONFIG.aiSenseMax);
  gather(c, S);
  let fx = 0, fy = 0, fear = 0, prey = null, best = 0;
  for (const o of near) {
    const dx = o.x - c.x, dy = o.y - c.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const gap = Math.max(0, d - c.r - o.r);
    if (o.r > c.r) {
      const w = 1 - gap / S;
      fx -= dx / d * w * w; fy -= dy / d * w * w;
      if (w > fear) fear = w;
    } else if (o.r < c.r * 0.95) {
      const score = o.m / (gap + 60);
      if (score > best) { best = score; prey = o; }
    }
  }
  let dx = 0, dy = 0, boost = 1;
  if (fear > 0.1) {
    const l = Math.sqrt(fx * fx + fy * fy) || 1;
    dx += fx / l * fear * 2; dy += fy / l * fear * 2;
    boost = lerp(1, CONFIG.fleeBoost, fear);
  }
  if (prey && fear < 0.7) {
    // целимся с упреждением — туда, где добыча будет через полсекунды
    const px = prey.x + prey.vx * 0.5 - c.x, py = prey.y + prey.vy * 0.5 - c.y;
    const l = Math.sqrt(px * px + py * py) || 1;
    dx += px / l * (1 - fear); dy += py / l * (1 - fear);
    boost = Math.max(boost, CONFIG.huntBoost * (1 - fear));
  }
  if (dx === 0 && dy === 0) { dx = Math.cos(c.wander); dy = Math.sin(c.wander); }
  else c.wander = Math.atan2(dy, dx);    // потеряв цель, плывёт дальше туда же, а не рывком вбок
  aim(c, dx, dy, c.cruise * boost);
}

// Стая: плыть туда же, куда соседи своего размера, держаться их, но не вплотную —
// касание означает, что один съест другого. От заметно крупных и от игрока — в сторону.
function thinkSchool(c) {
  const S = Math.min(170 + 2 * c.r, 500);
  gather(c, S);
  let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, n = 0;
  const keep = 34 + c.r * 0.6;           // зазор, ближе которого расталкиваемся
  for (const o of near) {
    if (o.mote) continue;
    const dx = o.x - c.x, dy = o.y - c.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const gap = d - c.r - o.r;
    if (o.r > c.r * 1.4 || o.isPlayer || o.bact) {
      const zone = S * 0.7;
      if (gap < zone) { const w = 1 - Math.max(gap, 0) / zone; sx -= dx / d * w * 2; sy -= dy / d * w * 2; }
      continue;
    }
    const sp = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (sp > 1) { ax += o.vx / sp; ay += o.vy / sp; }
    cx += dx; cy += dy; n++;
    if (gap < keep) { const w = 1 - Math.max(gap, 0) / keep; sx -= dx / d * w * 3; sy -= dy / d * w * 3; }
  }
  let dx = Math.cos(c.wander) * 0.5 + sx, dy = Math.sin(c.wander) * 0.5 + sy;
  if (n > 0) {
    dx += ax / n + cx / n / S * 0.6;
    dy += ay / n + cy / n / S * 0.6;
  }
  c.wander = Math.atan2(dy, dx);         // курс стаи становится своим — одиночка его держит
  aim(c, dx, dy, c.cruise * 1.3);
}

// Водоворот: по кругу вокруг центра мира, против часовой стрелки, с лёгким
// рысканием от блуждания; у самого центра медленнее, чтобы там не мельтешило
function thinkWhirl(c) {
  const d = Math.sqrt(c.x * c.x + c.y * c.y) || 1;
  const a = Math.atan2(c.x, -c.y) + 0.45 * Math.sin(c.wander);   // касательная (−y, x) + рыскание
  const slow = 0.4 + 0.6 * Math.min(1, d / (CONFIG.worldRadius * 0.3));
  aim(c, Math.cos(a), Math.sin(a), c.cruise * CONFIG.whirlSpeed * slow);
}

function think(dt) {
  const mode = CONFIG.enemyAI;
  bacts.length = 0;
  for (const c of cells) if (c.bact && !c.eatenBy) bacts.push(c);
  if (mode === 'drift' && !bacts.length) return;
  if (mode === 'hunt' || mode === 'school' || bacts.length) buildGrid();
  const [t0, t1] = CONFIG.aiThink;
  for (const c of cells) {
    if (c.isPlayer || c.mote || c.eatenBy || (mode === 'drift' && !c.bact)) continue;
    c.think -= dt;
    if (c.think > 0) continue;
    c.think = lerp(t0, t1, Math.random());   // вразнобой: не все решают в один кадр
    if (mode === 'hunt' || c.bact) thinkHunt(c);
    else if (mode === 'school') thinkSchool(c);
    else if (mode === 'whirl') thinkWhirl(c);
    else c.tx = c.ty = 0;                   // still
  }
  if (bacts.length) grabScan(dt);
}

// ============================================================================
// Щупальца бактерий. Хватка — раз в кадр (кто ближе всех из тех, кто меньше и в
// досягаемости), тяга — на каждом подшаге: равные и противоположные силы, импульс
// сохраняется — крупная добыча тащит и саму бактерию.
// ============================================================================

const bacts = [];

function grabScan(dt) {
  for (const b of bacts) {
    for (const s of b.arms) s.ext = s.t ? Math.min(1, s.ext + dt * 7) : Math.max(0, s.ext - dt * 4);
    b.grabCd -= dt;
    if (b.grabCd > 0) continue;
    let free = null;
    for (const s of b.arms) if (!s.t) { free = s; break; }
    if (!free) continue;
    gather(b, reachOf(b));
    let best = null, bestGap = Infinity;
    for (const o of near) {
      if (o.mote || o.r >= b.r * 0.97) continue;
      let held = false;
      for (const s of b.arms) if (s.t === o) held = true;
      if (held) continue;
      const gap = Math.hypot(o.x - b.x, o.y - b.y) - b.r - o.r;
      if (gap < bestGap) { bestGap = gap; best = o; }
    }
    if (!best) continue;
    free.t = best;
    free.ext = Math.min(free.ext, 0.3);    // щупальце выстреливает заново, а не появляется целым
    b.grabCd = 0.25;                        // следующее — чуть погодя: хватают по одному
    if (best === player) Sound.grab();
    else if (best.owner) netSound(best.owner, 'grab');
  }
}

function stepTentacles(h) {
  const grip = CONFIG.bacteriaGrip, resist = CONFIG.bacteriaResist;
  for (const b of bacts) {
    for (const s of b.arms) {
      const t = s.t;
      if (!t) continue;
      if (b.eatenBy || t.eatenBy || t.dead || t.r >= b.r) { s.t = null; continue; }
      const dx = b.x - t.x, dy = b.y - t.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      if (d - b.r - t.r > reachOf(b) * CONFIG.bacteriaHold) {     // вырвалась
        s.t = null; b.grabCd = CONFIG.bacteriaCooldown;
        continue;
      }
      const nx = dx / d, ny = dy / d;
      const away = (b.vx - t.vx) * nx + (b.vy - t.vy) * ny;       // > 0 — расходятся
      const a = grip + (away > 0 ? away * resist : 0), M = b.m + t.m;
      t.vx += nx * a * b.m / M * h; t.vy += ny * a * b.m / M * h;
      b.vx -= nx * a * t.m / M * h; b.vy -= ny * a * t.m / M * h;
    }
  }
}

function capture(big, small) {
  small.eatenBy = big;
  small.offX = small.x - big.x;
  small.offY = small.y - big.y;
  small.m0 = small.m;
  // мелочь растворяется быстро, жертва почти своего размера — дольше
  small.absorbT = CONFIG.absorptionTime * clamp(0.35 + 1.3 * Math.sqrt(small.m / big.m), 0.35, 1.6);
  if (big === player) Sound.eat(small.r / big.r, small.parent === big);
  else if (small === player) Sound.death();
  if (big.owner) netSound(big.owner, 'eat', small.r / big.r, small.parent === big);
  if (small.owner) netSound(small.owner, 'death');
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
  const focus = net.role === 'client' ? net.focus
    : !player.dead ? player : (player.eatenBy && !player.eatenBy.dead ? player.eatenBy : null);
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
  if (bacts.length) stepTentacles(h);
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
  bactT -= dt;
  if (CONFIG.bacteria && bactT <= 0) {
    bactT = 3;
    let n = 0;
    for (const c of cells) if (c.bact) n++;
    const pr = player.dead ? CONFIG.playerRadius : Math.max(CONFIG.playerRadius, player.r);
    if (n < Math.round(bacteriaTotal() * CONFIG.refillShare)) spawnBact(bactRadius(pr), 400, true);
  }
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
function puff(x, y, nx, ny, vx, vy, pr) {
  const size = Math.sqrt(pr / CONFIG.playerRadius);
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
    if (c !== player) {
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
  return palette(c.isPlayer ? -1 - c.color : Math.round((clamp(c.tint, -1, 1) + 1) * 16));
}
function palette(key) {
  let p = PAL.get(key);
  if (!p) {
    const t = key / 16 - 1;
    const col = key < 0 ? PLAYER_RGB[-1 - key] || RGB_PLAYER : t < 0 ? mix(RGB_EQUAL, RGB_FOOD, -t) : mix(RGB_EQUAL, RGB_THREAT, t);
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
      ring: rgba(lc, 0.75),
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

// Бактерия: тёмное непрозрачное тело (не светится, а наоборот — затеняет всё вокруг),
// ободок по цвету угрозы с лиловым отливом, шевелящиеся щупальца, а хватающие —
// длинные, с присоской, тянутся к добыче
const RGB_BACT = [140, 88, 170], RGB_DEEP = [14, 8, 20];
const BACT_PAL = new Map();
const SHADOW = sprite(128, [[0, 'rgba(0,0,0,0.6)'], [0.45, 'rgba(0,0,0,0.4)'], [1, 'rgba(0,0,0,0)']]);
const IDLE_ARMS = 9;

function bactPaletteOf(c) {
  const key = Math.round((clamp(c.tint, -1, 1) + 1) * 16);
  let p = BACT_PAL.get(key);
  if (!p) {
    const t = key / 16 - 1;
    const tc = t < 0 ? mix(RGB_EQUAL, RGB_FOOD, -t) : mix(RGB_EQUAL, RGB_THREAT, t);
    const rim = mix(RGB_BACT, tc, 0.5);
    const body = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.03);
    body.addColorStop(0, rgba(RGB_DEEP, 0.95));
    body.addColorStop(0.7, rgba(mix(RGB_DEEP, rim, 0.1), 0.95));
    body.addColorStop(0.93, rgba(mix(RGB_DEEP, rim, 0.35), 0.95));
    body.addColorStop(1, rgba(mix(RGB_DEEP, rim, 0.6), 0.95));
    p = {
      body,
      rim: rgba(rim, 0.85),
      arm: rgba(mix(rim, RGB_DEEP, 0.35), 0.85),
      grab: rgba(light(rim), 0.9),
      gran: rgba(rim, 0.4),
      dot: rgba(rim, 0.8),
    };
    BACT_PAL.set(key, p);
  }
  return p;
}

function drawBact(c, pal, a) {
  const sr = c.sr, z = cam.zoom;
  ctx.globalAlpha = a;
  if (sr < 2.5) {
    ctx.fillStyle = pal.dot;
    ctx.beginPath(); ctx.arc(c.sx, c.sy, Math.max(sr, 1), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  const R = sr * 1.9;
  ctx.drawImage(SHADOW, c.sx - R, c.sy - R, R * 2, R * 2);
  ctx.lineCap = 'round';

  // Щупальца в покое: короткие, колышутся, на ходу их сносит назад
  if (sr > 5) {
    const L = reachOf(c) * 0.45 * z;
    let lx = -c.svx * 0.12 * z, ly = -c.svy * 0.12 * z;
    const ll = Math.sqrt(lx * lx + ly * ly);
    if (ll > L * 0.6) { lx *= L * 0.6 / ll; ly *= L * 0.6 / ll; }
    ctx.strokeStyle = pal.arm;
    ctx.lineWidth = Math.max(1, sr * 0.07);
    ctx.beginPath();
    for (let i = 0; i < IDLE_ARMS; i++) {
      const th = i / IDLE_ARMS * TAU + c.ph + 0.15 * Math.sin(time * 0.7 + i);
      const sway = 0.5 * Math.sin(time * 2.6 + i * 1.9 + c.ph);
      const a1 = th + sway * 0.5, a2 = th + sway;
      ctx.moveTo(c.sx + Math.cos(th) * sr * 0.9, c.sy + Math.sin(th) * sr * 0.9);
      ctx.quadraticCurveTo(
        c.sx + Math.cos(a1) * (sr + L * 0.5) + lx * 0.4, c.sy + Math.sin(a1) * (sr + L * 0.5) + ly * 0.4,
        c.sx + Math.cos(a2) * (sr + L) + lx, c.sy + Math.sin(a2) * (sr + L) + ly);
    }
    ctx.stroke();
  }

  // Хватающие: от тела до мембраны добычи, извиваются; отпустив — втягиваются
  ctx.strokeStyle = ctx.fillStyle = pal.grab;
  ctx.lineWidth = Math.max(1.2, sr * 0.09);
  for (let k = 0; k < c.arms.length; k++) {
    const s = c.arms[k];
    if (s.t) {
      const dx = s.t.x - c.x, dy = s.t.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
      s.ang = Math.atan2(dy, dx);
      s.len = Math.max(c.r, d - s.t.r * 0.7);
    }
    if (s.ext < 0.02) continue;
    const cs = Math.cos(s.ang), sn = Math.sin(s.ang);
    const len = Math.max(sr, s.len * z * s.ext);
    const x0 = c.sx + cs * sr * 0.8, y0 = c.sy + sn * sr * 0.8;
    const x2 = c.sx + cs * len, y2 = c.sy + sn * len;
    const wig = Math.sin(time * 7 + k * 2.1 + c.ph) * (len - sr * 0.8) * 0.18;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x2) / 2 - sn * wig, (y0 + y2) / 2 + cs * wig, x2, y2);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x2, y2, Math.max(1.6, sr * 0.08), 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'butt';

  // Тело — поверх корней щупалец
  ctx.save();
  ctx.translate(c.sx, c.sy);
  ctx.rotate(c.ang);
  const st = 1 + c.st;
  ctx.scale(st * sr, sr / st);
  membrane(sr, c.ph);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.lineWidth = Math.max(1, sr * 0.05) / sr;
  ctx.strokeStyle = pal.rim;
  ctx.stroke();
  ctx.restore();

  // Гранулы внутри вместо ядра
  if (sr > 6) {
    ctx.fillStyle = pal.gran;
    const gs = Math.max(0.8, sr * 0.06);
    for (let k = 0; k < 5; k++) {
      const an = c.ph * (k + 2) + time * 0.2 * (k & 1 ? 1 : -1);
      const rr = sr * (0.2 + 0.1 * k);
      ctx.beginPath(); ctx.arc(c.sx + Math.cos(an) * rr, c.sy + Math.sin(an) * rr, gs, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Чужой игрок — своим цветом, а съедобен он или опасен — тонким кольцом вокруг
function drawThreatRing(c) {
  ctx.globalAlpha = alphaOf(c) * 0.7;
  ctx.strokeStyle = palette(Math.round((clamp(c.tint, -1, 1) + 1) * 16)).ring;
  ctx.lineWidth = Math.max(1.2, c.sr * 0.06);
  ctx.beginPath(); ctx.arc(c.sx, c.sy, c.sr * 1.2 + 2, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
}

const byRadius = (a, b) => a.r - b.r;

function drawCells() {
  const z = cam.zoom;
  for (const c of cells) {
    c.sx = (c.x - cam.x) * z + W / 2;
    c.sy = (c.y - cam.y) * z + H / 2;
    c.sr = c.r * z;
    const m = c.sr * 2.5 + 4 + (c.bact ? reachOf(c) * 1.7 * z : 0);   // у бактерии — и щупальца
    c.vis = c.sx > -m && c.sx < W + m && c.sy > -m && c.sy < H + m && c.sr > 0.2;
  }
  // мелкие снизу: жертва видна сквозь полупрозрачного хищника, пока растворяется
  // сортируются только видимые: на большой карте их десятки из тысяч
  order.length = 0;
  for (const c of cells) if (c.vis) order.push(c);
  order.sort(byRadius);

  const minGlow = QUALITY[perf.q].detail ? 2 : 4;
  ctx.globalCompositeOperation = 'lighter';
  for (const c of order) if (c.vis && !c.bact && c.sr > minGlow) drawGlow(c, paletteOf(c), alphaOf(c));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const c of order) {
    if (!c.vis) continue;
    if (c.bact) drawBact(c, bactPaletteOf(c), alphaOf(c));
    else drawBody(c, paletteOf(c), alphaOf(c));
    if (c.isPlayer && c !== player && c.sr > 2.5) drawThreatRing(c);
  }
}

let PART_COLOR = rgba(RGB_PLAYER, 0.45), RIPPLE_COLOR = rgba(RGB_PLAYER, 0.4);   // у гостя — его цвет

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

// Зум плавно, в логарифме: приближение и отдаление идут с одинаковой скоростью
function easeZoom(dt) {
  const tz = targetZoom();
  cam.zoom = Math.exp(lerp(Math.log(cam.zoom), Math.log(tz), expK(dt, CONFIG.zoomSmoothness)));
  return Math.abs(Math.log(cam.zoom / tz));   // сколько ещё осталось
}

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
  // Исключение — зум: переключили его в меню, и камера сразу плавно доезжает до нового
  // масштаба за меню, пока мир стоит. Доехала — цикл засыпает.
  if (menuOpen && !net.role) {          // общий мир не ставится на паузу
    const dt = Math.min(Math.max((now - last) / 1000, 0), CONFIG.maxFrameDt);
    last = now;
    if (easeZoom(dt) < 0.002) { looping = false; return; }
    render(0);
    requestAnimationFrame(frame);
    return;
  }

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
  if (net.role === 'client') netApply(dt);          // мир считает хост — здесь только его снимки
  else if (dt > 0) {
    think(dt);
    const n = Math.ceil(dt / CONFIG.maxStep), h = dt / n;
    for (let i = 0; i < n; i++) step(h);
  }
  time += dt;

  easeZoom(dt);

  updateParticles(dt);
  updateVisuals(dt);
  Sound.tick(dt);
  if (net.role !== 'client') repopulate(dt);
  if (net.role) netTick(dt);
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
      `js     ${perf.work.toFixed(2)} ms/frame` +
      (net.role ? `\nnet    ${netDebug()}` : '');
  }
  requestAnimationFrame(frame);
}

// ============================================================================
// Меню настроек — кнопка в правом нижнем углу. Пока оно открыто, игра на паузе.
// Настройки запоминаются в localStorage этого браузера.
// ============================================================================

const menuBtn = $('menuBtn'), menuEl = $('menu'), newBtn = $('b-new'), sepEl = $('sep-world');
// v2: храним только отличия от умолчаний. В v1 лежали все значения разом, и новые
// умолчания (например, баланс Normal) не доходили до тех, кто хоть раз тронул меню.
const SAVE_KEY = 'abstract-cell-settings-v2';
try { localStorage.removeItem('abstract-cell-settings'); } catch (e) {}
// Ползунок: линейный (значение = позиция · k) или логарифмический (log: [от, до],
// позиция 0…LOG_STEPS) — там, где диапазон в десятки раз: иначе умолчание оказалось
// бы у самого края, и малые значения было бы не выставить пальцем
const LOG_STEPS = 1000;
const SLIDERS = [
  { id: 'eject',   key: 'ejectMassFraction', k: 0.01, fmt: v => `${+(v * 100).toFixed(2)}%` },
  { id: 'enemies', key: 'enemyDensity',      log: [0.1, 20], round: v => +v.toPrecision(2), world: true,
    fmt: v => { const n = enemyTotal(); return `${v}× · ${n} cells${n >= CONFIG.maxEnemies ? ' (max)' : ''}`; } },
  { id: 'diff',    key: 'difficulty',        k: 0.01, world: true,
    fmt: v => `${['Easy', 'Normal', 'Hard', 'Brutal'][v < 0.3 ? 0 : v < 0.65 ? 1 : v < 0.9 ? 2 : 3]} · ${Math.round(v * 100)}%` },
  { id: 'map',     key: 'worldRadius',       log: [600, 13500], round: v => Math.round(v / 50) * 50, world: true,
    fmt: v => `${(v / DEFAULTS.worldRadius).toFixed(1)}×` },
  { id: 'maxe',    key: 'maxEnemySize',      log: [0.5, 30], round: v => +v.toPrecision(2), world: true,
    fmt: v => `${v < 10 ? v.toFixed(1) : Math.round(v)}× you` },
];
const toUI = (sl, v) => sl.log
  ? Math.round(Math.log(v / sl.log[0]) / Math.log(sl.log[1] / sl.log[0]) * LOG_STEPS) : v / sl.k;
const fromUI = (sl, u) => sl.log
  ? sl.round(sl.log[0] * Math.pow(sl.log[1] / sl.log[0], u / LOG_STEPS)) : +(u * sl.k).toFixed(6);
function limits(sl) {
  const el = $('s-' + sl.id);
  return sl.log || [el.min * sl.k, el.max * sl.k];
}
// Поведение организмов — действует сразу, без нового мира
const AI_MODES = {
  drift:  'Wander on their own',
  hunt:   'Chase smaller cells, flee from bigger — you included',
  school: 'Swim in schools with cells of their size',
  whirl:  'The whole liquid swirls around the center',
  still:  'Stay put until something pushes them',
};
const aiInputs = menuEl.querySelectorAll('input[name="ai"]');
const SAVED_KEYS = ['ejectMassFraction', 'cameraAutoZoom', 'sound', 'ambience', 'enemyDensity', 'difficulty',
  'worldRadius', 'maxEnemySize', 'enemyAI', 'bacteria'];
const SWITCHES = { zoom: 'cameraAutoZoom', sound: 'sound', amb: 'ambience', bact: 'bacteria' };   // id переключателя → ключ
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
  for (const k of SAVED_KEYS) {
    const v = k in net.localCfg ? net.localCfg[k] : CONFIG[k];   // у гостя — свои, не хостовы
    if (v !== DEFAULTS[k]) data[k] = v;
  }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadSettings() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  if (!data || typeof data !== 'object') return;
  for (const sl of SLIDERS) {
    if (!(sl.key in data)) continue;
    const [lo, hi] = limits(sl), v = Number(data[sl.key]);
    if (Number.isFinite(v)) CONFIG[sl.key] = clamp(v, lo, hi);
  }
  for (const key of Object.values(SWITCHES)) if (typeof data[key] === 'boolean') CONFIG[key] = data[key];
  if (data.enemyAI in AI_MODES) CONFIG.enemyAI = data.enemyAI;
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
    $('s-' + sl.id).value = toUI(sl, CONFIG[sl.key]);
    $('o-' + sl.id).textContent = sl.fmt(CONFIG[sl.key]);
  }
  for (const el of aiInputs) el.checked = el.value === CONFIG.enemyAI;
  $('o-ai').textContent = AI_MODES[CONFIG.enemyAI];
  for (const [id, key] of Object.entries(SWITCHES)) $('s-' + id).checked = CONFIG[key];
  $('s-amb').disabled = !CONFIG.sound;
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
    CONFIG[sl.key] = fromUI(sl, Number(e.target.value));
    for (const o of SLIDERS) $('o-' + o.id).textContent = o.fmt(CONFIG[o.key]);
    markPending();
    saveSettings();
  });
}
$('s-zoom').addEventListener('change', e => {
  CONFIG.cameraAutoZoom = e.target.checked;
  saveSettings();
  startLoop();                          // на паузе — только ради плавной смены масштаба
});
for (const id of ['sound', 'amb']) {
  $('s-' + id).addEventListener('change', e => {
    CONFIG[SWITCHES[id]] = e.target.checked;
    $('s-amb').disabled = !CONFIG.sound;
    saveSettings();
    Sound.unlock();                     // переключатель — тоже жест: можно будить звук
    Sound.update();
  });
}
for (const el of aiInputs) {
  el.addEventListener('change', () => {
    if (!el.checked) return;
    CONFIG.enemyAI = el.value;
    for (const c of cells) c.think = Math.random() * 0.2;   // новое поведение — за пару кадров, вразнобой
    $('o-ai').textContent = AI_MODES[el.value];
    saveSettings();
  });
}
$('s-bact').addEventListener('change', e => {
  CONFIG.bacteria = e.target.checked;
  setBacteria(CONFIG.bacteria);         // сразу, без нового мира
  saveSettings();
  render(0);                            // на паузе кадр сам не нарисуется
});
$('s-debug').addEventListener('change', e => { setDebug(e.target.checked); saveSettings(); });
$('b-defaults').addEventListener('click', () => {
  const hadBact = CONFIG.bacteria;
  Object.assign(CONFIG, DEFAULTS);
  if (net.role === 'client') netAfterDefaults();
  if (CONFIG.bacteria !== hadBact) { setBacteria(CONFIG.bacteria); render(0); }
  syncMenu();
  saveSettings();
  Sound.unlock();
  Sound.update();
  startLoop();                          // зум мог поменяться — пусть доедет за меню
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

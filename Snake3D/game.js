/* Snakes 3D: a browser port of the N-Snakes Unity remake. Three.js r158 (MIT). */
(() => {
  'use strict';
  const T = THREE;
  T.ColorManagement.enabled = false;
  const DATA = window.NSNAKES_DATA;
  const $ = id => document.getElementById(id);
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * clamp01(t);
  const mod = (a, n) => ((a % n) + n) % n;
  const pad2 = n => String(Math.max(0, n | 0)).padStart(2, '0');
  const formatTime = s => `${pad2(s / 60)}:${pad2(s % 60)}`;
  const DEG = Math.PI / 180;

  // ---------------------------------------------------------------- constants
  // Values come from the serialized scene components of the Unity build.
  const FIXED_DT = 0.02;
  const PLAYER = {accel: 8, returning: 2, org: 4, max: 12, min: 2, startDelay: 10, goStage1: 5, goStage2: 10, sizeBegin: 4, up: 0.5};
  const CAMERA = {startRotation: 360, rotatingSpeed: 30, speed: 4, speedRev: 4, shakeDuration: 0.15, shakeMagnitude: 0.1,
    height: 4.64, back: 4.5, pitch: 44.54 * DEG, fov: 60, bloom: 2.5};
  const RANGE = 12;          // MapGenerator.RenderingRange 25 around the head
  const DATA_OFFSET = 12;    // world cell x maps to data column x + RenderingRange / 2
  const SCORE_POWER = 10, SCORE_ENERGY = 5;
  const CONTROL = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  const HEX_CONTROL = [[0, 1], [1, 2], [1, -2], [0, -1], [-1, -2], [-1, 2]];
  const MAPS = [
    {key: 'square', name: 'Level 0', kind: 'Initial', hex: false},
    {key: 'hex', name: 'Level 1', kind: 'Hexagone', hex: true}
  ];
  const TOP = 0, BOTTOM = 1;
  // HightLightFade.fadingEvaluation: two-key Hermite curve.
  const glowCurve = t => {
    const t2 = t * t, t3 = t2 * t;
    return (t3 - 2 * t2 + t) * 0.27056 + (-2 * t3 + 3 * t2) + (t3 - t2) * 2.28054;
  };

  // ---------------------------------------------------------------- map data
  function decode(s) {
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  class MapData {
    constructor(src, hex) {
      this.hex = hex;
      this.w = src.w;
      this.h = src.h;
      this.zPeriod = hex ? src.h - 1 : src.h;
      const top = decode(src.env), bottom = decode(src.revEnv);
      this.env = [new Int8Array(top.length), new Int8Array(bottom.length)];
      for (let i = 0; i < top.length; i++) { this.env[0][i] = top[i] - 1; this.env[1][i] = bottom[i] - 1; }
      this.pristine = this.env.map(a => a.slice());
      this.color = [decode(src.color), decode(src.revColor)];
      this.levels = src.levels;
      this.start = src.start;
    }
    reset() { this.env = this.pristine.map(a => a.slice()); }
    dataX(wx) { return mod(Math.round(wx) + DATA_OFFSET, this.w); }
    index(wx, wz) {
      const dx = this.dataX(wx);
      let fz = wz + DATA_OFFSET;
      if (this.hex && (dx & 1)) fz += 0.5;
      return dx * this.h + mod(Math.round(fz), this.zPeriod);
    }
    value(side, idx) { return this.env[side][idx]; }
    isVoid(wx, wz) { return this.env[TOP][this.index(wx, wz)] === -1; }
    // World position of a data cell closest to a reference point (the map repeats).
    worldOf(dx, dy, nearX, nearZ, out) {
      let x = dx - DATA_OFFSET;
      let z = dy - DATA_OFFSET - (this.hex && (dx & 1) ? 0.5 : 0);
      x += this.w * Math.round((nearX - x) / this.w);
      z += this.zPeriod * Math.round((nearZ - z) / this.zPeriod);
      out.x = x; out.z = z;
      return out;
    }
  }

  // ---------------------------------------------------------------- persistence
  class Save {
    constructor() {
      const defaults = {music: 1, sfx: 1, grading: 'on', topRecord: {}, bestScore: {}, lastLevel: {}, lastMap: 'square'};
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem('nsnakes-save')); } catch (e) { stored = null; }
      this.data = Object.assign(defaults, stored || {});
      delete this.data.quality;
    }
    write() { try { localStorage.setItem('nsnakes-save', JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } }
  }

  // ---------------------------------------------------------------- audio
  // MusicManager: one music source, one effect source (a new effect cuts the previous one) and
  // one looping source for the power-chain buzz.
  class AudioManager {
    constructor(save) {
      this.save = save;
      this.ctx = null;
      this.buffers = {};
      this.fallback = {};
      this.current = null;
      this.loop = null;
      this.loopStopTimer = 0;
      this.files = {energy: 'EnergyPickUp.wav', power: 'PowerPickUp_single.wav', spike: 'SpikeHit.wav', obstacle: 'ObstecleHit.wav',
        boost: 'Boost.wav', group: 'GroupComplete.wav', explosion: 'explosion.wav'};
      this.gameMusic = this.music('audio/GameMusic.mp3', 0.37);
      this.menuMusic = this.music('audio/MainMusic.mp3', 0.49);
      this.pauseMusic = this.music('audio/MainMusic.mp3', 0.37);
      this.unlocked = false;
    }
    music(src, volume) {
      const el = new Audio(src);
      el.loop = true;
      el.preload = 'auto';
      el.baseVolume = volume;
      return el;
    }
    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        this.applyVolumes();
        for (const [id, file] of Object.entries(this.files)) {
          fetch(`audio/${file}`).then(r => r.arrayBuffer()).then(b => this.ctx.decodeAudioData(b)).then(buf => { this.buffers[id] = buf; })
            .catch(() => { this.fallback[id] = new Audio(`audio/${file}`); });
        }
      } catch (e) {
        this.ctx = null;
      }
      this.applyVolumes();
      if (this.wantMusic) this.playMusic(this.wantMusic);
    }
    applyVolumes() {
      const m = this.save.data.music, s = this.save.data.sfx;
      for (const el of [this.gameMusic, this.menuMusic, this.pauseMusic]) el.volume = clamp01(el.baseVolume * m);
      if (this.sfxGain) this.sfxGain.gain.value = s;
    }
    playMusic(el) {
      this.wantMusic = el;
      for (const other of [this.gameMusic, this.menuMusic, this.pauseMusic]) if (other !== el) other.pause();
      if (!el || !this.unlocked || this.hidden) return;
      if (el.paused) el.play().catch(() => {});
    }
    // A hidden page stays silent; the wanted track resumes when the page is shown again.
    setHidden(hidden) {
      this.hidden = hidden;
      if (hidden) for (const el of [this.gameMusic, this.menuMusic, this.pauseMusic]) el.pause();
      else if (this.wantMusic) this.playMusic(this.wantMusic);
    }
    restartMusic(el) {
      try { el.currentTime = 0; } catch (e) { /* not loaded yet */ }
      this.playMusic(el);
    }
    stopMusic() { this.playMusic(null); }
    source(id, volume, loop) {
      if (!this.ctx || !this.buffers[id]) return null;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const src = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      src.buffer = this.buffers[id];
      src.loop = loop;
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.sfxGain);
      src.start();
      return src;
    }
    play(id) {
      if (!this.unlocked) return;
      if (this.current) { try { this.current.stop(); } catch (e) { /* already stopped */ } this.current = null; }
      const src = this.source(id, 0.49, false);
      if (src) { this.current = src; return; }
      const el = this.fallback[id];
      if (el) { el.volume = clamp01(0.49 * this.save.data.sfx); el.currentTime = 0; el.play().catch(() => {}); }
    }
    startLoop() {
      if (this.loop || !this.unlocked) return;
      this.loop = this.source('power', 0.514, true);
      if (!this.loop) {
        const el = this.fallback.power;
        if (el) { el.loop = true; el.volume = clamp01(0.514 * this.save.data.sfx); el.play().catch(() => {}); this.loop = {stop: () => { el.pause(); el.loop = false; }}; }
      }
    }
    stopLoop(delay = 0.4) {
      if (!this.loop) return;
      clearTimeout(this.loopStopTimer);
      this.loopStopTimer = setTimeout(() => this.killLoop(), delay * 1000);
    }
    killLoop() {
      clearTimeout(this.loopStopTimer);
      if (this.loop) { try { this.loop.stop(); } catch (e) { /* already stopped */ } }
      this.loop = null;
    }
    stopEffects() {
      if (this.current) { try { this.current.stop(); } catch (e) { /* already stopped */ } }
      this.current = null;
      this.killLoop();
    }
  }

  // ---------------------------------------------------------------- post processing
  // Port of the PostProcessing v2 profile: Bloom (2.5, threshold 0.78, knee 0.257), Vignette
  // (0.593 / 0.281 / 0.41), HDR colour grading with a custom tone curve, white balance -87/-80,
  // gamma 0.317 and gain 1.0, and the chromatic aberration used while boosting.
  function hableCurve() {
    const toeStrength = 0, toeLength = Math.pow(0.5, 2.2), shoulderStrength = 1e-5, shoulderLength = 0.5, shoulderAngle = 0, gamma = 1;
    const x0 = toeLength * 0.5, y0 = (1 - toeStrength) * x0, remainingY = 1 - y0, initialW = x0 + remainingY;
    const y1Offset = (1 - shoulderStrength) * remainingY, x1 = x0 + y1Offset, y1 = y0 + y1Offset;
    const W = initialW + (Math.pow(2, shoulderLength) - 1);
    const p = {x0: x0 / W, y0, x1: x1 / W, y1, overshootX: (W * 2 * shoulderAngle * shoulderLength) / W, overshootY: 0.5 * shoulderAngle * shoulderLength};
    const m = (p.y1 - p.y0) / (p.x1 - p.x0), b = p.y0 - p.x0 * m;
    const mid = {offX: -(b / m), offY: 0, sx: 1, sy: 1, lnA: gamma * Math.log(m), B: gamma};
    const deriv = x => gamma * m * Math.pow(m * x + b, gamma - 1);
    const toeM = deriv(p.x0), shoulderM = deriv(p.x1);
    const py0 = Math.max(1e-5, Math.pow(p.y0, gamma)), py1 = Math.max(1e-5, Math.pow(p.y1, gamma));
    const overY = Math.pow(1 + p.overshootY, gamma) - 1;
    const solve = (x, y, slope) => { const B = (slope * x) / y; return {lnA: Math.log(y) - B * Math.log(x), B}; };
    const toeAB = solve(p.x0, py0, toeM);
    const toe = {offX: 0, offY: 0, sx: 1, sy: 1, lnA: toeAB.lnA, B: toeAB.B};
    const shX = (1 + p.overshootX) - p.x1, shY = (1 + overY) - py1;
    const shAB = solve(shX, shY, shoulderM);
    const sho = {offX: 1 + p.overshootX, offY: 1 + overY, sx: -1, sy: -1, lnA: shAB.lnA, B: shAB.B};
    const evalSeg = (s, x) => { const x0e = (x - s.offX) * s.sx; const y = x0e > 0 ? Math.exp(s.lnA + s.B * Math.log(x0e)) : 0; return y * s.sy + s.offY; };
    const inv = 1 / evalSeg(sho, 1);
    for (const s of [toe, mid, sho]) { s.offY *= inv; s.sy *= inv; }
    const v4 = s => new T.Vector4(s.offX, s.offY, s.sx, s.sy), v2 = s => new T.Vector2(s.lnA, s.B);
    return {curve: new T.Vector3(1 / W, p.x0, p.x1), toeA: v4(toe), toeB: v2(toe), midA: v4(mid), midB: v2(mid), shoA: v4(sho), shoB: v2(sho)};
  }

  function colorBalance(temperature, tint) {
    const t1 = temperature / 60, t2 = tint / 60;
    const x = 0.31271 - t1 * (t1 < 0 ? 0.1 : 0.05);
    const y = 2.87 * x - 3 * x * x - 0.27509507 + t2 * 0.05;
    const X = x / y, Z = (1 - x - y) / y;
    const L = 0.7328 * X + 0.4296 - 0.1624 * Z, M = -0.7036 * X + 1.6975 + 0.0061 * Z, S = 0.003 * X + 0.0136 + 0.9834 * Z;
    return new T.Vector3(0.949237 / L, 1.03542 / M, 1.08728 / S);
  }

  const FULLSCREEN_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const BLOOM_COMMON = `
    varying vec2 vUv; uniform sampler2D tMain; uniform vec2 texel;
    vec4 box13(vec2 uv){
      vec4 A=texture2D(tMain,uv+texel*vec2(-1.,-1.)); vec4 B=texture2D(tMain,uv+texel*vec2(0.,-1.)); vec4 C=texture2D(tMain,uv+texel*vec2(1.,-1.));
      vec4 D=texture2D(tMain,uv+texel*vec2(-.5,-.5)); vec4 E=texture2D(tMain,uv+texel*vec2(.5,-.5));
      vec4 F=texture2D(tMain,uv+texel*vec2(-1.,0.)); vec4 G=texture2D(tMain,uv); vec4 H=texture2D(tMain,uv+texel*vec2(1.,0.));
      vec4 I=texture2D(tMain,uv+texel*vec2(-.5,.5)); vec4 J=texture2D(tMain,uv+texel*vec2(.5,.5));
      vec4 K=texture2D(tMain,uv+texel*vec2(-1.,1.)); vec4 L=texture2D(tMain,uv+texel*vec2(0.,1.)); vec4 M=texture2D(tMain,uv+texel*vec2(1.,1.));
      vec2 d = vec2(0.5, 0.125) * 0.25;
      vec4 o = (D+E+I+J)*d.x; o += (A+B+G+F)*d.y; o += (B+C+H+G)*d.y; o += (F+G+L+K)*d.y; o += (G+H+M+L)*d.y; return o;
    }
    vec4 tent(sampler2D t, vec2 uv, vec2 ts, float scale){
      vec4 d = vec4(ts, ts) * vec4(1.,1.,-1.,0.) * scale; vec4 s;
      s  = texture2D(t, uv - d.xy); s += texture2D(t, uv - d.wy)*2.; s += texture2D(t, uv - d.zy);
      s += texture2D(t, uv + d.zw)*2.; s += texture2D(t, uv)*4.; s += texture2D(t, uv + d.xw)*2.;
      s += texture2D(t, uv + d.zy); s += texture2D(t, uv + d.wy)*2.; s += texture2D(t, uv + d.xy);
      return s * (1.0/16.0);
    }`;

  class PostProcess {
    constructor(renderer) {
      this.renderer = renderer;
      const gl = renderer.getContext();
      this.hdr = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
      this.type = this.hdr ? T.HalfFloatType : T.UnsignedByteType;
      this.samples = renderer.capabilities.isWebGL2 ? Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0) : 0;
      this.scene = null;
      this.down = [];
      this.up = [];
      this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new T.Mesh(new T.PlaneGeometry(2, 2));
      this.quad.frustumCulled = false;
      this.fsScene = new T.Scene();
      this.fsScene.add(this.quad);
      const h = hableCurve();
      this.prefilter = new T.ShaderMaterial({
        uniforms: {tMain: {value: null}, texel: {value: new T.Vector2()}, threshold: {value: new T.Vector4()}},
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: BLOOM_COMMON + `
          uniform vec4 threshold;
          void main(){
            vec4 c = min(vec4(65472.0), box13(vUv));
            float br = max(c.r, max(c.g, c.b));
            float rq = clamp(br - threshold.y, 0.0, threshold.z);
            rq = threshold.w * rq * rq;
            c *= max(rq, br - threshold.x) / max(br, 1e-4);
            gl_FragColor = vec4(c.rgb, 1.0);
          }`,
        depthTest: false, depthWrite: false
      });
      this.downsample = new T.ShaderMaterial({
        uniforms: {tMain: {value: null}, texel: {value: new T.Vector2()}},
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: BLOOM_COMMON + 'void main(){ gl_FragColor = vec4(box13(vUv).rgb, 1.0); }',
        depthTest: false, depthWrite: false
      });
      this.upsample = new T.ShaderMaterial({
        uniforms: {tMain: {value: null}, tBloom: {value: null}, texel: {value: new T.Vector2()}, scale: {value: 1}},
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: BLOOM_COMMON + `
          uniform sampler2D tBloom; uniform float scale;
          void main(){ gl_FragColor = vec4(tent(tMain, vUv, texel, scale).rgb + texture2D(tBloom, vUv).rgb, 1.0); }`,
        depthTest: false, depthWrite: false
      });
      this.uber = new T.ShaderMaterial({
        uniforms: {
          tMain: {value: null}, tBloom: {value: null}, texel: {value: new T.Vector2()}, bloomTexel: {value: new T.Vector2()},
          scale: {value: 1}, bloomIntensity: {value: 0}, caAmount: {value: 0}, grade: {value: 1},
          balance: {value: colorBalance(-87, -80)}, gain: {value: 1.8}, invGamma: {value: 1 / (1 + 0.317 * 0.8)},
          curve: {value: h.curve}, toeA: {value: h.toeA}, toeB: {value: h.toeB}, midA: {value: h.midA}, midB: {value: h.midB}, shoA: {value: h.shoA}, shoB: {value: h.shoB}
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: BLOOM_COMMON + `
          uniform sampler2D tBloom; uniform vec2 bloomTexel; uniform float scale, bloomIntensity, caAmount, grade;
          uniform vec3 balance; uniform float gain, invGamma;
          uniform vec3 curve; uniform vec4 toeA, midA, shoA; uniform vec2 toeB, midB, shoB;
          const mat3 LIN_2_LMS = mat3(3.90405e-1, 7.08416e-2, 2.31082e-2, 5.49941e-1, 9.63172e-1, 1.28021e-1, 8.92632e-3, 1.35775e-3, 9.36245e-1);
          const mat3 LMS_2_LIN = mat3(2.85847, -2.10182e-1, -4.18120e-2, -1.62879, 1.15820, -1.18169e-1, -2.48910e-2, 3.24281e-4, 1.06867);
          vec3 toLinear(vec3 c){ c = max(c, 0.0); return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
          vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, pow(c, vec3(1.0/2.4)) * 1.055 - 0.055, step(0.0031308, c)); }
          float seg(float x, vec4 a, vec2 b){ float x0 = (x - a.x) * a.z; float y0 = x0 > 0.0 ? exp(b.x + b.y * log(x0)) : 0.0; return y0 * a.w + a.y; }
          float tone(float x){ x *= curve.x; if (x < curve.y) return seg(x, toeA, toeB); if (x < curve.z) return seg(x, midA, midB); return seg(x, shoA, shoB); }
          void main(){
            vec4 color;
            if (caAmount > 0.0) {
              vec2 coords = 2.0 * vUv - 1.0;
              vec2 delta = (-coords * dot(coords, coords) * caAmount) / 3.0;
              vec3 a = texture2D(tMain, vUv).rgb, b = texture2D(tMain, vUv + delta).rgb, c = texture2D(tMain, vUv + delta * 2.0).rgb;
              color = vec4(a.r, b.g, c.b, 1.0);
            } else color = texture2D(tMain, vUv);
            vec3 col = toLinear(color.rgb);
            col += tent(tBloom, vUv, bloomTexel, scale).rgb * bloomIntensity;
            vec2 d = abs(vUv - 0.5) * 1.779;
            d = pow(clamp(d, 0.0, 1.0), vec2(3.95));
            col *= pow(clamp(1.0 - dot(d, d), 0.0, 1.0), 1.405);
            col = clamp(col, 0.0, 59.0);
            if (grade > 0.5) {
              col = LMS_2_LIN * ((LIN_2_LMS * col) * balance);
              col *= gain;
              col = sign(col) * pow(abs(col), vec3(invGamma));
              col = max(col, 0.0);
            }
            col = vec3(tone(col.r), tone(col.g), tone(col.b));
            gl_FragColor = vec4(toSRGB(col), 1.0);
          }`,
        depthTest: false, depthWrite: false
      });
    }
    target(w, h, samples) {
      return new T.WebGLRenderTarget(w, h, {type: this.type, format: T.RGBAFormat, depthBuffer: samples !== undefined, samples: samples || 0,
        minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false});
    }
    setSize(w, h) {
      if (this.scene && this.scene.width === w && this.scene.height === h) return;
      if (this.scene) this.scene.dispose();
      for (const t of [...this.down, ...this.up]) t.dispose();
      this.scene = this.target(w, h, this.samples);
      this.width = w;
      this.height = h;
      let tw = Math.max(1, Math.floor(w / 2)), th = Math.max(1, Math.floor(h / 2));
      const logs = Math.log2(Math.max(tw, th)) + 7 - 10;
      this.iterations = Math.max(1, Math.min(16, Math.floor(logs)));
      this.sampleScale = 0.5 + logs - Math.floor(logs);
      this.down = [];
      this.up = [];
      for (let i = 0; i < this.iterations; i++) {
        this.down.push(this.target(tw, th));
        if (i < this.iterations - 1) this.up.push(this.target(tw, th));   // the smallest level is never upsampled into
        tw = Math.max(1, tw >> 1);
        th = Math.max(1, th >> 1);
      }
    }
    pass(material, target) {
      this.quad.material = material;
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.fsScene, this.camera);
    }
    render(scene, camera, fx) {
      const r = this.renderer;
      r.setRenderTarget(this.scene);
      r.render(scene, camera);
      let last = this.scene;
      const lthresh = Math.pow((0.78 + 0.055) / 1.055, 2.4), knee = lthresh * 0.257 + 1e-5;
      this.prefilter.uniforms.threshold.value.set(lthresh, lthresh - knee, knee * 2, 0.25 / knee);
      for (let i = 0; i < this.iterations; i++) {
        const mat = i === 0 ? this.prefilter : this.downsample;
        mat.uniforms.tMain.value = last.texture;
        mat.uniforms.texel.value.set(1 / last.width, 1 / last.height);
        this.pass(mat, this.down[i]);
        last = this.down[i];
      }
      let lastUp = this.down[this.iterations - 1];
      for (let i = this.iterations - 2; i >= 0; i--) {
        const m = this.upsample.uniforms;
        m.tMain.value = lastUp.texture;
        m.tBloom.value = this.down[i].texture;
        m.texel.value.set(1 / lastUp.width, 1 / lastUp.height);
        m.scale.value = this.sampleScale;
        this.pass(this.upsample, this.up[i]);
        lastUp = this.up[i];
      }
      this.uber.uniforms.tBloom.value = lastUp.texture;
      this.uber.uniforms.bloomTexel.value.set(1 / lastUp.width, 1 / lastUp.height);
      const u = this.uber.uniforms;
      u.tMain.value = this.scene.texture;
      u.scale.value = this.sampleScale;
      u.bloomIntensity.value = Math.pow(2, fx.bloom / 10) - 1;
      u.caAmount.value = fx.chromatic * 0.05;
      u.grade.value = fx.grade ? 1 : 0;
      this.pass(this.uber, null);
    }
  }

  // ---------------------------------------------------------------- shaders
  // GR_Graph_Shad: a floor cell is a quad whose inner square (or hexagon) carries the colour from
  // the colouring map, with a white outline while highlighted, black distance fog and the
  // "spectro" wireframe look used during the intro and after a crash.
  const SHAPES = `
    float rectMask(vec2 uv, float s){ vec2 d = abs(uv * 2.0 - 1.0) - vec2(s); d = 1.0 - d / max(fwidth(d), vec2(1e-5)); return clamp(min(d.x, d.y), 0.0, 1.0); }
    float polyMask(vec2 uv, float s){
      vec2 p = (uv * 2.0 - 1.0) / (s * 0.8660254);
      p.y = -p.y;
      float a = atan(p.x, p.y);
      float r = 1.0471976;
      float dist = cos(floor(0.5 + a / r) * r - a) * length(p);
      return clamp((1.0 - dist) / max(fwidth(dist), 1e-5), 0.0, 1.0);
    }
    #ifdef HEX
      #define SHAPE(uv, s) polyMask(uv, s)
      vec2 tileUv(vec2 uv){ return uv * vec2(1.1, 1.0) + vec2(-0.05, 0.0); }
    #else
      #define SHAPE(uv, s) rectMask(uv, s)
      vec2 tileUv(vec2 uv){ return uv; }
    #endif
  `;

  function tileMaterial(hex) {
    return new T.ShaderMaterial({
      defines: hex ? {HEX: 1} : {},
      uniforms: {uRev: {value: 0}, uSpectro: {value: 1}, uCam: {value: new T.Vector3()}},
      vertexShader: `
        attribute vec3 iPos; attribute vec3 iTop; attribute vec3 iRev; attribute vec2 iFx;
        uniform float uRev;
        varying vec2 vUv; varying vec3 vCol; varying vec2 vFx; varying vec3 vWorld;
        void main(){
          vUv = uv; vCol = mix(iTop, iRev, uRev); vFx = iFx;
          vec3 p = position + iPos; vWorld = p;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: SHAPES + `
        uniform float uSpectro; uniform vec3 uCam;
        varying vec2 vUv; varying vec3 vCol; varying vec2 vFx; varying vec3 vWorld;
        void main(){
          vec2 uv = tileUv(vUv);
          float thick = vFx.x, inten = vFx.y;
          float inner = SHAPE(uv * 1.06 - 0.03, 0.9);
          float border = 1.0 - SHAPE(uv, 1.09 - 0.17 * thick);
          float ring = SHAPE(uv, 0.8);
          vec3 col = vCol * (1.0 + (thick + inten) * 0.7) * inner + vec3(border);
          float fog = clamp(distance(vWorld, uCam) / 18.0, 0.0, 1.0);
          col = clamp(col * (1.0 - fog), 0.0, 1.0);
          float a = border + inner;
          col = mix(col, vec3(a - ring), uSpectro);
          gl_FragColor = vec4(col, mix(a, a - ring, uSpectro));
        }`,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      extensions: {derivatives: true}
    });
  }

  // GR_Graph_Shad_Flashing_Continous: energy, power and boost cells pulse with |cos(4t)|.
  function flashMaterial(hex, instanced) {
    return new T.ShaderMaterial({
      defines: Object.assign(hex ? {HEX: 1} : {}, instanced ? {INSTANCED: 1} : {}),
      uniforms: {uTime: {value: 0}, uCol1: {value: new T.Vector3()}, uCol2: {value: new T.Vector3()}, uHL: {value: new T.Vector3()}, uHLI: {value: 1}, uThick: {value: 0}},
      vertexShader: `
        #ifdef INSTANCED
          attribute vec3 iPos; attribute vec3 iCol1; attribute vec3 iCol2; attribute vec3 iHL; attribute vec2 iFx;
        #endif
        uniform vec3 uCol1, uCol2, uHL; uniform float uHLI, uThick;
        varying vec2 vUv; varying vec3 vCol1, vCol2, vHL; varying vec2 vFx;
        void main(){
          vUv = uv;
          #ifdef INSTANCED
            vCol1 = iCol1; vCol2 = iCol2; vHL = iHL; vFx = iFx;
            gl_Position = projectionMatrix * viewMatrix * vec4(position + iPos, 1.0);
          #else
            vCol1 = uCol1; vCol2 = uCol2; vHL = uHL; vFx = vec2(uThick, uHLI);
            #ifdef USE_INSTANCING
              gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            #else
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            #endif
          #endif
        }`,
      fragmentShader: SHAPES + `
        uniform float uTime;
        varying vec2 vUv; varying vec3 vCol1, vCol2, vHL; varying vec2 vFx;
        void main(){
          vec2 uv = tileUv(vUv);
          float thick = vFx.x;
          float border = 1.0 - SHAPE(uv, 1.13 - 0.38 * thick);
          float inner = SHAPE(uv * 1.06 - 0.03, 0.8);
          vec3 c2 = mix(vCol2, vHL, thick);
          vec3 col = mix(vCol1, c2, abs(cos(uTime * 4.0))) * (1.0 + thick * (vFx.y - 1.0));
          gl_FragColor = vec4(col * inner + border * vHL, 1.0);
        }`,
      side: T.DoubleSide,
      extensions: {derivatives: true}
    });
  }

  // Obj_Shad: obstacles and spikes, lit only by the ambient probe and sky reflection, with fog.
  function propMaterial(color) {
    return new T.ShaderMaterial({
      uniforms: {uColor: {value: new T.Vector3(color, color, color)}, uCam: {value: new T.Vector3()}},
      vertexShader: `
        varying vec3 vN; varying vec3 vWorld;
        void main(){
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uCam;
        varying vec3 vN; varying vec3 vWorld;
        vec3 sky(vec3 r){ return mix(vec3(0.37, 0.35, 0.34), mix(vec3(0.62, 0.62, 0.62), vec3(0.42, 0.52, 0.66), clamp(r.y * 2.0, 0.0, 1.0)), smoothstep(-0.08, 0.04, r.y)); }
        void main(){
          vec3 n = normalize(vN);
          vec3 v = normalize(uCam - vWorld);
          if (dot(n, v) < 0.0) n = -n;
          vec3 amb = vec3(0.168, 0.211, 0.290) + n.y * vec3(-0.015, 0.024, 0.099);
          float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 4.0) * 0.5 + 0.04;
          vec3 col = uColor * 0.96 * amb + sky(reflect(-v, n)) * 0.94 * fres;
          float fog = 1.0 - clamp(distance(vWorld, uCam) / 18.0, 0.0, 1.0);
          gl_FragColor = vec4(col * fog, 1.0);
        }`,
      side: T.DoubleSide
    });
  }

  // Obj_Shad 1 with the "Skin" texture: black faces with white outlines.
  function snakeMaterial() {
    return new T.ShaderMaterial({
      uniforms: {uCam: {value: new T.Vector3()}, uWidth: {value: 0.026}},
      vertexShader: `
        attribute vec4 aEdge; attribute float aEdge2;
        varying vec4 vEdge; varying float vEdge2; varying vec3 vWorld;
        void main(){ vEdge = aEdge; vEdge2 = aEdge2; vWorld = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uCam; uniform float uWidth;
        varying vec4 vEdge; varying float vEdge2; varying vec3 vWorld;
        void main(){
          float d = min(min(min(vEdge.x, vEdge.y), min(vEdge.z, vEdge.w)), vEdge2);
          float aa = max(fwidth(d), 1e-5);
          float w = max(uWidth, aa * 0.9);
          float line = 1.0 - smoothstep(w, w + aa, d);
          float fog = 1.0 - clamp(distance(vWorld, uCam) / 18.0, 0.0, 1.0);
          gl_FragColor = vec4(vec3(line * fog), 1.0);
        }`,
      extensions: {derivatives: true}
    });
  }

  // ---------------------------------------------------------------- geometry helpers
  const V = (x, y, z) => new T.Vector3(x, y, z);
  // Unity (left-handed) to three.js (right-handed): negate z.
  const toThree = (p, out) => out.set(p.x, p.y, -p.z);

  function unitQuad() {
    const g = new T.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  // The hex floor mesh of the Unity build (radius 0.55, scaled 1.19 x 1.1), with its UVs.
  function hexTileGeometry() {
    const pts = [[0, 0.55, 0.94, 0.5], [0.476, 0.275, 0.71, 0.08], [0.476, -0.275, 0.29, 0.08], [0, -0.55, 0.06, 0.5], [-0.476, -0.275, 0.29, 0.92], [-0.476, 0.275, 0.71, 0.92]];
    const pos = [], uv = [];
    for (const [lx, ly, u, v] of pts) { pos.push(ly * 1.19, 0, -lx * 1.1); uv.push(u, v); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
    return g;
  }

  function hexPrism(radiusX, radiusZ, height, apex) {
    const ring = [];
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ring.push([Math.cos(a) * radiusX, Math.sin(a) * radiusZ]); }
    const pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    for (let i = 0; i < 6; i++) {
      const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % 6];
      if (apex) tri([x0, 0, z0], [x1, 0, z1], [0, height, 0]);
      else {
        tri([x0, 0, z0], [x1, 0, z1], [x1, height, z1]);
        tri([x0, 0, z0], [x1, height, z1], [x0, height, z0]);
        tri([0, height, 0], [x0, height, z0], [x1, height, z1]);
      }
      tri([0, 0, 0], [x1, 0, z1], [x0, 0, z0]);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  // Obs: a cube scaled to 1 x 0.49 x 1. Spike: the square pyramid scaled 1.3 x 1.3 x 0.8 and turned 45 degrees.
  function obstacleGeometry(hex, down) {
    let g;
    if (hex) g = hexPrism(0.6545 * 0.99, 0.5236 * 0.99, 0.44, false);
    else { g = new T.BoxGeometry(1, 0.49, 1).toNonIndexed(); g.translate(0, 0.254, 0); }
    g.computeVertexNormals();
    if (down) g.scale(1, -1, 1);
    return g;
  }
  function spikeGeometry(hex, down) {
    let g;
    if (hex) g = hexPrism(0.6545 * 1.04, 0.5236 * 1.04, 0.44, true);
    else {
      g = new T.ConeGeometry(0.715, 0.44, 4, 1, false);
      g.rotateY(Math.PI / 4);
      g.translate(0, 0.226, 0);
      g = g.toNonIndexed();
    }
    g.computeVertexNormals();
    if (down) g.scale(1, -1, 1);
    return g;
  }

  // Energy gem: the hexagonal prism "Cylinder" (radius 0.55, depth 0.19) at half scale.
  function gemGeometry() {
    const g = hexPrism(0.275, 0.275, 0.096, false);
    g.translate(0, -0.048, 0);
    g.rotateX(Math.PI / 2);
    return g;
  }

  // ---------------------------------------------------------------- snake mesh
  // The snake is baked from a head arrow, rhombic body segments (two per cell) and a tail spike.
  // Every face is black with a white outline, like the "Skin" texture of the original.
  class SnakeMesh {
    constructor(material) {
      this.max = 4096;
      this.pos = new Float32Array(this.max * 3);
      this.edge = new Float32Array(this.max * 4);
      this.edge2 = new Float32Array(this.max);
      this.geometry = new T.BufferGeometry();
      this.geometry.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      this.geometry.setAttribute('aEdge', new T.BufferAttribute(this.edge, 4).setUsage(T.DynamicDrawUsage));
      this.geometry.setAttribute('aEdge2', new T.BufferAttribute(this.edge2, 1).setUsage(T.DynamicDrawUsage));
      this.mesh = new T.Mesh(this.geometry, material);
      this.mesh.frustumCulled = false;
      this.count = 0;
      this.tmp = [V(), V(), V()];
    }
    begin() { this.count = 0; }
    // Adds a polygon (3..5 points); outline[i] tells whether edge i -> i+1 is drawn.
    poly(points, outline) {
      const n = points.length;
      const lines = [];
      for (let i = 0; i < n; i++) if (outline[i]) lines.push([points[i], points[(i + 1) % n]]);
      const dist = p => {
        const out = [99, 99, 99, 99, 99];
        lines.forEach(([a, b], k) => {
          const ab = this.tmp[0].subVectors(b, a), ap = this.tmp[1].subVectors(p, a);
          const len = ab.length();
          out[k] = len > 1e-6 ? this.tmp[2].crossVectors(ab, ap).length() / len : ap.length();
        });
        return out;
      };
      const d = points.map(dist);
      // Quads split on 0-2; pentagons are a quad (0,1,2,4) plus a triangle (4,2,3).
      const tris = n === 5 ? [0, 1, 2, 0, 2, 4, 4, 2, 3] : n === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
      for (const k of tris) this.vertex(points[k], d[k]);
    }
    vertex(p, d) {
      if (this.count >= this.max) return;
      const c = this.count++;
      this.pos[c * 3] = p.x; this.pos[c * 3 + 1] = p.y; this.pos[c * 3 + 2] = p.z;
      this.edge[c * 4] = d[0]; this.edge[c * 4 + 1] = d[1]; this.edge[c * 4 + 2] = d[2]; this.edge[c * 4 + 3] = d[3];
      this.edge2[c] = d[4];
    }
    end() {
      this.geometry.setDrawRange(0, this.count);
      for (const name of ['position', 'aEdge', 'aEdge2']) this.geometry.attributes[name].needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- particles
  class Particles {
    constructor(scene) {
      this.list = [];
      this.max = 400;
      // Pickup and spike debris are triangle shards (the "Cone" particle meshes of the build).
      const shard = new T.BufferGeometry();
      shard.setAttribute('position', new T.Float32BufferAttribute([-0.476, -0.117, 0.456, 0, 0.158, -0.644, 0.476, -0.117, 0.456], 3));
      const mat = new T.MeshBasicMaterial({vertexColors: false, toneMapped: false, side: T.DoubleSide});
      this.cubes = new T.InstancedMesh(shard, mat, this.max);
      this.cubes.instanceColor = new T.InstancedBufferAttribute(new Float32Array(this.max * 3), 3);
      this.cubes.frustumCulled = false;
      this.cubes.count = 0;
      // Fire, flash and smoke of the explosion: soft additive sprites.
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const ctx = cv.getContext('2d'), grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new T.CanvasTexture(cv);
      this.glows = [];
      for (let i = 0; i < 64; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false}));
        sp.visible = false;
        this.glows.push(sp);
        scene.add(sp);
      }
      scene.add(this.cubes);
      this.m = new T.Matrix4();
      this.q = new T.Quaternion();
      this.e = new T.Euler();
      this.s = V();
      this.c = new T.Color();
    }
    clear() { this.list.length = 0; this.cubes.count = 0; for (const sp of this.glows) sp.visible = false; }
    burst({at, dir, count, speed, spread, life, size, colorA, colorB, gravity = 0, glow = false, grow = 1}) {
      for (let i = 0; i < count; i++) {
        const v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
        const d = dir ? dir.clone().normalize().multiplyScalar(Math.cos(spread)).add(v.multiplyScalar(Math.sin(spread))).normalize() : v;
        const sp = Array.isArray(speed) ? speed[0] + Math.random() * (speed[1] - speed[0]) : speed;
        const sz = Array.isArray(size) ? size[0] + Math.random() * (size[1] - size[0]) : size;
        const t = Math.random();
        this.list.push({p: at.clone(), v: d.multiplyScalar(sp), age: 0, life: Array.isArray(life) ? life[0] + Math.random() * (life[1] - life[0]) : life,
          size: sz, color: [colorA[0] + (colorB[0] - colorA[0]) * t, colorA[1] + (colorB[1] - colorA[1]) * t, colorA[2] + (colorB[2] - colorA[2]) * t],
          gravity, glow, grow, rot: V(Math.random() * 6, Math.random() * 6, Math.random() * 6)});
      }
    }
    update(dt) {
      let n = 0, g = 0;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.age += dt;
        if (p.age >= p.life) { this.list.splice(i, 1); continue; }
        p.v.y -= 9.81 * p.gravity * dt;
        p.p.addScaledVector(p.v, dt);
        const k = p.age / p.life;
        if (p.glow) {
          if (g >= this.glows.length) continue;
          const s = p.size * (1 + (p.grow - 1) * k);
          const sp = this.glows[g++];
          sp.visible = true;
          sp.position.copy(p.p);
          sp.scale.set(s, s, s);
          const fade = (1 - k) * (1 - k);
          sp.material.color.setRGB(p.color[0] * fade, p.color[1] * fade, p.color[2] * fade);
        } else {
          if (n >= this.max) continue;
          const s = p.size * (1 - k);
          this.e.set(p.rot.x + p.age * 3, p.rot.y + p.age * 4, p.rot.z);
          this.m.compose(p.p, this.q.setFromEuler(this.e), this.s.set(s, s, s));
          this.cubes.setMatrixAt(n, this.m);
          this.cubes.setColorAt(n, this.c.setRGB(p.color[0], p.color[1], p.color[2]));
          n++;
        }
      }
      this.cubes.count = n;
      for (let i = g; i < this.glows.length; i++) this.glows[i].visible = false;
      this.cubes.instanceMatrix.needsUpdate = true;
      this.cubes.instanceColor.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- level / item system
  // Level (chapters) -> ItemsManager groups. A power chain only counts when all its cells are
  // taken on consecutive steps; energy cells make the snake longer.
  class Levels {
    constructor(map) {
      this.map = map;
      this.index = 0;
      this.groups = new Map();
      this.items = new Map();
      this.load(0);
    }
    key(idx, side) { return idx * 2 + side; }
    load(index) {
      this.index = index;
      this.groups.clear();
      this.items.clear();
      for (const ch of this.map.levels[index]) {
        const group = {id: ch.g, side: ch.rev ? BOTTOM : TOP, combo: ch.combo, items: []};
        this.groups.set(ch.g, group);
        for (let i = 0; i < ch.cells.length; i += 3) {
          const dx = ch.cells[i], dy = ch.cells[i + 1], v = ch.cells[i + 2];
          const idx = dx * this.map.h + dy;
          if (this.map.env[TOP][idx] !== 0) continue;
          const k = this.key(idx, group.side);
          if (this.items.has(k)) continue;
          const item = {group, type: v === 3 ? 'energy' : 'power', dx, dy, idx, side: group.side, hiddenUntil: 0, inView: false, bornAt: -10};
          group.items.push(item);
          this.items.set(k, item);
        }
      }
    }
    itemAt(idx, side) { return this.items.get(this.key(idx, side)); }
    removeGroup(group) {
      for (const it of group.items) this.items.delete(this.key(it.idx, it.side));
      this.groups.delete(group.id);
      return this.groups.size === 0;
    }
  }

  // ---------------------------------------------------------------- player (PlayerController port)
  class Player {
    constructor(game) {
      this.game = game;
      this.map = game.map;
      this.hex = this.map.hex;
      const s = this.map.start;
      this.rev = true;            // true: on top of the grid
      this.dirIndex = -1;
      this.upOffset = PLAYER.up;
      this.ci = s.ci;
      this.oldCi = s.ci;
      this.speed = 0;
      this.time = 0;
      this.returnOrgSpeed = true;
      this.slowDown = false;
      this.boost = false;
      this.boostKey = false;
      this.boostedOn = false;
      this.speedHold = false;
      this.rots = [0, 0];
      this.beenRev = false;
      this.nextTargetInvoke = false;
      this.sizeBegin = PLAYER.sizeBegin;
      this.adding = false;
      this.removing = false;
      this.removingCount = 1;
      this.tailTouched = false;
      this.isDead = false;
      this.onGame = false;
      this.combos = [];
      this.currentCombo = 0;
      const d = this.dir(this.ci);
      this.oldpos = V(s.x, this.upOffset, s.z);
      this.target = V(s.x + d[0], this.upOffset, s.z + d[1]);
      this.pos = {x: this.target.x, z: this.target.z};
      this.trail = [this.target.clone()];
      for (let i = 0; i < this.sizeBegin; i++) this.trail.push(V(s.x - d[0] * i, this.upOffset, s.z - d[1] * i));
      this.direction = V().subVectors(this.target, this.oldpos);
    }
    dir(ci) {
      if (this.hex) { const c = HEX_CONTROL[ci]; return [this.dirIndex * c[0], this.dirIndex / c[1]]; }
      const c = CONTROL[ci];
      return [this.dirIndex * c[0], this.dirIndex * c[1]];
    }
    get side() { return this.rev ? TOP : BOTTOM; }
    // Visual turns (the original names them the other way round).
    turn(visualRight) {
      if (this.beenRev) return;
      const v = visualRight ? -this.dirIndex : this.dirIndex;
      if (this.rots[0] === 0) this.rots[0] = v;
      else if (this.rots[1] === 0) this.rots[1] = v;
    }
    clearControls() { this.rots[0] = this.rots[1] = 0; }
    speedUp() { this.returnOrgSpeed = true; this.game.cameraRig.fadeAmbientIn(); }
    frameUpdate() {
      // PlayerController.Update (Android variant): boost while a key or two fingers are held.
      if (this.isDead || this.tailTouched || !this.onGame) { this.boost = false; return; }
      const held = this.boostKey || this.boost;
      if (held && !this.boostedOn) { this.game.audio.play('boost'); this.boostedOn = true; }
      if (held || (this.speedHold && !this.slowDown)) this.speedUp();
      else this.boostedOn = false;
      this.boost = false;
    }
    fixedUpdate(dt) {
      if (this.isDead) return;
      this.time += dt * this.speed;
      if (!this.returnOrgSpeed) this.speed = lerp(this.speed, PLAYER.org, dt * PLAYER.returning);
      else this.speed = lerp(this.speed, (this.boostKey && this.slowDown) ? PLAYER.org : (this.slowDown ? PLAYER.min : PLAYER.max), dt * PLAYER.accel);
      if (this.time < 1) return;
      this.step();
      this.time = 0;
    }
    step() {
      const g = this.game;
      if (!this.slowDown) this.returnOrgSpeed = false;
      g.cameraRig.fadeAmbientOut();
      if (this.adding) { this.adding = false; this.sizeBegin++; }
      else if (this.removing || this.tailTouched) {
        if (this.sizeBegin <= 5 && this.tailTouched) this.destroy();
        this.removing = false;
        this.sizeBegin -= Math.min(this.removingCount, this.sizeBegin - 1);
      }
      if (!this.rev && this.dirIndex === -1) { this.rev = true; this.upOffset = Math.abs(this.upOffset); }
      else if (this.rev && this.dirIndex === 1) { this.rev = false; this.upOffset = -Math.abs(this.upOffset); }
      this.oldpos.copy(this.target);
      const touchedBefore = this.tailTouched;
      if (!this.tailTouched) this.move();
      // Body parts follow the head one cell per step.
      let trail;
      if (!touchedBefore) trail = [this.target.clone(), ...this.trail];
      else trail = [this.trail[0], this.trail[1], this.trail[1].clone(), ...this.trail.slice(2)];
      const n = this.sizeBegin;
      while (trail.length < n + 1) trail.push(trail[trail.length - 1].clone());
      trail.length = n + 1;
      if (!touchedBefore) {
        const head = trail[1];
        for (let k = 3; k <= n - 1; k++) {
          if (trail[k].distanceToSquared(head) < 1e-6) {
            this.tailTouched = true;
            this.deathPos = head.clone();
            g.audio.stopMusic();
            g.cameraRig.startRotating();
            break;
          }
        }
      }
      this.trail = trail;
    }
    move() {
      const g = this.game;
      this.targetCalculation();
      if (this.nextTargetInvoke) { g.cameraRig.reverseInvoke(); this.nextTargetInvoke = false; }
      this.beenRev = false;
      this.obstacleHitDetect();
      this.noneHitDetect();
      this.oldCi = this.ci;
      this.pos = {x: this.target.x, z: this.target.z};
      g.onEnterCell(this.target);
      this.itemHitDetect();
      this.boostHitDetect();
      this.spikeHitDetect();
    }
    changedPos() {
      const num = this.rots[0];
      this.rots[0] = this.rots[1];
      this.rots[1] = 0;
      const len = this.hex ? 6 : 4;
      if (num) this.ci = mod(this.ci + num, len);
    }
    targetCalculation() {
      this.changedPos();
      const d = this.dir(this.ci);
      this.target.set(this.pos.x + d[0], this.upOffset, this.pos.z + d[1]);
      this.direction.subVectors(this.target, this.oldpos);
    }
    cellValue(side) { return this.map.value(side, this.map.index(this.target.x, this.target.z)); }
    obstacleHitDetect() {
      const g = this.game;
      const len = this.hex ? 6 : 4;
      const pairs = this.hex ? [[4, 2], [5, 3], [0, 4], [5, 1], [0, 2], [1, 3]] : [[3, 1], [0, 2], [1, 3], [2, 0]];
      const opposite = c => (c + len / 2) % len;
      let hit = false;
      for (let j = 0; j < len; j++) {
        if (this.cellValue(this.side) !== 1) continue;
        hit = true;
        g.cameraRig.shake();
        g.audio.play('obstacle');
        let r = Math.random() < 0.5 ? 0 : 1;
        const from = this.oldCi;
        if (j === 0) this.oldCi = opposite(from);
        let next = pairs[from][r];
        if (next === this.oldCi) { r = 1 - r; next = pairs[from][r]; }
        this.ci = next;
        this.targetCalculation();
      }
      if (hit) this.removePartsOfSnake(4);
    }
    noneHitDetect() {
      if (this.map.isVoid(this.target.x, this.target.z)) this.reverseDir();
    }
    reverseDir() {
      this.dirIndex *= -1;
      this.beenRev = true;
      this.nextTargetInvoke = true;
      this.game.cameraRig.reversing();
    }
    itemHitDetect() {
      const g = this.game;
      const idx = this.map.index(this.target.x, this.target.z);
      const it = g.levels.itemAt(idx, this.side);
      let num = 0;
      if (it) {
        if (it.group.id === this.currentCombo) { this.combos.push(it); num = it.group.id; }
        else {
          this.combos = [it];
          num = it.group.id;
          if (it.type === 'power') { g.resetMultiply(); g.audio.stopLoop(); }
        }
        if (this.combos.length === it.group.combo) {
          g.groupRemoved(it.group, it.type);
          num = 0;
          this.combos = [];
        }
        g.pickUp(it, this);
      }
      this.currentCombo = num;
      if (num === 0) { this.combos = []; g.audio.stopLoop(); }
    }
    boostHitDetect() {
      const v = this.cellValue(this.side);
      if (v === 5 || v === 6) {
        this.game.highlight(this.target);
        if (v === 5) {
          if (!this.speedHold) { this.game.audio.play('boost'); this.speedUp(); this.speedHold = true; }
        } else if (!this.slowDown) { this.returnOrgSpeed = true; this.speedHold = true; this.slowDown = true; }
      } else {
        if (this.slowDown) { this.returnOrgSpeed = false; this.speedHold = false; this.slowDown = false; }
        if (this.speedHold) this.speedHold = false;
      }
    }
    spikeHitDetect() {
      const side = this.side;
      const idx = this.map.index(this.target.x, this.target.z);
      if (this.map.value(side, idx) !== 2) return;
      const g = this.game;
      g.cameraRig.shake();
      g.audio.play('spike');
      this.removePartOfSnake();
      this.map.env[side][idx] = 0;
      g.spikeBurst(this.target, side);
    }
    removePartOfSnake() {
      if (!this.onGame) return;
      this.removingCount = 1;
      if (this.sizeBegin > 3) { this.removing = true; return; }
      this.destroy();
    }
    removePartsOfSnake(count) {
      if (!this.onGame) return;
      this.removingCount = count;
      if (this.sizeBegin - count > 2) this.removing = true;
      else if (this.sizeBegin > 3) {
        this.removingCount = this.sizeBegin - 3;
        if (this.removingCount > 0) this.removing = true; else this.removingCount = 1;
      } else { this.destroy(); this.removingCount = 1; }
    }
    addPartOfSnake() { if (this.onGame) this.adding = true; }
    destroy() {
      if (this.isDead) return;
      this.isDead = true;
      this.game.onDeath(this.deathPos || this.oldpos.clone());
    }
  }

  // ---------------------------------------------------------------- camera (CameraManager port)
  class CameraRig {
    constructor(game) {
      this.game = game;
      this.yaw = -90 * DEG;
      this.pivot = 0;
      this.reversingAngle = 0;
      this.deltaStart = CAMERA.startRotation;
      this.rotating = false;
      this.shakeTime = 0;
      this.shakeOffset = {x: 0, y: 0};
      this.chromatic = 0;
      this.bloom = CAMERA.bloom;
      this.background = 0;
      this.flashTime = -1;
      this.pos = V();
      this.pendingReverse = false;
    }
    startRotating() { this.rotating = true; }
    reversing() { this.reversingAngle += 180; }
    reverseInvoke() { this.pendingReverse = true; }
    fadeAmbientIn() { this.chromatic = 1; }
    fadeAmbientOut() { this.chromatic = 0; }
    shake() { this.shakeTime = CAMERA.shakeDuration; }
    flash(time) { this.flashTime = 0; this.flashDuration = time; }
    update(dt, follow, lookYaw) {
      this.pos.copy(follow);
      if (this.deltaStart >= 0) this.deltaStart -= dt * CAMERA.rotatingSpeed;
      this.pivot = lerp(this.pivot, this.reversingAngle, dt * CAMERA.speedRev);
      if (this.rotating) this.deltaStart -= dt * CAMERA.rotatingSpeed;
      const targetYaw = lookYaw - this.deltaStart * DEG;
      let diff = mod(targetYaw - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this.yaw += diff * clamp01(dt * CAMERA.speed);
      if (this.pendingReverse) { this.pendingReverse = false; this.game.onReversing(); }
      this.background = 0;
      this.bloom = CAMERA.bloom;
      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        this.shakeOffset.x = (Math.random() * 2 - 1) * CAMERA.shakeMagnitude;
        this.shakeOffset.y = (Math.random() * 2 - 1) * CAMERA.shakeMagnitude;
        this.background = 0.5 + Math.random() * 0.5;
        this.bloom = CAMERA.bloom * 5;
        if (this.shakeTime <= 0) this.shakeOffset.x = this.shakeOffset.y = 0;
      }
      if (this.flashTime >= 0) {
        this.flashTime += dt;
        const half = this.flashDuration / 2;
        const t = this.flashTime < half ? this.flashTime / half : 1 - (this.flashTime - half) / half;
        this.background = Math.max(this.background, clamp01(t));
        if (this.flashTime >= this.flashDuration) this.flashTime = -1;
      }
    }
    // Rig (yaw) -> Pivot (x rotation, shake offset) -> Camera (0, 4.64, -4.5), pitched 44.5 degrees.
    apply(camera) {
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const rotY = (x, y, z) => [x * cy + z * sy, y, -x * sy + z * cy];
      const rx = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
      const piv = this.pivot * DEG;
      const offset = rx([0, CAMERA.height, -CAMERA.back], piv);
      const local = [offset[0] + this.shakeOffset.x, offset[1] + this.shakeOffset.y, offset[2]];
      const world = rotY(...local);
      const fwd = rotY(...rx(rx([0, 0, 1], CAMERA.pitch), piv));
      const up = rotY(...rx(rx([0, 1, 0], CAMERA.pitch), piv));
      const px = this.pos.x + world[0], py = this.pos.y + world[1], pz = this.pos.z + world[2];
      camera.position.set(px, py, -pz);
      camera.up.set(up[0], up[1], -up[2]);
      camera.lookAt(px + fwd[0], py + fwd[1], -(pz + fwd[2]));
    }
  }

  // ---------------------------------------------------------------- world renderer
  const COLORS = {
    energy: {c1: [0.651, 0.638, 0.138], c2: [0.832, 0.832, 0.832], hl: [1, 1, 1], hli: 1.7},
    power: {c1: [0, 0.014, 1], c2: [0.948, 0.953, 1], hl: [0, 2.119, 2.019], hli: 3},
    boostUp: {c1: [0, 1, 0], c2: [0.481, 0.991, 0.481], hl: [0, 2.996, 0], hli: 1.7},
    boostDown: {c1: [1, 0.009, 0], c2: [1, 0.481, 0.476], hl: [16, 0, 0], hli: 1.7}
  };

  class WorldView {
    constructor(scene, map) {
      this.map = map;
      this.group = new T.Group();
      scene.add(this.group);
      const hex = map.hex;
      this.maxCells = 800;
      const tileGeo = hex ? hexTileGeometry() : unitQuad();
      this.tileMat = tileMaterial(hex);
      this.tiles = this.instanced(tileGeo, this.tileMat, {iPos: 3, iTop: 3, iRev: 3, iFx: 2});
      this.tiles.mesh.renderOrder = 2;
      this.itemMat = flashMaterial(hex, true);
      const itemGeo = hexOrQuad(hex);
      this.itemTiles = this.instanced(itemGeo, this.itemMat, {iPos: 3, iCol1: 3, iCol2: 3, iHL: 3, iFx: 2});
      this.propMats = [propMaterial(0.953), propMaterial(0.502)];
      this.obstacles = [0, 1].map(side => this.props(obstacleGeometry(hex, side === BOTTOM), this.propMats[0]));
      this.spikes = [0, 1].map(side => this.props(spikeGeometry(hex, side === BOTTOM), this.propMats[1]));
      this.gemMat = new T.ShaderMaterial({
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ vec3 n = normalize(vN); vec3 amb = vec3(0.168, 0.211, 0.290) + n.y * vec3(-0.015, 0.024, 0.099);
          gl_FragColor = vec4(vec3(0.651, 0.639, 0.137) * amb + vec3(0.493, 0.484, 0.104), 1.0); }`
      });
      this.gems = new T.InstancedMesh(gemGeometry(), this.gemMat, 64);
      this.gems.frustumCulled = false;
      this.quadMat = flashMaterial(false, false);
      const c = COLORS.power;
      this.quadMat.uniforms.uCol1.value.set(...c.c1);
      this.quadMat.uniforms.uCol2.value.set(...c.c2);
      this.quadMat.uniforms.uHL.value.set(...c.hl);
      this.quadMat.uniforms.uHLI.value = c.hli;
      this.quads = new T.InstancedMesh(new T.BoxGeometry(0.4, 0.4, 0.03), this.quadMat, 128);
      this.quads.frustumCulled = false;
      this.group.add(this.gems, this.quads);
      this.m = new T.Matrix4();
      this.q = new T.Quaternion();
      this.q2 = new T.Quaternion();
      this.axis = V(1, 0, 1).normalize();
      this.one = V(1, 1, 1);
      this.v = V();
      this.w = {x: 0, z: 0};
    }
    instanced(geometry, material, attrs) {
      const g = new T.InstancedBufferGeometry();
      g.index = geometry.index;
      for (const name of ['position', 'uv', 'normal']) if (geometry.attributes[name]) g.setAttribute(name, geometry.attributes[name]);
      const arrays = {};
      for (const [name, size] of Object.entries(attrs)) {
        const a = new T.InstancedBufferAttribute(new Float32Array(this.maxCells * size), size);
        a.setUsage(T.DynamicDrawUsage);
        g.setAttribute(name, a);
        arrays[name] = a;
      }
      g.instanceCount = 0;
      const mesh = new T.Mesh(g, material);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return {mesh, geometry: g, arrays};
    }
    props(geometry, material) {
      const mesh = new T.InstancedMesh(geometry, material, 300);
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.group.add(mesh);
      return mesh;
    }
    update(game, time) {
      const map = this.map, hex = map.hex;
      const head = game.player.pos;
      const hx = Math.round(head.x), hz = head.z;
      const tiles = this.tiles.arrays, items = this.itemTiles.arrays;
      let n = 0, ni = 0;
      const counts = {o0: 0, o1: 0, s0: 0, s1: 0};
      const glowing = game.glowItems;
      for (let x = hx - RANGE; x <= hx + RANGE; x++) {
        const odd = hex && (map.dataX(x) & 1);
        const zBase = Math.round(hz);
        for (let k = zBase - RANGE; k <= zBase + RANGE; k++) {
          const z = odd ? k - 0.5 : k;
          const idx = map.index(x, z);
          const top = map.env[TOP][idx];
          if (top === -1 || n >= this.maxCells) continue;
          const tz = -z;
          tiles.iPos.setXYZ(n, x, 0, tz);
          const ct = map.color[TOP], cr = map.color[BOTTOM];
          tiles.iTop.setXYZ(n, ct[idx * 3] / 255, ct[idx * 3 + 1] / 255, ct[idx * 3 + 2] / 255);
          tiles.iRev.setXYZ(n, cr[idx * 3] / 255, cr[idx * 3 + 1] / 255, cr[idx * 3 + 2] / 255);
          const thick = game.highlightOf(idx, time);
          let inten = 0;
          for (const g of glowing) {
            if (g.idx === idx) continue;
            const r = lerp(2, 0.001, glowCurve(clamp01(time - g.bornAt)));
            const ddx = Math.max(Math.abs(x - g.wx) - 0.5, 0), ddz = Math.max(Math.abs(z - g.wz) - 0.5, 0);
            if (ddx * ddx + ddz * ddz < r * r) { inten = 1; break; }
          }
          tiles.iFx.setXY(n, thick, inten);
          n++;
          for (const side of [TOP, BOTTOM]) {
            const v = map.env[side][idx];
            if (v === 1 || v === 2) {
              const list = v === 1 ? this.obstacles[side] : this.spikes[side];
              const key = (v === 1 ? 'o' : 's') + side;
              if (counts[key] < list.instanceMatrix.count) {
                this.m.makeTranslation(x, 0, tz);
                list.setMatrixAt(counts[key]++, this.m);
              }
            } else if ((v === 5 || v === 6) && ni < this.maxCells) {
              const c = v === 5 ? COLORS.boostUp : COLORS.boostDown;
              items.iPos.setXYZ(ni, x, side === TOP ? 0.006 : -0.006, tz);
              items.iCol1.setXYZ(ni, ...c.c1); items.iCol2.setXYZ(ni, ...c.c2); items.iHL.setXYZ(ni, ...c.hl);
              items.iFx.setXY(ni, thick, c.hli);
              ni++;
            }
          }
        }
      }
      this.tiles.geometry.instanceCount = n;
      for (const a of Object.values(tiles)) a.needsUpdate = true;
      // Items of the current level inside the generated window.
      let ng = 0, nq = 0;
      const spin = time * 600 * DEG;
      this.q.setFromAxisAngle(this.axis, spin);
      for (const it of game.levels.items.values()) {
        map.worldOf(it.dx, it.dy, head.x, head.z, this.w);
        const inView = Math.abs(this.w.x - hx) <= RANGE && Math.abs(this.w.z - hz) <= RANGE + 0.5;
        if (inView && !it.inView) { it.bornAt = time; }
        it.inView = inView;
        it.wx = this.w.x; it.wz = this.w.z;
        if (!inView || ni >= this.maxCells) continue;
        const c = COLORS[it.type];
        const sgn = it.side === TOP ? 1 : -1;
        items.iPos.setXYZ(ni, this.w.x, 0.005 * sgn, -this.w.z);
        items.iCol1.setXYZ(ni, ...c.c1); items.iCol2.setXYZ(ni, ...c.c2); items.iHL.setXYZ(ni, ...c.hl);
        items.iFx.setXY(ni, game.highlightOf(it.idx, time), c.hli);
        ni++;
        this.v.set(this.w.x, 0.5 * sgn, -this.w.z);
        if (it.type === 'energy' && ng < 64) {
          this.m.compose(this.v, this.q, this.one);
          this.gems.setMatrixAt(ng++, this.m);
        } else if (it.type === 'power' && nq < 128 && time >= it.hiddenUntil) {
          this.v.y = 0.46 * sgn;
          this.m.compose(this.v, this.q2.setFromAxisAngle(this.axis, spin + 1.3), this.one);
          this.quads.setMatrixAt(nq++, this.m);
        }
      }
      this.itemTiles.geometry.instanceCount = ni;
      for (const a of Object.values(items)) a.needsUpdate = true;
      this.gems.count = ng;
      this.gems.instanceMatrix.needsUpdate = true;
      this.quads.count = nq;
      this.quads.instanceMatrix.needsUpdate = true;
      for (const [key, list] of [['o0', this.obstacles[0]], ['o1', this.obstacles[1]], ['s0', this.spikes[0]], ['s1', this.spikes[1]]]) {
        list.count = counts[key];
        list.instanceMatrix.needsUpdate = true;
      }
      this.itemMat.uniforms.uTime.value = time;
      this.quadMat.uniforms.uTime.value = time;
    }
    setCamera(cam) {
      this.tileMat.uniforms.uCam.value.copy(cam);
      for (const m of this.propMats) m.uniforms.uCam.value.copy(cam);
    }
    dispose() {
      this.group.parent.remove(this.group);
      // InstancedMesh.dispose frees the instance matrix buffers; geometry.dispose does not.
      this.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
  }

  function hexOrQuad(hex) { return hex ? hexTileGeometry() : unitQuad(); }

  // ---------------------------------------------------------------- snake builder
  // Body rings sit on the grid (two per cell) and only jump when the snake steps; the head
  // pivot and the tail pivot slide with the step progress, as in TransformGroup.calculate.
  class SnakeBuilder {
    constructor(material) {
      this.mesh = new SnakeMesh(material);
      this.pts = [];
      this.nrm = [];
      this.a = V(); this.b = V(); this.c = V(); this.d = V();
    }
    prepare(player, map) {
      const trail = player.trail;
      const pts = this.pts, nrm = this.nrm;
      pts.length = nrm.length = trail.length;
      for (let k = 0; k < trail.length; k++) {
        const p = trail[k];
        const out = pts[k] || (pts[k] = V());
        const n = nrm[k] || (nrm[k] = V());
        if (map.isVoid(p.x, p.z)) {
          const ref = trail[k + 1] || trail[k - 1] || p;
          const dx = p.x - ref.x, dz = p.z - ref.z;
          out.set(ref.x + dx * 0.85, 0, -(ref.z + dz * 0.85));
          n.set(dx, 0, -dz).normalize();
        } else {
          out.set(p.x, p.y, -p.z);
          n.set(0, p.y >= 0 ? 1 : -1, 0);
        }
      }
    }
    // Nearest trail point that differs from pts[i], searching in direction step (+1 tailwards).
    distinct(i, step) {
      const pts = this.pts;
      for (let j = i + step; j >= 0 && j < pts.length; j += step) if (pts[j].distanceToSquared(pts[i]) > 1e-6) return pts[j];
      return null;
    }
    point(u, out) {
      const pts = this.pts, last = pts.length - 1;
      u = Math.max(0, Math.min(last, u));
      const i = Math.min(last - 1, Math.floor(u)), t = u - i;
      const p1 = pts[i], p2 = pts[i + 1];
      // A growing snake repeats its last cell; the curve stays put across repeated points.
      if (p1.distanceToSquared(p2) < 1e-6) return out.copy(p1);
      const p0 = this.distinct(i, -1) || this.a.copy(p1).multiplyScalar(2).sub(p2);
      const p3 = this.distinct(i + 1, 1) || this.b.copy(p2).multiplyScalar(2).sub(p1);
      const t2 = t * t, t3 = t2 * t;
      out.set(0, 0, 0)
        .addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t)
        .addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1)
        .addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t)
        .addScaledVector(p3, 0.5 * t3 - 0.5 * t2);
      return out;
    }
    frame(u) {
      const pos = this.point(u, V());
      const ahead = this.point(u - 0.05, V()), behind = this.point(u + 0.05, V());
      const fwd = ahead.sub(behind);
      if (fwd.lengthSq() < 1e-8) {
        const k = Math.max(0, Math.min(this.pts.length - 1, Math.round(u)));
        const front = this.distinct(k, -1), rear = this.distinct(k, 1);
        if (front) fwd.subVectors(front, this.pts[k]);
        else if (rear) fwd.subVectors(this.pts[k], rear);
        if (fwd.lengthSq() < 1e-8) fwd.copy(this.lastFwd || V(0, 0, -1));
      }
      fwd.normalize();
      this.lastFwd = fwd.clone();
      const last = this.nrm.length - 1;
      const uc = Math.max(0, Math.min(last, u));
      const i = Math.min(last - 1, Math.floor(uc)), t = uc - i;
      const up = V().copy(this.nrm[i]).multiplyScalar(1 - t).addScaledVector(this.nrm[i + 1], t);
      up.addScaledVector(fwd, -up.dot(fwd));
      if (up.lengthSq() < 1e-6) up.set(0, 1, 0).addScaledVector(fwd, -fwd.y);
      up.normalize();
      const right = V().crossVectors(fwd, up).normalize();
      return {pos, fwd, up, right};
    }
    ring(f) {
      return [
        f.pos.clone().addScaledVector(f.up, 0.22),
        f.pos.clone().addScaledVector(f.right, 0.275),
        f.pos.clone().addScaledVector(f.up, -0.22),
        f.pos.clone().addScaledVector(f.right, -0.275)
      ];
    }
    local(f, x, y, z) { return f.pos.clone().addScaledVector(f.right, x).addScaledVector(f.up, y).addScaledVector(f.fwd, z); }
    build(player, map, t) {
      const m = this.mesh;
      m.begin();
      if (!player.visible) { m.end(); return null; }
      this.prepare(player, map);
      const n = player.trail.length - 1;
      const th = player.tailTouched ? 1 : t;
      const uHead = 1.5 - th, uTail = Math.max(uHead, n - 0.5 - t);
      const us = [uHead];
      for (let u = 1.5; u < uTail - 1e-4; u += 0.5) if (u > uHead + 1e-4) us.push(u);
      us.push(uTail);
      const frames = us.map(u => this.frame(u));
      const rings = frames.map(f => this.ring(f));
      // Body: faces between rings. Outlines on the ring edges and on the side ridges only.
      for (let r = 0; r < rings.length - 1; r++) {
        const a = rings[r], b = rings[r + 1];
        for (let q = 0; q < 4; q++) {
          const q1 = (q + 1) % 4;
          const side = q === 0 || q === 2 ? 1 : 0;   // vertex index 1/3 are the side ridges
          const pts = [a[q], a[q1], b[q1], b[q]];
          const outline = side ? [1, 1, 1, 0] : [1, 0, 1, 1];
          m.poly(pts, outline);
        }
      }
      // Head: the arrow "Cone" mesh, four pentagon faces, all edges outlined.
      const hf = frames[0];
      const back = this.ring(hf);
      const tip = this.local(hf, 0, 0, 1.21);
      const flare = [this.local(hf, 0, 0.495, 0.385), this.local(hf, 0.55, 0, 0.385), this.local(hf, 0, -0.495, 0.385), this.local(hf, -0.55, 0, 0.385)];
      for (let q = 0; q < 4; q++) {
        const q1 = (q + 1) % 4;
        m.poly([back[q], back[q1], flare[q1], tip, flare[q]], [1, 1, 1, 1, 1]);
      }
      // Tail: a short straight piece and a long pyramid.
      const tf = frames[frames.length - 1];
      const tailRing = this.ring(tf);
      const mid = [this.local(tf, 0, 0.22, -0.585), this.local(tf, 0.275, 0, -0.585), this.local(tf, 0, -0.22, -0.585), this.local(tf, -0.275, 0, -0.585)];
      const tail = this.local(tf, 0, 0, -2.2);
      for (let q = 0; q < 4; q++) {
        const q1 = (q + 1) % 4;
        const side = q === 0 || q === 2;
        m.poly([tailRing[q], tailRing[q1], mid[q1], tail, mid[q]], side ? [1, 1, 1, 0, 0] : [1, 0, 0, 1, 1]);
      }
      m.end();
      return hf;
    }
  }

  // ---------------------------------------------------------------- game
  class Game {
    constructor() {
      this.save = new Save();
      this.audio = new AudioManager(this.save);
      this.canvas = $('game');
      this.renderer = new T.WebGLRenderer({canvas: this.canvas, antialias: false, alpha: false, powerPreference: 'high-performance'});
      this.renderer.outputColorSpace = T.LinearSRGBColorSpace;
      this.renderer.toneMapping = T.NoToneMapping;
      this.post = new PostProcess(this.renderer);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(CAMERA.fov, 1, 0.3, 1000);
      this.snakeMat = snakeMaterial();
      this.snake = new SnakeBuilder(this.snakeMat);
      this.scene.add(this.snake.mesh.mesh);
      this.particles = new Particles(this.scene);
      this.state = 'menu';
      this.mapIndex = 0;
      this.maps = {};
      this.time = 0;
      this.acc = 0;
      this.last = performance.now();
      this.fx = {bloom: CAMERA.bloom, chromatic: 0, grade: this.save.data.grading !== 'off'};
      this.highlights = new Map();
      this.glowItems = [];
      this.timers = [];
      this.ui = new UI(this);
      this.input = new Input(this);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        this.audio.setHidden(document.hidden);
        if (document.hidden && this.isRunning()) this.pause(true);
        this.last = performance.now();
        this.drawnState = null;
      });
      this.ui.showMenu('main');
      requestAnimationFrame(t => this.frame(t));
    }
    isRunning() { return this.state === 'playing'; }
    // Debug helper: advance the simulation by a number of seconds at 60 fps.
    simulate(seconds) { for (let i = 0; i < seconds * 60 && this.state === 'playing'; i++) { this.update(1 / 60); this.render(); } }
    mapData(index) {
      const def = MAPS[index];
      if (!this.maps[def.key]) this.maps[def.key] = new MapData(DATA[def.key], def.hex);
      return this.maps[def.key];
    }
    resize() {
      const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
      const q = Math.min(window.devicePixelRatio || 1, 2);
      this.renderer.setPixelRatio(q);
      this.renderer.setSize(w, h, false);
      const aspect = w / h;
      this.camera.aspect = aspect;
      let fov = CAMERA.fov;
      if (aspect < 1) fov = Math.min(90, 2 * Math.atan(Math.tan(37.5 * DEG) / aspect) / DEG);
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      this.post.setSize(Math.floor(w * q), Math.floor(h * q));
      this.drawnState = null;
    }
    later(delay, fn) { this.timers.push({at: this.time + delay, fn}); }
    // ---------------- scene management
    startMap(index, level = 0) {
      this.audio.unlock();
      this.mapIndex = index;
      const def = MAPS[index];
      this.save.data.lastMap = def.key;
      this.save.write();
      if (this.world) this.world.dispose();
      this.map = this.mapData(index);
      this.map.reset();
      this.levels = new Levels(this.map);
      if (level) this.levels.load(level % this.map.levels.length);
      this.world = new WorldView(this.scene, this.map);
      this.player = new Player(this);
      this.player.visible = true;
      this.cameraRig = new CameraRig(this);
      this.particles.clear();
      this.highlights.clear();
      this.glowItems = [];
      this.timers = [];
      this.time = 0;
      this.acc = 0;
      this.spectro = 1;
      this.spectroTarget = 1;
      this.spectroSpeed = 0;
      this.rev = 0;
      this.score = 0;
      this.shownScore = 0;
      this.scoreTick = 0;
      this.multiply = 1;
      this.recording = false;
      this.record = 0;
      this.enabled = false;
      this.state = 'playing';
      this.ui.hideMenu();
      this.ui.hud(true);
      this.ui.updateScore(0, 1);
      this.ui.updateRecord(0, this.save.data.topRecord[def.key]);
      this.audio.restartMusic(this.audio.gameMusic);
      this.ui.fade(1, 0);
      // MenuManager.waitingInstatiat: the player is enabled after one second, then the fade out.
      this.later(1, () => {
        this.enabled = true;
        this.later(PLAYER.startDelay, () => { this.setSpectro(0, 0.5); this.player.onGame = true; });
        this.later(0.5, () => this.ui.fade(0, 1));
      });
    }
    toMenu() {
      this.state = 'menu';
      if (this.world) { this.world.dispose(); this.world = null; }
      this.player = null;
      this.particles.clear();
      this.snake.mesh.begin();
      this.snake.mesh.end();
      this.audio.stopEffects();
      this.audio.restartMusic(this.audio.menuMusic);
      this.ui.hud(false);
      this.ui.showMenu('main');
      this.ui.fade(0, 1);
    }
    pause(on) {
      if (on && this.state === 'playing') {
        this.state = 'paused';
        this.audio.stopEffects();
        this.audio.playMusic(this.audio.pauseMusic);
        this.ui.showMenu('pause', true);
      } else if (!on && this.state === 'paused') {
        this.state = 'playing';
        this.audio.playMusic(this.player && (this.player.tailTouched || this.player.isDead) ? null : this.audio.gameMusic);
        this.ui.hideMenu();
        this.last = performance.now();
      }
    }
    setSpectro(value, time) {
      this.spectroTarget = value;
      if (time <= 0) this.spectro = value;
      this.spectroSpeed = time > 0 ? 1 / time : 0;
    }
    // ---------------- events from the player
    onEnterCell(target) { this.highlight(target); }
    highlight(target) { this.highlights.set(this.map.index(target.x, target.z), this.time); }
    highlightOf(idx, time) {
      const t0 = this.highlights.get(idx);
      if (t0 === undefined) return 0;
      const v = 1 - (time - t0) * 0.3;
      if (v <= 0) { this.highlights.delete(idx); return 0; }
      return v;
    }
    onReversing() { this.rev = this.player.dirIndex === 1 ? 1 : 0; }
    resetMultiply() { this.multiply = 1; this.ui.updateScore(this.shownScore, this.multiply); }
    addScore(rate) {
      this.score += rate * this.multiply;
      this.ui.popup(rate * this.multiply);
    }
    groupRemoved(group, type) {
      if (type === 'power') {
        this.multiply++;
        this.ui.updateScore(this.shownScore, this.multiply);
        this.audio.stopLoop();
        this.audio.play('group');
      }
      if (this.levels.removeGroup(group)) this.nextLevel();
    }
    pickUp(item, player) {
      const sgn = item.side === TOP ? 1 : -1;
      const at = V(item.wx, 0.5 * sgn, -item.wz);
      const toward = V(player.oldpos.x, player.oldpos.y, -player.oldpos.z).sub(at);
      if (item.type === 'power') {
        item.hiddenUntil = this.time + 0.6;
        this.audio.startLoop();
        this.particles.burst({at, dir: toward, count: 15, speed: 6, spread: 55 * DEG, life: 1, size: [0.3, 0.5], colorA: [0.21, 0.223, 0.991], colorB: [1, 1, 1]});
        this.addScore(SCORE_POWER);
      } else {
        this.particles.burst({at, dir: toward, count: 5, speed: 6, spread: 55 * DEG, life: 1, size: [0.3, 0.5], colorA: [0.924, 0.992, 0.212], colorB: [0.701, 0.726, 0.236]});
        player.addPartOfSnake();
        if (this.levels.items.get(this.levels.key(item.idx, item.side)) === item) {
          if (this.levels.removeGroup(item.group)) this.nextLevel();
        }
        this.addScore(SCORE_ENERGY);
        this.audio.play('energy');
      }
      this.ui.updateScore(this.shownScore, this.multiply);
    }
    nextLevel() {
      this.recording = true;
      let index = this.levels.index + 1;
      const key = MAPS[this.mapIndex].key;
      if (index >= this.map.levels.length) {
        index = 0;
        const best = this.save.data.topRecord[key];
        if (best === undefined || this.record < best) this.save.data.topRecord[key] = this.record;
        this.record = 0;
        this.ui.updateRecord(0, this.save.data.topRecord[key]);
        this.ui.loading(true);
        setTimeout(() => this.ui.loading(false), 350);
      }
      this.save.data.lastLevel[key] = index;
      this.save.write();
      this.levels.load(index);
    }
    spikeBurst(target, side) {
      const sgn = side === TOP ? 1 : -1;
      this.particles.burst({at: V(target.x, 0.25 * sgn, -target.z), dir: V(0, sgn, 0), count: 12, speed: [4, 4.47], spread: 38 * DEG, life: 2, size: [0.6, 1],
        colorA: [0.14, 0.16, 0.2], colorB: [0.22, 0.25, 0.3], gravity: 0.4 * sgn});
    }
    onDeath(at) {
      const p = this.player;
      const key = MAPS[this.mapIndex].key;
      this.save.data.bestScore[key] = Math.max(this.save.data.bestScore[key] || 0, this.score);
      this.save.write();
      this.cameraRig.startRotating();
      p.visible = false;
      this.audio.play('explosion');
      this.audio.stopMusic();
      this.audio.killLoop();
      const pos = V(at.x, at.y, -at.z);
      // explosion_stylized_medium_demonFire: sphere flash, shock ring, fire bursts and debris.
      this.particles.burst({at: pos, count: 1, speed: 0, spread: 0, life: 1, size: 15, colorA: [0.5, 0.5, 0.5], colorB: [0.5, 0.5, 0.5], glow: true, grow: 1});
      this.particles.burst({at: pos, count: 1, speed: 0, spread: 0, life: 0.4, size: 1, colorA: [0.4, 0.4, 0.4], colorB: [0.4, 0.4, 0.4], glow: true, grow: 9});
      this.particles.burst({at: pos, count: 19, speed: [2, 6], spread: 0, life: [0.5, 2], size: [1.4, 2.8], colorA: [0.9, 0.45, 0.12], colorB: [1, 0.75, 0.3], glow: true, grow: 1.8, gravity: -0.05});
      this.particles.burst({at: pos, count: 6, speed: [4, 9], spread: 0, life: [0.6, 1.5], size: [0.5, 1], colorA: [0.12, 0.1, 0.1], colorB: [0.3, 0.2, 0.15], gravity: 0.6});
      this.later(PLAYER.goStage1, () => {
        this.setSpectro(1, 0.5);
        this.cameraRig.flash(1);
        this.later(PLAYER.goStage2, () => { this.ui.fade(1, 1); this.later(1.1, () => this.toMenu()); });
      });
    }
    // ---------------- frame loop
    frame(now) {
      requestAnimationFrame(t => this.frame(t));
      let dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      if (this.frozen) dt = 0;
      if (this.state === 'playing') this.update(dt);
      // The menu and the pause screen are still pictures: draw them once, not every frame.
      if (this.state === 'playing' || this.drawnState !== this.state) {
        this.render();
        this.drawnState = this.state === 'playing' ? null : this.state;
      }
    }
    update(dt) {
      this.time += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const t = this.timers[i];
        if (this.time >= t.at) { this.timers.splice(i, 1); t.fn(); }
        if (this.state !== 'playing') return;
      }
      if (this.spectro !== this.spectroTarget && this.spectroSpeed > 0) {
        const d = dt * this.spectroSpeed;
        this.spectro = this.spectro < this.spectroTarget ? Math.min(this.spectroTarget, this.spectro + d) : Math.max(this.spectroTarget, this.spectro - d);
      }
      const p = this.player;
      if (this.enabled) {
        // Unity order: FixedUpdate steps first, then Update.
        this.acc += dt;
        while (this.acc >= FIXED_DT) { this.acc -= FIXED_DT; p.fixedUpdate(FIXED_DT); }
        this.input.poll();
        p.frameUpdate();
      }
      // ScoreManager: the counter climbs 5 x multiplier every 1/20 s.
      if (this.shownScore < this.score) {
        this.scoreTick += dt * 20;
        if (this.scoreTick >= 1) { this.scoreTick = 0; this.shownScore += 5 * this.multiply; this.ui.updateScore(Math.min(this.shownScore, 999999), this.multiply); }
      }
      if (this.recording) {
        const before = Math.floor(this.record);
        this.record += dt;
        if (Math.floor(this.record) !== before) this.ui.updateRecord(this.record, this.save.data.topRecord[MAPS[this.mapIndex].key]);
      }
      this.glowItems = [];
      if (this.levels) for (const it of this.levels.items.values()) if (it.type === 'energy' && it.inView && this.time - it.bornAt < 1) this.glowItems.push(it);
      this.particles.update(dt);
      this.dt = dt;
    }
    render() {
      if (this.player && this.world) {
        const p = this.player;
        const t = p.isDead ? 1 : clamp01(p.time + (this.enabled && !p.isDead ? this.acc * p.speed : 0));
        const head = this.snake.build(p, this.map, t);
        if (head) this.follow = head.pos.clone();
        const follow = this.follow || V(p.oldpos.x, p.oldpos.y, -p.oldpos.z);
        const d = p.direction;
        const horizontal = Math.hypot(d.x, d.z) > 1e-6;
        let yaw = this.lastYaw !== undefined ? this.lastYaw : Math.atan2(d.x, d.z);
        if (horizontal) yaw = Math.atan2(d.x, d.z) + (p.rev ? 0 : Math.PI);
        this.lastYaw = yaw;
        const dt = this.state === 'playing' ? this.dt || 0 : 0;
        this.cameraRig.update(dt, V(follow.x, follow.y, -follow.z), yaw);
        this.cameraRig.apply(this.camera);
        this.world.tileMat.uniforms.uSpectro.value = this.spectro;
        this.world.tileMat.uniforms.uRev.value = this.rev;
        this.world.update(this, this.time);
        this.world.setCamera(this.camera.position);
        this.snakeMat.uniforms.uCam.value.copy(this.camera.position);
        this.fx.bloom = this.cameraRig.bloom;
        this.fx.chromatic = this.cameraRig.chromatic;
        const bg = this.cameraRig.background;
        this.renderer.setClearColor(new T.Color(bg, bg, bg), 1);
      } else {
        this.fx.bloom = CAMERA.bloom;
        this.fx.chromatic = 0;
        this.renderer.setClearColor(0x000000, 1);
      }
      this.post.render(this.scene, this.camera, this.fx);
    }
  }

  // ---------------------------------------------------------------- input
  class Input {
    constructor(game) {
      this.game = game;
      this.pointers = new Map();
      const canvas = game.canvas;
      const target = document.getElementById('app');
      const inGame = () => game.state === 'playing' && game.player && game.player.onGame && !game.player.isDead && !game.player.tailTouched;
      target.addEventListener('pointerdown', e => {
        game.audio.unlock();
        if (e.target !== canvas) return;
        this.pointers.set(e.pointerId, e.clientX);
        if (!inGame()) return;
        if (this.pointers.size >= 2) { game.player.clearControls(); return; }
        const left = e.clientX <= canvas.clientWidth / 2;
        game.player.turn(!left);
      });
      const up = e => this.pointers.delete(e.pointerId);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      window.addEventListener('keydown', e => {
        game.audio.unlock();
        const k = e.code;
        if (k === 'Escape' || k === 'KeyP') {
          e.preventDefault();
          if (game.state === 'playing') game.pause(true);
          else if (game.state === 'paused') game.pause(false);
          return;
        }
        if (!inGame()) return;
        if (['ArrowLeft', 'KeyA', 'KeyQ'].includes(k)) { e.preventDefault(); if (!e.repeat) game.player.turn(false); }
        else if (['ArrowRight', 'KeyD'].includes(k)) { e.preventDefault(); if (!e.repeat) game.player.turn(true); }
        else if (['ArrowUp', 'KeyW', 'KeyZ', 'Space'].includes(k)) { e.preventDefault(); game.player.boostKey = true; }
      });
      window.addEventListener('keyup', e => {
        if (['ArrowUp', 'KeyW', 'KeyZ', 'Space'].includes(e.code) && game.player) game.player.boostKey = false;
      });
      window.addEventListener('blur', () => { if (game.player) game.player.boostKey = false; this.pointers.clear(); });
    }
    poll() {
      const g = this.game;
      if (g.player && this.pointers.size >= 2) g.player.boost = true;
    }
  }

  // ---------------------------------------------------------------- UI
  class UI {
    constructor(game) {
      this.game = game;
      this.stack = [];
      this.selected = 0;
      this.popups = [];
      document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => this.go(b.dataset.go)));
      document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => this.back()));
      $('continue').addEventListener('click', () => {
        const key = game.save.data.lastMap;
        const index = Math.max(0, MAPS.findIndex(m => m.key === key));
        game.startMap(index, game.save.data.lastLevel[key] || 0);
      });
      $('select-level').addEventListener('click', () => game.startMap(this.selected));
      $('next-level').addEventListener('click', () => { this.selected = Math.min(MAPS.length - 1, this.selected + 1); this.levelCard(); });
      $('prev-level').addEventListener('click', () => { this.selected = Math.max(0, this.selected - 1); this.levelCard(); });
      $('resume').addEventListener('click', () => game.pause(false));
      $('to-menu').addEventListener('click', () => { game.state = 'menu'; game.toMenu(); });
      $('pause-button').addEventListener('click', e => { e.stopPropagation(); game.pause(true); });
      const s = game.save.data;
      const music = $('music-volume'), sfx = $('sfx-volume');
      music.value = s.music;
      sfx.value = s.sfx;
      music.addEventListener('input', () => { s.music = +music.value; game.audio.applyVolumes(); game.save.write(); });
      sfx.addEventListener('input', () => { s.sfx = +sfx.value; game.audio.applyVolumes(); game.save.write(); });
      document.querySelectorAll('[data-grading]').forEach(b => b.addEventListener('click', () => { s.grading = b.dataset.grading; game.fx.grade = s.grading !== 'off'; game.drawnState = null; game.save.write(); this.gradingButtons(); }));
      this.gradingButtons();
      document.addEventListener('pointerdown', () => { if (game.state === 'menu') game.audio.playMusic(game.audio.menuMusic); }, {once: true});
      document.addEventListener('keydown', () => { if (game.state === 'menu') game.audio.playMusic(game.audio.menuMusic); }, {once: true});
    }
    gradingButtons() {
      document.querySelectorAll('[data-grading]').forEach(b => b.classList.toggle('selected', b.dataset.grading === (this.game.save.data.grading || 'on')));
    }
    showMenu(panel, overlay = false) {
      const menu = $('menu');
      menu.classList.remove('hidden');
      menu.classList.toggle('overlay', overlay);
      this.stack = [panel];
      this.render();
    }
    hideMenu() { $('menu').classList.add('hidden'); this.stack = []; }
    go(panel) { this.stack.push(panel); this.render(); }
    back() { if (this.stack.length > 1) this.stack.pop(); this.render(); }
    render() {
      const panel = this.stack[this.stack.length - 1];
      document.querySelectorAll('#menu .panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== panel));
      if (panel === 'start') {
        const s = this.game.save.data;
        $('continue').disabled = !Object.values(s.lastLevel).some(v => v > 0);
      }
      if (panel === 'new') this.levelCard();
      if (panel === 'top') this.stats();
      const first = document.querySelector(`#menu .panel[data-panel="${panel}"] button:not(:disabled)`);
      if (first && matchMedia('(hover: hover)').matches) first.focus({preventScroll: true});
    }
    levelCard() {
      const def = MAPS[this.selected];
      $('level-name').textContent = def.name;
      $('level-kind').textContent = def.kind;
      $('prev-level').disabled = this.selected === 0;
      $('next-level').disabled = this.selected === MAPS.length - 1;
      const map = this.game.mapData(this.selected);
      const cv = $('level-preview'), ctx = cv.getContext('2d');
      cv.width = map.w;
      cv.height = map.h;
      const img = ctx.createImageData(map.w, map.h);
      for (let x = 0; x < map.w; x++) for (let y = 0; y < map.h; y++) {
        const idx = x * map.h + y, o = ((map.h - 1 - y) * map.w + x) * 4, v = map.pristine[TOP][idx];
        const c = map.color[TOP];
        if (v === -1) { img.data[o + 3] = 255; continue; }
        const k = v === 1 || v === 2 ? 0.45 : 1;
        img.data[o] = c[idx * 3] * k; img.data[o + 1] = c[idx * 3 + 1] * k; img.data[o + 2] = c[idx * 3 + 2] * k; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    stats() {
      const s = this.game.save.data;
      $('stats').innerHTML = MAPS.map(m => {
        const t = s.topRecord[m.key];
        return `<div>${m.name} · ${m.kind}</div><div>Best time <b>${t === undefined ? '--:--' : formatTime(t)}</b> · Score <b>${String(s.bestScore[m.key] || 0).padStart(6, '0')}</b></div>`;
      }).join('<br>');
    }
    hud(on) { $('hud').classList.toggle('hidden', !on); }
    updateScore(score, mult) {
      $('score').textContent = String(Math.max(0, score | 0)).padStart(6, '0');
      $('mult').textContent = `x${mult}`;
    }
    updateRecord(record, top) {
      $('record').textContent = formatTime(record);
      const el = $('top-record');
      el.classList.toggle('hidden', top === undefined);
      if (top !== undefined) el.textContent = formatTime(top);
    }
    popup(value) {
      const host = $('popups');
      const el = document.createElement('div');
      el.className = 'popup';
      el.textContent = String(value).padStart(4, '0');
      host.appendChild(el);
      const hostRect = host.getBoundingClientRect();
      const dx = innerWidth / 2 - (hostRect.left + hostRect.width / 2), dy = innerHeight / 2 - (hostRect.top + hostRect.height / 2);
      el.animate([{transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`}, {transform: 'translate(-50%, -50%)'}], {duration: 250, easing: 'linear'});
      this.popups.push(el);
      while (this.popups.length > 1) this.popups.shift().remove();
    }
    fade(to, duration) {
      const el = $('fade');
      el.style.transitionDuration = `${duration}s`;
      el.style.opacity = to;
    }
    loading(on) { $('loading').classList.toggle('hidden', !on); }
  }

  try {
    const game = new Game();
    window.nsnakes = game;
    game.ui.fade(0, 1);
  } catch (error) {
    console.error(error);
    document.body.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;font:20px Arial;color:#fff;background:#000;text-align:center;padding:16px">WebGL is not available on this device.</div>';
  }
})();

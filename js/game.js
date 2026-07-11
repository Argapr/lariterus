// ============================================================
// LARI TERUS! — 3D Endless Runner (v2: karakter chibi + dunia realistis)
// Semua aset dibuat prosedural: geometri halus, tekstur canvas, toon shading
// ============================================================
import * as THREE from 'three';

// ---------- Konstanta gameplay ----------
const LANES = [-2.2, 0, 2.2];
const ROAD_WIDTH = 7.4;
const SPAWN_Z = -115;
const DESPAWN_Z = 14;
const GRAVITY = -26;
const JUMP_VY = 9.2;
const SLIDE_TIME = 0.72;
const BASE_SPEED = 11;
const MAX_SPEED = 30;
const POWER_DURATION = { magnet: 8, shield: 15, rocket: 8 };
const POWER_INFO = {
  magnet: { icon: '🧲', name: 'Magnet' },
  shield: { icon: '🛡️', name: 'Shield' },
  rocket: { icon: '🚀', name: 'Roket' },
};

// ---------- Hadiah login harian (siklus 7 hari) ----------
const LOGIN_REWARDS = [
  { coins: 50 }, { coins: 75 }, { coins: 100 }, { coins: 150 },
  { coins: 200 }, { coins: 300 }, { coins: 500, chest: true },
];

// ---------- Roda hadiah (8 segmen, searah jarum jam dari atas) ----------
const WHEEL_PRIZES = [
  { label: '🪙100', coins: 100 },
  { label: '🧲', voucher: 'magnet' },
  { label: '🪙50', coins: 50 },
  { label: '🛡️', voucher: 'shield' },
  { label: '🪙200', coins: 200 },
  { label: '🚀', voucher: 'rocket' },
  { label: '🪙75', coins: 75 },
  { label: '💰500', coins: 500, jackpot: true },
];
const WHEEL_EXTRA_COST = 150;

// ---------- Prestasi permanen (3 tingkat, hadiah otomatis) ----------
const ACHIEVEMENTS = [
  { id: 'dist',   icon: '🏃', name: 'Pelari Sejati',     stat: 'dist',     tiers: [1000, 10000, 50000], reward: [100, 300, 1000], fmt: v => v >= 1000 ? (v / 1000) + ' km' : v + ' m' },
  { id: 'coins',  icon: '🪙', name: 'Kolektor Koin',     stat: 'coins',    tiers: [500, 5000, 20000],   reward: [100, 300, 1000], fmt: v => v + ' koin' },
  { id: 'runs',   icon: '💀', name: 'Pantang Menyerah',  stat: 'runs',     tiers: [10, 100, 500],       reward: [50, 200, 800],   fmt: v => v + ' kali main' },
  { id: 'power',  icon: '⚡', name: 'Power Ranger',      stat: 'powerups', tiers: [10, 100, 300],       reward: [50, 200, 600],   fmt: v => v + ' power-up' },
  { id: 'streak', icon: '📅', name: 'Setia Hadir',       stat: 'streak',   tiers: [3, 7, 30],           reward: [100, 300, 1500], fmt: v => v + ' hari beruntun' },
  { id: 'level',  icon: '⭐', name: 'Naik Daun',         stat: 'level',    tiers: [5, 10, 20],          reward: [150, 400, 1200], fmt: v => 'level ' + v },
];

// ---------- Koleksi: pet & trail ----------
const PETS = [
  { id: 'nopet',  name: 'Tanpa Pet', desc: 'Lari sendirian',       price: 0,    kind: 'pet', swatch: '#666' },
  { id: 'cici',   name: 'Cici',      desc: 'Pet · Burung kuning',  price: 500,  kind: 'pet', swatch: '#f7d94c' },
  { id: 'kunang', name: 'Kunang',    desc: 'Pet · Kunang-kunang',  price: 700,  kind: 'pet', swatch: '#b8ff5c' },
  { id: 'dodo',   name: 'Dodo',      desc: 'Pet · Naga mini',      price: 1200, kind: 'pet', swatch: '#5cd98a' },
];
const TRAILS = [
  { id: 'notrail', name: 'Tanpa Trail', desc: 'Jejak polos',            price: 0,   kind: 'trail', swatch: '#666', colors: null },
  { id: 'api',     name: 'Api',         desc: 'Trail · Jejak membara',  price: 500, kind: 'trail', swatch: '#ff7a30', colors: [0xff8c30, 0xff5030, 0xffc040] },
  { id: 'bintang', name: 'Bintang',     desc: 'Trail · Kelip bintang',  price: 700, kind: 'trail', swatch: '#fff0a0', colors: [0xfff0a0, 0xffffff, 0xffd34d] },
  { id: 'pelangi', name: 'Pelangi',     desc: 'Trail · Warna-warni',    price: 900, kind: 'trail', swatch: '#c060ff', colors: 'rainbow' },
];

// ---------- Upgrade power-up: durasi +25% per level (maks 5) ----------
const UPGRADE_MAX = 5;
const upgradeCost = (lvl) => 200 * lvl; // biaya menuju level berikutnya
function powerDuration(type) {
  return POWER_DURATION[type] * (1 + 0.25 * (store.pupgrades[type] - 1));
}

// ---------- Data karakter (price 0 = gratis) ----------
const CHARACTERS = [
  { id: 'toni',  name: 'Toni',  desc: 'Jagoan ceria', kind: 'human', swatch: '#e84040', price: 0,
    skin: 0xf2c197, shirt: 0xf7d94c, pants: 0x3a5bd9, cap: 0xe84040, hair: 0x4a2f1d, shoe: 0xc9372c, girl: false },
  { id: 'sinta', name: 'Sinta', desc: 'Si lincah',    kind: 'human', swatch: '#ff5fa2', price: 0,
    skin: 0xf7d3ae, shirt: 0xff5fa2, pants: 0x35355c, cap: null,     hair: 0x5c3a1e, shoe: 0xffffff, girl: true },
  { id: 'komo',  name: 'Komo',  desc: 'Dino sahabat', kind: 'dino',  swatch: '#4fae4f', price: 0,
    body: 0x4fae4f, belly: 0xd6eeb2, spike: 0xe0653a, shoe: 0xf2f2f2 },
  { id: 'bayu',  name: 'Bayu',  desc: 'Ninja bayangan', kind: 'human', swatch: '#3a3a55', price: 300,
    skin: 0xf2c197, shirt: 0x32324a, pants: 0x26263a, cap: null, hair: 0x32324a, shoe: 0x26263a, girl: false, headband: 0xe33030 },
  { id: 'zara',  name: 'Zara',  desc: 'Astronot muda', kind: 'human', swatch: '#f0f0f5', price: 500,
    skin: 0xe8b58c, shirt: 0xf0f0f5, pants: 0xd8d8e0, cap: null, hair: 0x3a2a1a, shoe: 0xe07a30, girl: true, helmet: true },
  { id: 'kiko',  name: 'Kiko',  desc: 'Kucing oranye', kind: 'human', swatch: '#f09040', price: 800,
    skin: 0xf09040, shirt: 0xf09040, pants: 0xf09040, cap: null, hair: 0xf09040, shoe: 0xffffff, girl: false, cat: true },
];

// ---------- Data tema (price 0 = gratis) ----------
const THEMES = [
  { id: 'kota',  name: 'Kota',  desc: 'Taman kota cerah', swatch: '#87ceeb', price: 0,
    skyTop: '#3d8fe0', skyBot: '#bfe3f7', fog: 0xbcd9ec, fogNear: 45, fogFar: 150,
    hemi: [0xcfe4ff, 0x7a9a6a, 1.1], sun: [0xfff2d0, 2.6], sunPos: [-10, 18, 6] },
  { id: 'gurun', name: 'Gurun', desc: 'Senja keemasan',  swatch: '#ff9a5c', price: 0,
    skyTop: '#7a3f8f', skyBot: '#ffb066', fog: 0xf0a870, fogNear: 40, fogFar: 140,
    hemi: [0xffd9b0, 0xa07850, 0.85], sun: [0xffa050, 2.2], sunPos: [8, 10, -20] },
  { id: 'neon',  name: 'Neon',  desc: 'Kota tengah malam', swatch: '#c400ff', price: 0,
    skyTop: '#05050f', skyBot: '#1a1040', fog: 0x141430, fogNear: 32, fogFar: 130,
    hemi: [0x5050b0, 0x101020, 0.75], sun: [0x9090ff, 1.2], sunPos: [-8, 16, 4] },
  { id: 'salju', name: 'Salju', desc: 'Pegunungan bersalju', swatch: '#dfeaf5', price: 400,
    skyTop: '#8fb8dd', skyBot: '#eef5fb', fog: 0xdfeaf2, fogNear: 40, fogFar: 140,
    hemi: [0xe8f2ff, 0xb8c8d8, 1.0], sun: [0xfff8e8, 2.0], sunPos: [-10, 18, 6] },
  { id: 'pantai', name: 'Pantai', desc: 'Senja di pantai', swatch: '#ffb37a', price: 600,
    skyTop: '#6a4a9c', skyBot: '#ffb37a', fog: 0xffc79a, fogNear: 42, fogFar: 145,
    hemi: [0xffe0c0, 0xc0a070, 0.95], sun: [0xffb066, 2.2], sunPos: [10, 12, -16] },
];

// ---------- Penyimpanan ----------
const jsonGet = (k, def) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; }
};
const store = {
  get best()    { return +(localStorage.getItem('er_best') || 0); },
  set best(v)   { localStorage.setItem('er_best', v); },
  get charId()  { return localStorage.getItem('er_char') || 'toni'; },
  set charId(v) { localStorage.setItem('er_char', v); },
  get themeId() { return localStorage.getItem('er_theme') || 'kota'; },
  set themeId(v){ localStorage.setItem('er_theme', v); },
  get coinsTotal()  { return +(localStorage.getItem('er_coins_total') || 0); },
  set coinsTotal(v) { localStorage.setItem('er_coins_total', v); },
  get ownedChars()  { return jsonGet('er_owned_chars', ['toni', 'sinta', 'komo']); },
  set ownedChars(v) { localStorage.setItem('er_owned_chars', JSON.stringify(v)); },
  get ownedThemes() { return jsonGet('er_owned_themes', ['kota', 'gurun', 'neon']); },
  set ownedThemes(v){ localStorage.setItem('er_owned_themes', JSON.stringify(v)); },
  get missions()    { return jsonGet('er_missions', null); },
  set missions(v)   { localStorage.setItem('er_missions', JSON.stringify(v)); },
  get board()       { return jsonGet('er_board', []); },
  set board(v)      { localStorage.setItem('er_board', JSON.stringify(v)); },
  get xp()          { return +(localStorage.getItem('er_xp') || 0); },
  set xp(v)         { localStorage.setItem('er_xp', v); },
  get login()       { return jsonGet('er_login', { last: null, streak: 0 }); },
  set login(v)      { localStorage.setItem('er_login', JSON.stringify(v)); },
  get wheelLast()   { return localStorage.getItem('er_wheel_last') || ''; },
  set wheelLast(v)  { localStorage.setItem('er_wheel_last', v); },
  get vouchers()    { return jsonGet('er_vouchers', { magnet: 0, shield: 0, rocket: 0 }); },
  set vouchers(v)   { localStorage.setItem('er_vouchers', JSON.stringify(v)); },
  get pupgrades()   { return jsonGet('er_pupgrades', { magnet: 1, shield: 1, rocket: 1 }); },
  set pupgrades(v)  { localStorage.setItem('er_pupgrades', JSON.stringify(v)); },
  get stats()       { return jsonGet('er_stats', { dist: 0, coins: 0, runs: 0, powerups: 0 }); },
  set stats(v)      { localStorage.setItem('er_stats', JSON.stringify(v)); },
  get ach()         { return jsonGet('er_ach', {}); },
  set ach(v)        { localStorage.setItem('er_ach', JSON.stringify(v)); },
  get chests()      { return +(localStorage.getItem('er_chests') || 0); },
  set chests(v)     { localStorage.setItem('er_chests', v); },
  get petId()       { return localStorage.getItem('er_pet') || 'nopet'; },
  set petId(v)      { localStorage.setItem('er_pet', v); },
  get trailId()     { return localStorage.getItem('er_trail') || 'notrail'; },
  set trailId(v)    { localStorage.setItem('er_trail', v); },
  get ownedPets()   { return jsonGet('er_owned_pets', ['nopet']); },
  set ownedPets(v)  { localStorage.setItem('er_owned_pets', JSON.stringify(v)); },
  get ownedTrails() { return jsonGet('er_owned_trails', ['notrail']); },
  set ownedTrails(v){ localStorage.setItem('er_owned_trails', JSON.stringify(v)); },
};

// ---------- Audio prosedural ----------
const AudioFX = {
  ctx: null,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  beep(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
    try {
      this.ensure();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + dur);
    } catch (e) { /* audio tidak tersedia */ }
  },
  coin()  { this.beep(1150, 0.12, 'square', 0.07); this.beep(1720, 0.16, 'square', 0.05); },
  jump()  { this.beep(300, 0.22, 'sine', 0.1, 350); },
  slide() { this.beep(240, 0.18, 'sawtooth', 0.05, -120); },
  crash() { this.beep(120, 0.5, 'sawtooth', 0.16, -70); },
  click() { this.beep(650, 0.06, 'square', 0.06); },
  powerup() {
    this.beep(520, 0.1, 'square', 0.07);
    setTimeout(() => this.beep(780, 0.1, 'square', 0.07), 90);
    setTimeout(() => this.beep(1040, 0.16, 'square', 0.07), 180);
  },
  shieldBreak() { this.beep(500, 0.3, 'sawtooth', 0.12, -300); },
};

// ============================================================
// Renderer, scene, kamera, cahaya (dengan bayangan asli)
// ============================================================
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 300);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -12;
sunLight.shadow.camera.right = 12;
sunLight.shadow.camera.top = 16;
sunLight.shadow.camera.bottom = -16;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 60;
sunLight.shadow.bias = -0.002;
scene.add(sunLight);
scene.add(sunLight.target);
sunLight.target.position.set(0, 0, -8);

// ============================================================
// Alat bantu: toon shading & tekstur canvas
// ============================================================
const gradientMap = (() => {
  const data = new Uint8Array([120, 190, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap });

function canvasTexture(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tekstur bintik acak (rumput, pasir, aspal)
function speckleTex(base, dots, count = 900, repeat = [1, 1]) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = dots[(Math.random() * dots.length) | 0];
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }, repeat);
}

// Tekstur gedung dengan jendela
function buildingTex(wall, winOff, winOn, litChance) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 18; y += 26) {
      for (let x = 10; x < w - 14; x += 24) {
        ctx.fillStyle = Math.random() < litChance ? winOn : winOff;
        ctx.fillRect(x, y, 14, 16);
      }
    }
  });
}

// Tekstur garis merah-putih (barrier)
const hazardTex = canvasTexture(128, 64, (ctx, w, h) => {
  ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d93838';
  for (let x = -h; x < w + h; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.lineTo(x + h + 20, 0); ctx.lineTo(x + 20, h);
    ctx.fill();
  }
});

// Tekstur peti kayu
const crateTex = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#a5713d'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7a4f26'; ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(w - 6, h - 6);
  ctx.moveTo(w - 6, 6); ctx.lineTo(6, h - 6); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 60; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 6);
});

// ============================================================
// Pembuat karakter chibi (bola & kapsul halus + toon shading)
// ============================================================
function buildCharacter(cfg) {
  return cfg.kind === 'dino' ? buildDino(cfg) : buildHuman(cfg);
}

function addEyes(g, y, z, spread, size, browColor) {
  for (const sx of [-spread, spread]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    white.scale.set(1, 1.25, 0.55);
    white.position.set(sx, y, z);
    g.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 8, 8), new THREE.MeshBasicMaterial({ color: 0x1a1a2a }));
    pupil.position.set(sx, y, z - size * 0.62);
    g.add(pupil);
    if (browColor != null) {
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.1, 2, 6), toon(browColor));
      brow.rotation.z = Math.PI / 2 + (sx > 0 ? -0.15 : 0.15);
      brow.position.set(sx, y + size * 1.6, z + 0.01);
      g.add(brow);
    }
  }
}

function buildHuman(cfg) {
  const g = new THREE.Group();

  // Kaki (pivot pinggul)
  const legs = [];
  for (const sx of [-0.14, 0.14]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.62, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 4, 10), toon(cfg.pants));
    leg.position.y = -0.2;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon(cfg.shoe));
    shoe.scale.set(1, 0.75, 1.5);
    shoe.position.set(0, -0.42, -0.05);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }

  // Badan
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 6, 14), toon(cfg.shirt));
  body.position.y = 0.95;
  body.scale.set(1, 1, 0.85);
  g.add(body);
  if (cfg.girl) { // rok kecil
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 14), toon(cfg.pants));
    skirt.position.y = 0.72;
    g.add(skirt);
  }

  // Lengan (pivot bahu) + sarung tangan putih
  const arms = [];
  for (const sx of [-0.35, 0.35]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.12, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 4, 10), toon(cfg.shirt));
    arm.position.y = -0.17;
    pivot.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), toon(0xffffff));
    glove.position.y = -0.38;
    pivot.add(glove);
    g.add(pivot);
    arms.push(pivot);
  }

  // Kepala besar khas chibi
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), toon(cfg.skin));
  head.position.y = 1.62;
  g.add(head);

  // Wajah: mata, alis, hidung, senyum
  addEyes(g, 1.68, -0.34, 0.15, 0.095, cfg.hair);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), toon(cfg.skin));
  nose.position.set(0, 1.58, -0.43);
  g.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 14, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7a3020 }));
  smile.position.set(0, 1.48, -0.37);
  smile.rotation.z = Math.PI;
  smile.rotation.x = -0.25;
  g.add(smile);

  // Rambut / topi
  if (cfg.cap != null) {
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), toon(cfg.cap));
    capTop.position.y = 1.66;
    g.add(capTop);
    const brim = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8), toon(cfg.cap));
    brim.scale.set(1.1, 0.14, 1.2);
    brim.position.set(0, 1.85, -0.36);
    g.add(brim);
    // Rambut mengintip di belakang topi
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.22), toon(cfg.hair));
    backHair.position.set(0, 1.66, 0.06);
    backHair.scale.set(1.06, 1.06, 1.06);
    g.add(backHair);
  } else {
    // Rambut menutup kepala; kuncir kuda hanya untuk karakter perempuan
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(cfg.hair));
    hairCap.position.y = 1.64;
    g.add(hairCap);
    if (cfg.girl && !cfg.helmet) {
      const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), toon(cfg.hair));
      pony.position.set(0, 1.5, 0.42);
      pony.rotation.x = 0.55;
      g.add(pony);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 12), toon(cfg.shirt));
      tie.position.set(0, 1.72, 0.36);
      tie.rotation.x = 1.2;
      g.add(tie);
    }
  }

  // --- Aksesori khusus ---
  if (cfg.headband) { // ninja: ikat kepala + pita berkibar
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 20), toon(cfg.headband));
    band.position.y = 1.72;
    band.rotation.x = Math.PI / 2;
    band.scale.z = 0.7;
    g.add(band);
    for (const sx of [-0.05, 0.07]) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.03), toon(cfg.headband));
      ribbon.position.set(sx, 1.58, 0.42);
      ribbon.rotation.x = 0.35;
      g.add(ribbon);
    }
  }
  if (cfg.helmet) { // astronot: helm kaca + ransel oksigen
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.22, depthWrite: false }));
    glass.position.y = 1.62;
    g.add(glass);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20), toon(0xe07a30));
    collar.position.y = 1.24;
    collar.rotation.x = Math.PI / 2;
    g.add(collar);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), toon(0xd8d8e0));
    pack.position.set(0, 1.0, 0.3);
    g.add(pack);
  }
  if (cfg.cat) { // kucing: telinga, ekor, moncong putih, hidung pink
    for (const sx of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 10), toon(cfg.skin));
      ear.position.set(sx, 2.02, 0);
      ear.rotation.z = sx > 0 ? -0.25 : 0.25;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), toon(0xffc8d0));
      inner.position.set(sx, 2.01, -0.03);
      inner.rotation.z = ear.rotation.z;
      g.add(inner);
    }
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 4, 10), toon(cfg.skin));
    tail.position.set(0.1, 0.75, 0.35);
    tail.rotation.x = 0.9;
    tail.rotation.z = -0.3;
    g.add(tail);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), toon(0xfff4ec));
    muzzle.scale.set(1.2, 0.8, 0.7);
    muzzle.position.set(0, 1.52, -0.36);
    g.add(muzzle);
    const catNose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), toon(0xff8aa0));
    catNose.position.set(0, 1.58, -0.46);
    g.add(catNose);
  }

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { arms, legs };
  return g;
}

function buildDino(cfg) {
  const g = new THREE.Group();

  // Kaki gemuk
  const legs = [];
  for (const sx of [-0.17, 0.17]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.58, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 10), toon(cfg.body));
    leg.position.y = -0.18;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), toon(cfg.shoe));
    shoe.scale.set(1, 0.7, 1.5);
    shoe.position.set(0, -0.38, -0.06);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }

  // Badan bulat + perut terang
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), toon(cfg.body));
  body.position.y = 0.95;
  body.scale.set(0.95, 1.05, 0.9);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), toon(cfg.belly));
  belly.position.set(0, 0.9, -0.14);
  belly.scale.set(0.85, 0.95, 0.6);
  g.add(belly);

  // Ekor
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 12), toon(cfg.body));
  tail.position.set(0, 0.85, 0.55);
  tail.rotation.x = 2.2;
  g.add(tail);

  // Lengan kecil
  const arms = [];
  for (const sx of [-0.4, 0.4]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.05, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 4, 8), toon(cfg.body));
    arm.position.y = -0.13;
    pivot.add(arm);
    g.add(pivot);
    arms.push(pivot);
  }

  // Kepala besar + moncong
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), toon(cfg.body));
  head.position.y = 1.62;
  g.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), toon(cfg.belly));
  snout.scale.set(1, 0.7, 1.1);
  snout.position.set(0, 1.5, -0.33);
  g.add(snout);
  for (const sx of [-0.06, 0.06]) { // lubang hidung
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x2a5a2a }));
    n.position.set(sx, 1.56, -0.5);
    g.add(n);
  }
  addEyes(g, 1.74, -0.28, 0.13, 0.09, null);

  // Duri punggung
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 8), toon(cfg.spike));
    spike.position.set(0, 1.85 - i * 0.42, 0.3 + i * 0.06);
    spike.rotation.x = 0.5 + i * 0.25;
    g.add(spike);
  }

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { arms, legs };
  return g;
}

// ============================================================
// Pet pendamping (melayang di samping pemain)
// ============================================================
let petMesh = null;

function buildPetMesh(id) {
  const g = new THREE.Group();
  if (id === 'cici') { // burung kuning
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), toon(0xf7d94c));
    g.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), toon(0xf09040));
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0, -0.19);
    g.add(beak);
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(0xf0c030));
      w.scale.set(1.6, 0.25, 0.8);
      w.position.set(sx * 0.19, 0.03, 0);
      g.add(w);
      wings.push(w);
    }
    for (const sx of [-0.06, 0.06]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      eye.position.set(sx, 0.06, -0.13);
      g.add(eye);
    }
    g.userData.anim = (t) => { for (let i = 0; i < wings.length; i++) wings[i].rotation.z = (i ? -1 : 1) * Math.sin(t * 14) * 0.5; };
  } else if (id === 'kunang') { // kunang-kunang menyala
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xd8ff70 }));
    g.add(glow);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xb8ff5c, transparent: true, opacity: 0.25 }));
    g.add(halo);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0x3a3a2a));
    head.position.set(0, 0.04, -0.13);
    g.add(head);
    g.userData.anim = (t) => {
      const s = 1 + Math.sin(t * 6) * 0.3;
      halo.scale.setScalar(s);
      halo.material.opacity = 0.15 + Math.abs(Math.sin(t * 6)) * 0.2;
    };
  } else if (id === 'dodo') { // naga mini hijau
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 4, 10), toon(0x5cd98a));
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), toon(0x5cd98a));
    head.position.set(0, 0.05, -0.2);
    g.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), toon(0xd6eeb2));
    snout.position.set(0, 0.02, -0.29);
    g.add(snout);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), toon(0x5cd98a));
    tail.rotation.x = -Math.PI / 2;
    tail.position.set(0, 0, 0.24);
    g.add(tail);
    const wings = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 3), toon(0x3aa86a));
      w.rotation.z = sx * Math.PI / 2;
      w.scale.set(1, 1, 0.3);
      w.position.set(sx * 0.16, 0.06, 0);
      g.add(w);
      wings.push(w);
    }
    for (const sx of [-0.05, 0.05]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      eye.position.set(sx, 0.09, -0.28);
      g.add(eye);
    }
    g.userData.anim = (t) => { for (let i = 0; i < wings.length; i++) wings[i].rotation.x = Math.sin(t * 10) * 0.4; };
  }
  return g;
}

// Tampilkan pet: default pet yang dipakai; previewId untuk pratinjau di shop
function applyPet(previewId) {
  const id = previewId !== undefined ? previewId : store.petId;
  if (petMesh) { scene.remove(petMesh); petMesh = null; }
  if (id !== 'nopet') {
    petMesh = buildPetMesh(id);
    petMesh.position.set(1.1, 1.6, 0.3);
    scene.add(petMesh);
  }
}

// ============================================================
// Trail: partikel jejak lari
// ============================================================
const trailFX = {
  parts: [],
  matCache: {},
  timer: 0,
  hue: 0,
  previewId: null, // pratinjau trail di tab Koleksi (termasuk yang belum dibeli)
  mat(color) {
    if (!this.matCache[color]) this.matCache[color] = new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.9 });
    return this.matCache[color];
  },
  spawn(x, y, z) {
    const t = TRAILS.find(t => t.id === (this.previewId || store.trailId));
    if (!t || !t.colors) return;
    let color;
    if (t.colors === 'rainbow') {
      this.hue = (this.hue + 0.07) % 1;
      color = new THREE.Color().setHSL(this.hue, 0.9, 0.6).getHex();
    } else {
      color = t.colors[(Math.random() * t.colors.length) | 0];
    }
    const sp = new THREE.Sprite(this.mat(color).clone());
    const s = 0.22 + Math.random() * 0.14;
    sp.scale.set(s, s, 1);
    sp.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.15, z);
    scene.add(sp);
    this.parts.push({ sp, life: 0.55 });
  },
  update(dt, worldDz) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.sp.position.z += worldDz;       // ikut bergerak bersama dunia
      p.sp.position.y += dt * 0.5;      // melayang naik pelan
      p.sp.material.opacity = Math.max(0, p.life / 0.55) * 0.9;
      const s = p.sp.scale.x * (1 - dt * 1.6);
      p.sp.scale.set(s, s, 1);
      if (p.life <= 0) {
        scene.remove(p.sp);
        p.sp.material.dispose();
        this.parts.splice(i, 1);
      }
    }
  },
  clear() {
    for (const p of this.parts) { scene.remove(p.sp); p.sp.material.dispose(); }
    this.parts.length = 0;
  },
};

// ============================================================
// Dunia
// ============================================================
const world = {
  group: new THREE.Group(),
  roadSegs: [],
  decos: [],
  obstacles: [],
  coins: [],
  powerups: [],
  clouds: [],
  themeAssets: null,
  scenery: new THREE.Group(), // langit, gunung, matahari — statis
};
scene.add(world.group);
scene.add(world.scenery);

let groundPlane = null;

function clearList(list) {
  for (const o of list) world.group.remove(o.mesh || o);
  list.length = 0;
}

function buildTheme(theme) {
  clearList(world.roadSegs);
  clearList(world.decos);
  clearList(world.obstacles);
  clearList(world.coins);
  clearList(world.powerups);
  world.clouds.length = 0;
  world.scenery.clear();
  if (groundPlane) { scene.remove(groundPlane); }

  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
  hemiLight.color.set(theme.hemi[0]);
  hemiLight.groundColor.set(theme.hemi[1]);
  hemiLight.intensity = theme.hemi[2];
  sunLight.color.set(theme.sun[0]);
  sunLight.intensity = theme.sun[1];
  sunLight.position.set(...theme.sunPos);

  // ----- Kubah langit bergradasi -----
  const skyTex = canvasTexture(16, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.skyTop);
    grad.addColorStop(1, theme.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  world.scenery.add(sky);
  scene.background = null;

  // ----- Tekstur tanah & jalan per tema -----
  let groundTex, roadTex, stripeColor;
  if (theme.id === 'kota') {
    groundTex = speckleTex('#67ab55', ['#5a9c49', '#78bd63', '#4f8f40', '#82c76d'], 1100, [50, 50]);
    roadTex = speckleTex('#5c6270', ['#525866', '#666c7a', '#4e5462'], 700, [2, 3]);
    stripeColor = 0xe8e8e8;
  } else if (theme.id === 'gurun') {
    groundTex = speckleTex('#dfae66', ['#d4a057', '#eabc78', '#c99a50'], 900, [50, 50]);
    roadTex = speckleTex('#8a6f4d', ['#7d6342', '#977b56', '#836847'], 700, [2, 3]);
    stripeColor = 0xf2e2bc;
  } else if (theme.id === 'salju') {
    groundTex = speckleTex('#eef4f8', ['#dde8f0', '#f8fcff', '#cfdde8'], 700, [50, 50]);
    roadTex = speckleTex('#6a7684', ['#5e6a78', '#76828f', '#565f6d'], 600, [2, 3]);
    stripeColor = 0xffffff;
  } else if (theme.id === 'pantai') {
    groundTex = speckleTex('#f0d29a', ['#e5c288', '#f8dfae', '#dcb87a'], 900, [50, 50]);
    // Jalan papan kayu (boardwalk)
    roadTex = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#b5854f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8a6238';
      for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < 80; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 8, 1.5);
    }, [2, 3]);
    stripeColor = 0xfff0d0;
  } else {
    groundTex = speckleTex('#14142a', ['#1a1a34', '#10101f', '#1e1e3c'], 500, [50, 50]);
    roadTex = speckleTex('#20203c', ['#262646', '#1a1a32', '#2c2c50'], 500, [2, 3]);
    stripeColor = 0x35e0e0;
  }

  groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshLambertMaterial({ map: groundTex })
  );
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(0, -0.06, -60);
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);

  // ----- Aset bersama -----
  const geoms = {
    seg: new THREE.BoxGeometry(ROAD_WIDTH, 0.1, 10),
    stripe: new THREE.BoxGeometry(0.14, 0.02, 2.2),
    curb: new THREE.BoxGeometry(0.3, 0.22, 10),
    barrier: new THREE.BoxGeometry(2.0, 0.8, 0.45),
    crate: new THREE.BoxGeometry(2.0, 2.3, 1.2),
    pole: new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10),
    bar: new THREE.BoxGeometry(2.3, 0.5, 0.45),
    coin: new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20),
    coinRim: new THREE.TorusGeometry(0.34, 0.05, 8, 20),
    bld: new THREE.BoxGeometry(1, 1, 1),
    trunk: new THREE.CylinderGeometry(0.14, 0.2, 1.1, 8),
    leaf: new THREE.SphereGeometry(0.8, 12, 10),
    cactus: new THREE.CapsuleGeometry(0.28, 0.9, 6, 12),
    cactusArm: new THREE.CapsuleGeometry(0.14, 0.4, 4, 10),
    rock: new THREE.DodecahedronGeometry(0.8, 1),
    pillar: new THREE.BoxGeometry(0.7, 1, 0.7),
    cone: new THREE.ConeGeometry(1, 1, 9),
    frond: new THREE.SphereGeometry(0.5, 8, 6),
  };
  const mats = {
    roadA: new THREE.MeshLambertMaterial({ map: roadTex }),
    roadB: new THREE.MeshLambertMaterial({ map: roadTex, color: 0xcccccc }),
    stripe: new THREE.MeshBasicMaterial({ color: stripeColor }),
    curb: new THREE.MeshLambertMaterial({ color: theme.id === 'neon' ? 0x35e0e0 : 0xb8b8b8 }),
    hazard: new THREE.MeshLambertMaterial({ map: hazardTex }),
    crate: new THREE.MeshLambertMaterial({ map: crateTex }),
    pole: toon(0x8a8f99),
    bar: toon(0xf2c230),
    coin: new THREE.MeshToonMaterial({ color: 0xffd34d, gradientMap, emissive: 0x775500 }),
    trunk: toon(0x7a4f2a),
    leaf1: toon(0x3f9438),
    leaf2: toon(0x57ad4a),
    cactus: toon(0x4a8f3c),
    rock: toon(0xa08a68),
    bldDay1: new THREE.MeshLambertMaterial({ map: buildingTex('#aeb6c2', '#5d6a7c', '#ffe9a8', 0.12) }),
    bldDay2: new THREE.MeshLambertMaterial({ map: buildingTex('#c7b8a4', '#6b6154', '#ffe9a8', 0.1) }),
    bldNight1: new THREE.MeshLambertMaterial({ map: buildingTex('#12121f', '#0a0a14', '#ffd98a', 0.5), emissive: 0x0a0a14 }),
    bldNight2: new THREE.MeshLambertMaterial({ map: buildingTex('#161628', '#0c0c18', '#8ae0ff', 0.45), emissive: 0x0a0a14 }),
    neon1: new THREE.MeshBasicMaterial({ color: 0x35e0e0 }),
    neon2: new THREE.MeshBasicMaterial({ color: 0xc400ff }),
    pine: toon(0x2f6b3f),
    pineSnow: toon(0xf0f6fa),
    palmTrunk: toon(0x9c7040),
    frond: toon(0x3fa050),
    umbrella1: toon(0xe84040),
    umbrella2: toon(0x35b0e0),
  };
  world.themeAssets = { geoms, mats, id: theme.id };

  // ----- Segmen jalan + trotoar -----
  for (let i = 0; i < 14; i++) {
    const seg = new THREE.Mesh(geoms.seg, i % 2 ? mats.roadA : mats.roadB);
    seg.position.set(0, -0.05, 8 - i * 10);
    seg.receiveShadow = true;
    for (const x of [-1.1, 1.1]) {
      for (const dz of [-3, 1]) {
        const st = new THREE.Mesh(geoms.stripe, mats.stripe);
        st.position.set(x, 0.06, dz);
        seg.add(st);
      }
    }
    for (const x of [-ROAD_WIDTH / 2 - 0.15, ROAD_WIDTH / 2 + 0.15]) {
      const curb = new THREE.Mesh(geoms.curb, mats.curb);
      curb.position.set(x, 0.02, 0);
      seg.add(curb);
    }
    world.group.add(seg);
    world.roadSegs.push(seg);
  }

  // ----- Pemandangan statis di cakrawala -----
  if (theme.id === 'kota' || theme.id === 'gurun' || theme.id === 'salju') {
    // Gunung
    const mtnColors = { kota: [0x6a8a9c, 0xf0f6fa], gurun: [0x9c6a50, 0xf2d8b8], salju: [0x9cb2c8, 0xffffff] };
    const mtnMat = toon(mtnColors[theme.id][0]);
    const snowMat = toon(mtnColors[theme.id][1]);
    for (let i = 0; i < 8; i++) {
      const x = -110 + i * 32 + (Math.random() - 0.5) * 14;
      const h = 22 + Math.random() * 22;
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(16 + Math.random() * 10, h, 7), mtnMat);
      mtn.position.set(x, h / 2 - 2, -128 - Math.random() * 12);
      world.scenery.add(mtn);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(5.5, h * 0.28, 7), snowMat);
      cap.position.set(x, h - h * 0.14 - 2, mtn.position.z);
      world.scenery.add(cap);
    }
  }
  if (theme.id === 'gurun' || theme.id === 'pantai') {
    // Matahari senja besar di cakrawala
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, fog: false }));
    sunBall.position.set(10, 14, -190);
    world.scenery.add(sunBall);
  }
  if (theme.id === 'pantai') {
    // Laut di kedua sisi pantai
    const seaMat = new THREE.MeshLambertMaterial({ color: 0x2e7ac9, emissive: 0x0a2a50 });
    for (const sx of [-1, 1]) {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 340), seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(sx * 85, -0.02, -60);
      world.scenery.add(sea);
    }
  }
  world.snow = null;
  if (theme.id === 'salju') {
    // Butiran salju turun
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 26;
      pos[i * 3 + 2] = 8 - Math.random() * 100;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    world.snow = new THREE.Points(snowGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85 }));
    world.scenery.add(world.snow);
  }
  if (theme.id === 'neon') {
    // Bintang & bulan
    const starGeo = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 350; i++) {
      const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 50;
      pos.push(Math.cos(a) * r, 25 + Math.random() * 120, -Math.abs(Math.sin(a)) * r - 20);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.scenery.add(new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xf5f0dc, fog: false }));
    moon.position.set(-55, 75, -160);
    world.scenery.add(moon);
    // Gedung kota malam di cakrawala
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldNight1 : mats.bldNight2);
      const h = 18 + Math.random() * 30;
      b.scale.set(6 + Math.random() * 6, h, 6);
      b.position.set(-120 + i * 16 + (Math.random() - 0.5) * 8, h / 2, -125 - Math.random() * 15);
      world.scenery.add(b);
    }
  }
  // Awan (siang & senja)
  if (theme.id !== 'neon') {
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
      const n = 3 + (Math.random() * 3 | 0);
      for (let j = 0; j < n; j++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.6, 10, 8), puffMat);
        p.position.set(j * 2.1 - n, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6);
        p.scale.y = 0.62;
        cloud.add(p);
      }
      cloud.position.set((Math.random() - 0.5) * 160, 26 + Math.random() * 22, -40 - Math.random() * 110);
      world.scenery.add(cloud);
      world.clouds.push(cloud);
    }
  }

  // Dekorasi awal di sepanjang lintasan
  for (let z = 0; z > SPAWN_Z; z -= 7) spawnDeco(z);
}

// ---------- Dekorasi pinggir jalan ----------
function spawnDeco(z) {
  const { geoms, mats, id } = world.themeAssets;
  for (const side of [-1, 1]) {
    if (Math.random() < 0.25) continue;
    const x = side * (6 + Math.random() * 9);
    let mesh;
    if (id === 'kota') {
      if (Math.random() < 0.55) {
        // Pohon rindang
        mesh = new THREE.Group();
        const trunk = new THREE.Mesh(geoms.trunk, mats.trunk);
        trunk.position.y = 0.55;
        mesh.add(trunk);
        const n = 2 + (Math.random() * 2 | 0);
        for (let j = 0; j < n; j++) {
          const leaf = new THREE.Mesh(geoms.leaf, Math.random() < 0.5 ? mats.leaf1 : mats.leaf2);
          const s = 0.7 + Math.random() * 0.5;
          leaf.scale.setScalar(s);
          leaf.position.set((Math.random() - 0.5) * 0.7, 1.35 + Math.random() * 0.7, (Math.random() - 0.5) * 0.7);
          mesh.add(leaf);
        }
        mesh.position.set(x, 0, z);
      } else {
        mesh = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldDay1 : mats.bldDay2);
        const h = 5 + Math.random() * 11;
        mesh.scale.set(3 + Math.random() * 2.5, h, 3 + Math.random() * 2.5);
        mesh.position.set(x + side * 4, h / 2 - 0.05, z);
      }
    } else if (id === 'gurun') {
      if (Math.random() < 0.55) {
        mesh = new THREE.Group();
        const c = new THREE.Mesh(geoms.cactus, mats.cactus);
        const h = 0.9 + Math.random() * 0.9;
        c.scale.set(1, h, 1);
        c.position.y = h * 0.75;
        mesh.add(c);
        for (const asx of Math.random() < 0.7 ? [-1, 1] : [1]) {
          const arm = new THREE.Mesh(geoms.cactusArm, mats.cactus);
          arm.position.set(asx * 0.38, h * 0.8, 0);
          arm.rotation.z = asx * 0.7;
          mesh.add(arm);
        }
        mesh.position.set(x, 0, z);
      } else {
        mesh = new THREE.Mesh(geoms.rock, mats.rock);
        const s = 0.5 + Math.random() * 1.2;
        mesh.scale.setScalar(s);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.position.set(x, s * 0.5 - 0.1, z);
      }
    } else if (id === 'salju') {
      if (Math.random() < 0.7) {
        // Pohon cemara bersalju (tumpukan kerucut)
        mesh = new THREE.Group();
        const trunk = new THREE.Mesh(geoms.trunk, mats.trunk);
        trunk.position.y = 0.4;
        mesh.add(trunk);
        const h = 1.6 + Math.random() * 1.4;
        for (let j = 0; j < 3; j++) {
          const c = new THREE.Mesh(geoms.cone, mats.pine);
          const s = 1.15 - j * 0.3;
          c.scale.set(s, h * 0.42, s);
          c.position.y = 0.8 + j * h * 0.3;
          mesh.add(c);
          const snowCap = new THREE.Mesh(geoms.cone, mats.pineSnow);
          snowCap.scale.set(s * 0.7, h * 0.16, s * 0.7);
          snowCap.position.y = 0.8 + j * h * 0.3 + h * 0.16;
          mesh.add(snowCap);
        }
        mesh.position.set(x, 0, z);
      } else {
        mesh = new THREE.Mesh(geoms.rock, mats.pineSnow);
        const s = 0.5 + Math.random() * 1.0;
        mesh.scale.setScalar(s);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        mesh.position.set(x, s * 0.5 - 0.1, z);
      }
    } else if (id === 'pantai') {
      if (Math.random() < 0.6) {
        // Pohon palem: batang miring + daun menjuntai
        mesh = new THREE.Group();
        const h = 2.0 + Math.random() * 1.2;
        const trunk = new THREE.Mesh(geoms.trunk, mats.palmTrunk);
        trunk.scale.set(0.8, h / 1.1, 0.8);
        trunk.position.y = h / 2;
        trunk.rotation.z = (Math.random() - 0.5) * 0.3;
        mesh.add(trunk);
        const topX = -trunk.rotation.z * h;
        for (let j = 0; j < 6; j++) {
          const frond = new THREE.Mesh(geoms.frond, mats.frond);
          const a = (j / 6) * Math.PI * 2;
          frond.scale.set(1.6, 0.12, 0.45);
          frond.position.set(topX + Math.cos(a) * 0.7, h + 0.1 - Math.abs(Math.sin(j)) * 0.08, Math.sin(a) * 0.7);
          frond.rotation.y = -a;
          frond.rotation.z = 0.35;
          mesh.add(frond);
        }
        mesh.position.set(x, 0, z);
      } else {
        // Payung pantai
        mesh = new THREE.Group();
        const pole = new THREE.Mesh(geoms.pole, mats.pole);
        pole.scale.y = 0.7;
        pole.position.y = 0.8;
        mesh.add(pole);
        const top = new THREE.Mesh(geoms.cone, Math.random() < 0.5 ? mats.umbrella1 : mats.umbrella2);
        top.scale.set(1.1, 0.45, 1.1);
        top.position.y = 1.6;
        mesh.add(top);
        mesh.rotation.z = (Math.random() - 0.5) * 0.25;
        mesh.position.set(x, 0, z);
      }
    } else { // neon
      if (Math.random() < 0.5) {
        mesh = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldNight1 : mats.bldNight2);
        const h = 6 + Math.random() * 12;
        mesh.scale.set(3 + Math.random() * 2, h, 3 + Math.random() * 2);
        mesh.position.set(x + side * 4, h / 2 - 0.05, z);
      } else {
        mesh = new THREE.Mesh(geoms.pillar, Math.random() < 0.5 ? mats.neon1 : mats.neon2);
        const h = 3 + Math.random() * 8;
        mesh.scale.set(1, h, 1);
        mesh.position.set(x, h / 2 - 0.05, z);
      }
    }
    world.group.add(mesh);
    world.decos.push({ mesh });
  }
}

// ---------- Rintangan ----------
function spawnObstacle(type, lane, z) {
  const { geoms, mats } = world.themeAssets;
  let mesh;
  if (type === 'barrier') {
    mesh = new THREE.Group();
    const board = new THREE.Mesh(geoms.barrier, mats.hazard);
    board.position.y = 0.5;
    mesh.add(board);
    for (const sx of [-0.8, 0.8]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.5), mats.pole);
      foot.position.set(sx, 0.11, 0);
      mesh.add(foot);
    }
    mesh.position.set(LANES[lane], 0, z);
  } else if (type === 'block') {
    mesh = new THREE.Mesh(geoms.crate, mats.crate);
    mesh.position.set(LANES[lane], 1.15, z);
  } else { // overhang
    mesh = new THREE.Group();
    for (const sx of [-1.05, 1.05]) {
      const pole = new THREE.Mesh(geoms.pole, mats.pole);
      pole.position.set(sx, 1.2, 0);
      mesh.add(pole);
    }
    const bar = new THREE.Mesh(geoms.bar, mats.bar);
    bar.position.y = 1.55;
    mesh.add(bar);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.05), mats.hazard);
    sign.position.y = 1.32;
    mesh.add(sign);
    mesh.position.set(LANES[lane], 0, z);
  }
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.group.add(mesh);
  world.obstacles.push({ mesh, type, lane, z });
}

function spawnCoin(lane, z, y = 1.0) {
  const { geoms, mats } = world.themeAssets;
  const mesh = new THREE.Group();
  const disc = new THREE.Mesh(geoms.coin, mats.coin);
  disc.rotation.z = Math.PI / 2;
  mesh.add(disc);
  const rim = new THREE.Mesh(geoms.coinRim, mats.coin);
  mesh.add(rim);
  mesh.position.set(LANES[lane], y, z);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.group.add(mesh);
  world.coins.push({ mesh, lane });
}

// ---------- Item power-up (model 3D prosedural) ----------
function makePowerupMesh(type) {
  const g = new THREE.Group();
  if (type === 'magnet') {
    // Magnet tapal kuda merah
    const u = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 10, 16, Math.PI),
      new THREE.MeshToonMaterial({ color: 0xe33030, gradientMap, emissive: 0x551010 }));
    g.add(u);
    for (const sx of [-0.24, 0.24]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.19),
        new THREE.MeshToonMaterial({ color: 0xdddddd, gradientMap, emissive: 0x444444 }));
      tip.position.set(sx, -0.08, 0);
      g.add(tip);
    }
  } else if (type === 'shield') {
    // Gelembung perisai biru
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14),
      new THREE.MeshBasicMaterial({ color: 0x35b0e0, transparent: true, opacity: 0.45 }));
    g.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x8ae6ff }));
    g.add(ring);
  } else { // rocket
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 6, 12),
      new THREE.MeshToonMaterial({ color: 0xf2f2f2, gradientMap, emissive: 0x333333 }));
    g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 12),
      new THREE.MeshToonMaterial({ color: 0xe33030, gradientMap, emissive: 0x551010 }));
    nose.position.y = 0.35;
    g.add(nose);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.16),
        new THREE.MeshToonMaterial({ color: 0xe33030, gradientMap, emissive: 0x551010 }));
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.15, -0.22, Math.sin(a) * 0.15);
      fin.rotation.y = -a;
      g.add(fin);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa030 }));
    flame.position.y = -0.4;
    flame.rotation.x = Math.PI;
    g.add(flame);
  }
  return g;
}

function spawnPowerup(lane, z) {
  const types = Object.keys(POWER_DURATION);
  const type = types[(Math.random() * types.length) | 0];
  const mesh = makePowerupMesh(type);
  mesh.position.set(LANES[lane], 1.1, z);
  world.group.add(mesh);
  world.powerups.push({ mesh, type, lane, bob: Math.random() * Math.PI * 2 });
}

// ---------- Pola spawn ----------
function spawnPattern(z) {
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
  const r = Math.random();
  if (r < 0.28) {
    spawnObstacle('barrier', lanes[0], z);
    for (let i = -2; i <= 2; i++)
      spawnCoin(lanes[0], z + i * 1.4, 1.0 + Math.max(0, 1.1 - Math.abs(i) * 0.45));
    for (let i = 0; i < 3; i++) spawnCoin(lanes[1], z - i * 1.6);
  } else if (r < 0.52) {
    spawnObstacle('block', lanes[0], z);
    spawnObstacle('barrier', lanes[1], z);
    for (let i = 0; i < 4; i++) spawnCoin(lanes[2], z + 2 - i * 1.6);
  } else if (r < 0.72) {
    spawnObstacle('overhang', lanes[0], z);
    spawnObstacle('overhang', lanes[1], z);
    for (let i = 0; i < 3; i++) spawnCoin(lanes[0], z - 1 - i * 1.4, 0.75);
  } else if (r < 0.88) {
    spawnObstacle('block', lanes[0], z);
    spawnObstacle('block', lanes[1], z - 1.5);
    for (let i = 0; i < 5; i++) spawnCoin(lanes[2], z + 3 - i * 1.6);
  } else {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) spawnCoin(i, z - i * 2 - j * 1.5);
  }
  // Sesekali muncul power-up di lajur yang tidak terhalang block
  if (Math.random() < 0.16) {
    const blocked = world.obstacles
      .filter(o => o.type === 'block' && Math.abs(o.mesh.position.z - z) < 8)
      .map(o => o.lane);
    const free = [0, 1, 2].filter(l => !blocked.includes(l));
    spawnPowerup(free[(Math.random() * free.length) | 0], z - 9);
  }
}

// ============================================================
// Player & state game
// ============================================================
const game = {
  state: 'menu',
  charMesh: null,
  lane: 1, laneX: 0,
  y: 0, vy: 0,
  sliding: 0,
  runPhase: 0,
  speed: BASE_SPEED,
  distance: 0,
  nextSpawn: 30,
  nextDeco: 7,
  coins: 0,
  score: 0,
  time: 0,
  shake: 0,
  power: { magnet: 0, shield: 0, rocket: 0 },
  runPowerups: 0,
};

function setCharacter(cfg) {
  if (game.charMesh) scene.remove(game.charMesh);
  game.charMesh = buildCharacter(cfg);
  game.charMesh.position.set(0, 0, 0);

  // Gelembung shield (tampil saat power-up aktif)
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0x55c8f0, transparent: true, opacity: 0.28, depthWrite: false }));
  bubble.position.y = 1.0;
  bubble.visible = false;
  game.charMesh.add(bubble);
  game.charMesh.userData.shieldBubble = bubble;

  // Api roket di kaki (tampil saat sepatu roket aktif & melayang)
  const flames = new THREE.Group();
  for (const sx of [-0.15, 0.15]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa030 }));
    f.rotation.x = Math.PI;
    f.position.set(sx, -0.15, 0);
    flames.add(f);
  }
  flames.visible = false;
  game.charMesh.add(flames);
  game.charMesh.userData.rocketFlames = flames;

  scene.add(game.charMesh);
}

function resetRun() {
  clearList(world.obstacles);
  clearList(world.coins);
  clearList(world.powerups);
  trailFX.clear();
  game.power = { magnet: 0, shield: 0, rocket: 0 };
  game.runPowerups = 0;
  game.lane = 1; game.laneX = 0;
  game.y = 0; game.vy = 0;
  game.sliding = 0;
  game.speed = BASE_SPEED;
  game.distance = 0;
  game.nextSpawn = 35;
  game.coins = 0;
  game.score = 0;
  game.time = 0;
  game.shake = 0;
  game.charMesh.rotation.set(0, 0, 0);
  game.charMesh.position.set(0, 0, 0);
}

// ---------- Input ----------
function doJump() {
  if (game.state !== 'playing') return;
  if (game.y <= 0.01 && game.sliding <= 0) {
    game.vy = JUMP_VY * (game.power.rocket > 0 ? 1.45 : 1);
    AudioFX.jump();
  }
}
function doSlide() {
  if (game.state !== 'playing') return;
  if (game.y <= 0.01) { game.sliding = SLIDE_TIME; AudioFX.slide(); }
  else game.vy = -18;
}
function doMove(dir) {
  if (game.state !== 'playing') return;
  const n = THREE.MathUtils.clamp(game.lane + dir, 0, 2);
  if (n !== game.lane) { game.lane = n; AudioFX.click(); }
}

window.addEventListener('keydown', (e) => {
  if (game.state === 'menu') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') carouselMove(-1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') carouselMove(1);
    else if (e.code === 'Enter' || e.code === 'Space') $('btn-play').click();
    return;
  }
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': doMove(-1); break;
    case 'ArrowRight': case 'KeyD': doMove(1); break;
    case 'ArrowUp': case 'KeyW': case 'Space': doJump(); break;
    case 'ArrowDown': case 'KeyS': doSlide(); break;
    case 'KeyP': case 'Escape':
      if (game.state === 'playing') pauseGame();
      else if (game.state === 'paused') resumeGame();
      break;
  }
});

let touchStart = null;
window.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  const TH = 28;
  if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
  if (game.state === 'menu') {
    // Swipe di menu = ganti item carousel
    if (Math.abs(dx) > Math.abs(dy)) carouselMove(dx > 0 ? -1 : 1);
    return;
  }
  if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : -1);
  else if (dy < 0) doJump();
  else doSlide();
}, { passive: true });

// ============================================================
// Misi harian, papan peringkat, toast
// ============================================================
const MISSION_POOL = [
  { stat: 'coins',    kind: 'max', vals: [30, 50, 80],     reward: [60, 100, 150],  text: v => `Kumpulkan ${v} koin dalam satu lari` },
  { stat: 'dist',     kind: 'max', vals: [300, 500, 800],  reward: [60, 100, 150],  text: v => `Berlari ${v} m dalam satu lari` },
  { stat: 'coins',    kind: 'sum', vals: [100, 180],       reward: [80, 140],       text: v => `Kumpulkan total ${v} koin hari ini` },
  { stat: 'runs',     kind: 'sum', vals: [3, 5],           reward: [70, 120],       text: v => `Main ${v} kali hari ini` },
  { stat: 'powerups', kind: 'sum', vals: [4, 7],           reward: [80, 140],       text: v => `Ambil ${v} power-up hari ini` },
];

const todayKey = () => new Date().toISOString().slice(0, 10);
function hashStr(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Ambil misi hari ini; buat set baru (deterministik dari tanggal) jika ganti hari
function getMissions() {
  const t = todayKey();
  let data = store.missions;
  if (!data || data.date !== t) {
    const h = hashStr(t);
    const idxs = [];
    let i = 0;
    while (idxs.length < 3 && i < 30) {
      const cand = (h >> i) % MISSION_POOL.length;
      if (!idxs.includes(cand)) idxs.push(cand);
      i++;
    }
    for (let j = 0; idxs.length < 3; j++) if (!idxs.includes(j)) idxs.push(j);
    data = {
      date: t,
      list: idxs.map((pi, k) => ({ pi, vi: (h >> (k * 4)) % MISSION_POOL[pi].vals.length, progress: 0, done: false })),
    };
    store.missions = data;
  }
  return data;
}

// Terapkan hasil satu kali lari ke progres misi
function applyRunToMissions(stats) {
  const data = getMissions();
  let changed = false;
  for (const m of data.list) {
    if (m.done) continue;
    const pool = MISSION_POOL[m.pi];
    const v = stats[pool.stat] || 0;
    m.progress = pool.kind === 'max' ? Math.max(m.progress, v) : m.progress + v;
    if (m.progress >= pool.vals[m.vi]) {
      m.done = true;
      const reward = pool.reward[m.vi];
      store.coinsTotal += reward;
      toast(`🎯 Misi selesai! +${reward} 🪙`);
    }
    changed = true;
  }
  // Bonus peti misterius saat ketiga misi hari ini tuntas
  if (data.list.every(m => m.done) && !data.chestGiven) {
    data.chestGiven = true;
    store.chests++;
    toast('📦 Semua misi tuntas — dapat peti misterius!');
    changed = true;
  }
  if (changed) store.missions = data;
}

function renderMissions() {
  const data = getMissions();
  const missionsHtml = data.list.map(m => {
    const pool = MISSION_POOL[m.pi];
    const target = pool.vals[m.vi];
    const pct = Math.min(100, (m.progress / target) * 100);
    return `<div class="mission-item${m.done ? ' done' : ''}">
      <div class="mission-text"><span>${m.done ? '✅ ' : ''}${pool.text(target)}</span>
        <span class="mission-reward">+${pool.reward[m.vi]} 🪙</span></div>
      <div class="mission-progress"><div style="width:${pct}%"></div></div>
      <div class="mission-sub">${Math.min(Math.floor(m.progress), target)} / ${target}</div>
    </div>`;
  }).join('');

  // Prestasi permanen di bawah misi harian
  const vals = achValues();
  const claimed = store.ach;
  const achHtml = ACHIEVEMENTS.map(a => {
    const tier = claimed[a.id] || 0;
    const doneAll = tier >= a.tiers.length;
    const target = doneAll ? a.tiers[a.tiers.length - 1] : a.tiers[tier];
    const pct = Math.min(100, (vals[a.stat] / target) * 100);
    const medals = a.tiers.map((_, i) => i < tier ? ['🥉', '🥈', '🥇'][i] : '·').join(' ');
    return `<div class="mission-item${doneAll ? ' done' : ''}">
      <div class="mission-text"><span>${a.icon} ${a.name}</span>
        <span class="ach-tiers">${medals}</span></div>
      <div class="mission-progress"><div style="width:${pct}%"></div></div>
      <div class="mission-sub">${doneAll ? 'Tuntas! ' + a.fmt(target) : `Berikutnya: ${a.fmt(target)} (+${a.reward[tier]} 🪙)`}</div>
    </div>`;
  }).join('');

  $('mission-list').innerHTML = missionsHtml +
    '<div class="list-divider">🏆 Prestasi</div>' + achHtml;
}

// Papan peringkat lokal (top 10 lari terbaik)
function saveToBoard(entry) {
  const board = store.board;
  board.push(entry);
  board.sort((a, b) => b.s - a.s);
  store.board = board.slice(0, 10);
}

function renderBoard() {
  const board = store.board;
  const medals = ['🥇', '🥈', '🥉'];
  $('board-list').innerHTML = board.length === 0
    ? '<div class="board-empty">Belum ada skor — ayo main dulu!</div>'
    : board.map((e, i) => {
      const ch = CHARACTERS.find(c => c.id === e.c);
      return `<div class="board-item">
        <div class="board-rank">${medals[i] || i + 1}</div>
        <div><div>${ch ? ch.name : '?'}</div>
          <div class="board-meta">${e.d} m · ${e.t}</div></div>
        <div class="board-score">${e.s}</div>
      </div>`;
    }).join('');
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ============================================================
// Hadiah login harian (siklus 7 hari, streak putus jika bolong)
// ============================================================
function dailyInfo() {
  const t = todayKey();
  const L = store.login;
  const claimedToday = L.last === t;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const nextStreak = claimedToday ? L.streak : (L.last === yesterday ? L.streak + 1 : 1);
  const day = ((nextStreak - 1) % 7) + 1; // hari ke-1..7 dalam siklus
  return { claimedToday, nextStreak, day };
}

function renderDaily() {
  const { claimedToday, nextStreak, day } = dailyInfo();
  $('daily-streak-text').textContent = claimedToday
    ? `🔥 Streak ${nextStreak} hari — sudah diambil, kembali besok!`
    : `🔥 Streak ${nextStreak} hari — ambil hadiah hari ke-${day}!`;
  $('daily-grid').innerHTML = LOGIN_REWARDS.map((r, i) => {
    const d = i + 1;
    const cls = ['login-card'];
    if (d === 7) cls.push('day7');
    if (d < day || (d === day && claimedToday)) cls.push('claimed');
    if (d === day && !claimedToday) cls.push('today');
    return `<div class="${cls.join(' ')}">
      <div class="d">Hari ${d}</div>
      <div class="r">🪙 ${r.coins}${r.chest ? ' +📦' : ''}</div>
    </div>`;
  }).join('');
  const btn = $('btn-daily-claim');
  btn.disabled = claimedToday;
  btn.style.opacity = claimedToday ? 0.4 : 1;
  btn.textContent = claimedToday ? 'SUDAH DIAMBIL ✓' : 'AMBIL HADIAH';
}

function claimDaily() {
  const { claimedToday, nextStreak, day } = dailyInfo();
  if (claimedToday) return;
  const r = LOGIN_REWARDS[day - 1];
  store.coinsTotal += r.coins;
  if (r.chest) store.chests++;
  store.login = { last: todayKey(), streak: nextStreak };
  AudioFX.powerup();
  toast(`🎁 Hari ${day}: +${r.coins} 🪙${r.chest ? ' + peti misterius!' : ''}`);
  checkAchievements();
  renderDaily();
  refreshMenu();
}

// ============================================================
// Roda hadiah
// ============================================================
const wheel = { spinning: false, angle: 0 };

function renderWheel() {
  const el = $('wheel');
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = WHEEL_PRIZES.map((p, i) => {
      const ang = i * 45 + 22.5;
      return `<div class="wheel-label" style="transform:rotate(${ang}deg) translate(0,-105px) rotate(${-ang}deg) translate(-50%,-50%)">${p.label}</div>`;
    }).join('');
  }
  const free = store.wheelLast !== todayKey();
  $('btn-spin').textContent = wheel.spinning ? '...' : (free ? 'PUTAR — GRATIS!' : `PUTAR — 🪙 ${WHEEL_EXTRA_COST}`);
}

function spinWheel() {
  if (wheel.spinning) return;
  const free = store.wheelLast !== todayKey();
  if (!free) {
    if (store.coinsTotal < WHEEL_EXTRA_COST) { toast(`Koin kurang! Putaran ekstra 🪙 ${WHEEL_EXTRA_COST}`); return; }
    store.coinsTotal -= WHEEL_EXTRA_COST;
  } else {
    store.wheelLast = todayKey();
  }
  wheel.spinning = true;
  renderWheel();
  AudioFX.click();
  const target = (Math.random() * WHEEL_PRIZES.length) | 0;
  // Putar >=5 kali lipat + berhenti dengan pusat segmen target di penunjuk atas
  const desired = (360 - (target * 45 + 22.5)) % 360;
  const cur = ((wheel.angle % 360) + 360) % 360;
  wheel.angle += 5 * 360 + ((desired - cur + 360) % 360);
  $('wheel').style.transform = `rotate(${wheel.angle}deg)`;
  setTimeout(() => {
    wheel.spinning = false;
    const p = WHEEL_PRIZES[target];
    if (p.coins) {
      store.coinsTotal += p.coins;
      toast(`${p.jackpot ? '💰 JACKPOT! ' : '🎡 '}+${p.coins} 🪙`);
    } else {
      const v = store.vouchers;
      v[p.voucher]++;
      store.vouchers = v;
      toast(`🎡 Voucher ${POWER_INFO[p.voucher].icon} ${POWER_INFO[p.voucher].name} — aktif otomatis di lari berikutnya!`);
    }
    AudioFX.powerup();
    renderWheel();
    refreshMenu();
  }, 3400);
}

// ============================================================
// Peti misterius
// ============================================================
function maybeShowChest() {
  if (store.chests <= 0 || game.state !== 'menu') return;
  $('chest-sub').textContent = store.chests > 1 ? `Kamu punya ${store.chests} peti misterius!` : 'Kamu mendapat peti misterius!';
  $('chest-box').classList.remove('opened');
  $('chest-box').textContent = '🎁';
  $('chest-result').classList.add('hidden');
  $('btn-chest-open').classList.remove('hidden');
  $('btn-chest-close').classList.add('hidden');
  showScreen('menu', 'chest');
}

function openChest() {
  if (store.chests <= 0) return;
  store.chests--;
  const r = Math.random();
  let text;
  if (r < 0.55) {
    const c = 50 + 10 * ((Math.random() * 20) | 0); // 50–240
    store.coinsTotal += c;
    text = `+${c} 🪙`;
  } else if (r < 0.85) {
    const c = 300 + 10 * ((Math.random() * 20) | 0); // 300–490
    store.coinsTotal += c;
    text = `💰 +${c} 🪙`;
  } else {
    const types = Object.keys(POWER_INFO);
    const t = types[(Math.random() * types.length) | 0];
    const v = store.vouchers;
    v[t]++;
    store.vouchers = v;
    text = `${POWER_INFO[t].icon} Voucher ${POWER_INFO[t].name}!`;
  }
  AudioFX.powerup();
  $('chest-box').classList.add('opened');
  $('chest-box').textContent = '✨';
  const res = $('chest-result');
  res.textContent = text;
  res.classList.remove('hidden');
  $('btn-chest-open').classList.add('hidden');
  $('btn-chest-close').classList.remove('hidden');
  refreshMenu();
}

// ============================================================
// Prestasi permanen (klaim otomatis + toast)
// ============================================================
function achValues() {
  const s = store.stats;
  return { dist: s.dist, coins: s.coins, runs: s.runs, powerups: s.powerups, streak: store.login.streak, level: levelInfo().lvl };
}

function checkAchievements() {
  const vals = achValues();
  const claimed = store.ach;
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    let tier = claimed[a.id] || 0;
    while (tier < a.tiers.length && vals[a.stat] >= a.tiers[tier]) {
      store.coinsTotal += a.reward[tier];
      toast(`${a.icon} Prestasi: ${a.name} (${a.fmt(a.tiers[tier])}) +${a.reward[tier]} 🪙`);
      tier++;
      changed = true;
    }
    claimed[a.id] = tier;
  }
  if (changed) { store.ach = claimed; AudioFX.powerup(); }
  else store.ach = claimed;
}

// ============================================================
// Profil: statistik & upgrade power-up
// ============================================================
function renderProfile() {
  const s = store.stats;
  const li = levelInfo();
  const cards = [
    ['Total Jarak', s.dist >= 1000 ? (s.dist / 1000).toFixed(1) + ' km' : s.dist + ' m'],
    ['Total Koin', s.coins.toLocaleString('id-ID')],
    ['Total Main', s.runs + '×'],
    ['Power-up', s.powerups + '×'],
    ['Level', li.lvl],
    ['Streak', '🔥 ' + store.login.streak + ' hari'],
  ];
  $('stats-grid').innerHTML = cards.map(([l, v]) =>
    `<div class="stat-card"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');

  const up = store.pupgrades;
  $('upgrade-list').innerHTML = Object.keys(POWER_INFO).map(k => {
    const lvl = up[k];
    const maxed = lvl >= UPGRADE_MAX;
    const pips = Array.from({ length: UPGRADE_MAX }, (_, i) =>
      `<span class="pip${i < lvl ? ' on' : ''}"></span>`).join('');
    return `<div class="upgrade-row">
      <div class="upgrade-ico">${POWER_INFO[k].icon}</div>
      <div class="upgrade-info">
        <div class="upgrade-name">${POWER_INFO[k].name}</div>
        <div class="upgrade-lvl">Durasi ${powerDuration(k).toFixed(1)} dtk</div>
        <div class="upgrade-pips">${pips}</div>
      </div>
      <button class="btn-upgrade" data-up="${k}" ${maxed ? 'disabled' : ''}>
        ${maxed ? 'MAX' : `🪙 ${upgradeCost(lvl)}`}
      </button>
    </div>`;
  }).join('');
  $('upgrade-list').querySelectorAll('.btn-upgrade').forEach(b =>
    b.addEventListener('click', () => buyUpgrade(b.dataset.up)));
}

function buyUpgrade(type) {
  const up = store.pupgrades;
  const lvl = up[type];
  if (lvl >= UPGRADE_MAX) return;
  const cost = upgradeCost(lvl);
  if (store.coinsTotal < cost) { toast(`Koin kurang! Butuh 🪙 ${cost}`); return; }
  store.coinsTotal -= cost;
  up[type]++;
  store.pupgrades = up;
  AudioFX.powerup();
  toast(`⚡ ${POWER_INFO[type].name} level ${up[type]} — durasi ${powerDuration(type).toFixed(1)} dtk!`);
  renderProfile();
  refreshMenu();
}

// ============================================================
// UI
// ============================================================
const $ = (id) => document.getElementById(id);
const screens = {
  menu: $('menu'), hud: $('hud'), pause: $('pause-screen'), gameover: $('gameover'),
  missions: $('missions-screen'), board: $('board-screen'),
  daily: $('daily-screen'), wheel: $('wheel-screen'),
  chest: $('chest-screen'), profile: $('profile-screen'),
};

function showScreen(...names) {
  for (const k in screens) screens[k].classList.toggle('hidden', !names.includes(k));
}

// ---------- Menu: tab + carousel ----------
const KOLEKSI = [...PETS, ...TRAILS];
const menuState = {
  tab: 'karakter', // 'karakter' | 'tema' | 'koleksi'
  charIdx: Math.max(0, CHARACTERS.findIndex(c => c.id === store.charId)),
  themeIdx: Math.max(0, THEMES.findIndex(t => t.id === store.themeId)),
  kolIdx: 0,
  buyArmed: false, // tap pertama tombol BELI = konfirmasi
};

function tryBuy(item, ownedKey) {
  if (store.coinsTotal < item.price) {
    toast(`Koin kurang! Butuh 🪙 ${item.price}, punyamu 🪙 ${store.coinsTotal}`);
    return false;
  }
  store.coinsTotal -= item.price;
  store[ownedKey] = [...store[ownedKey], item.id];
  AudioFX.powerup();
  toast(`🎉 ${item.name} terbuka!`);
  return true;
}

function levelInfo() {
  const xp = store.xp;
  const lvl = Math.floor(Math.sqrt(xp / 500)) + 1;
  const start = 500 * (lvl - 1) * (lvl - 1);
  const next = 500 * lvl * lvl;
  return { lvl, pct: Math.min(100, ((xp - start) / (next - start)) * 100) };
}

function carouselItem() {
  if (menuState.tab === 'tema') return { list: THEMES, idx: menuState.themeIdx, ownedKey: 'ownedThemes' };
  if (menuState.tab === 'koleksi') {
    const it = KOLEKSI[menuState.kolIdx];
    return { list: KOLEKSI, idx: menuState.kolIdx, ownedKey: it.kind === 'pet' ? 'ownedPets' : 'ownedTrails' };
  }
  return { list: CHARACTERS, idx: menuState.charIdx, ownedKey: 'ownedChars' };
}

function refreshMenu() {
  const { list, idx, ownedKey } = carouselItem();
  const it = list[idx];
  const ownedIds = store[ownedKey];
  const owned = it.price === 0 || ownedIds.includes(it.id);
  menuState.buyArmed = false;

  $('car-name').textContent = it.name.toUpperCase();
  $('car-desc').textContent = owned ? it.desc : `${it.desc} · 🔒 terkunci`;
  $('car-dots').innerHTML = list.map((x, i) => {
    const xOwned = x.price === 0 || ownedIds.includes(x.id);
    return `<span class="dot${i === idx ? ' on' : ''}${xOwned ? '' : ' locked-dot'}" data-i="${i}"></span>`;
  }).join('');
  $('car-dots').querySelectorAll('.dot').forEach(d =>
    d.addEventListener('click', () => carouselGo(+d.dataset.i)));

  // Pratinjau 3D langsung + pilih otomatis jika sudah dimiliki
  if (menuState.tab === 'tema') {
    trailFX.previewId = null;
    applyPet(); // kembalikan pet yang sedang dipakai
    buildTheme(it);
    if (owned) store.themeId = it.id;
  } else if (menuState.tab === 'koleksi') {
    // Karakter tetap tampil; pet/trail yang disorot dipratinjau walau terkunci
    if (it.kind === 'pet') {
      applyPet(it.id);
      trailFX.previewId = null;
      if (owned) { store.petId = it.id; }
    } else {
      applyPet();                 // tampilkan pet aktif sebagai pendamping
      trailFX.previewId = it.id;  // pratinjau efek trail
      if (owned) { store.trailId = it.id; }
    }
  } else {
    trailFX.previewId = null;
    applyPet();
    setCharacter(it);
    if (owned) store.charId = it.id;
  }

  const play = $('btn-play');
  play.classList.toggle('buy', !owned);
  play.innerHTML = owned ? '▷&nbsp; MAIN' : `🔒&nbsp; BELI — 🪙 ${it.price}`;

  $('menu-coins-val').textContent = store.coinsTotal.toLocaleString('id-ID');
  $('menu-best').textContent = `🏆 SKOR TERBAIK: ${store.best}`;
  $('side-best').textContent = store.best.toLocaleString('id-ID');
  const li = levelInfo();
  $('side-level').textContent = li.lvl;
  $('level-fill').style.width = li.pct + '%';

  // Titik merah: hadiah harian & putaran gratis yang belum diambil
  $('daily-dot').classList.toggle('hidden', dailyInfo().claimedToday);
  $('wheel-dot').classList.toggle('hidden', store.wheelLast === todayKey());
}

function carouselGo(i) {
  AudioFX.click();
  const { list } = carouselItem();
  const idx = ((i % list.length) + list.length) % list.length;
  if (menuState.tab === 'tema') menuState.themeIdx = idx;
  else if (menuState.tab === 'koleksi') menuState.kolIdx = idx;
  else menuState.charIdx = idx;
  refreshMenu();
}
const carouselMove = (dir) => carouselGo(carouselItem().idx + dir);

function setTab(tab) {
  AudioFX.click();
  if (tab === 'misi') { renderMissions(); showScreen('menu', 'missions'); return; }
  if (tab === 'peringkat') { renderBoard(); showScreen('menu', 'board'); return; }
  menuState.tab = tab; // 'karakter' | 'tema' | 'koleksi'
  document.querySelectorAll('.tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  refreshMenu();
}

function startGame() {
  AudioFX.click();
  resetRun();
  // Voucher power-up dari roda/peti aktif otomatis di awal lari
  const v = store.vouchers;
  let used = [];
  for (const k in v) {
    if (v[k] > 0) {
      v[k]--;
      game.power[k] = powerDuration(k);
      used.push(POWER_INFO[k].icon);
    }
  }
  if (used.length) {
    store.vouchers = v;
    toast(`Voucher aktif: ${used.join(' ')}`);
  }
  game.state = 'playing';
  showScreen('hud');
}
function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  showScreen('hud', 'pause');
}
function resumeGame() {
  game.state = 'playing';
  showScreen('hud');
}
function backToMenu() {
  AudioFX.click();
  resetRun();
  game.state = 'menu';
  showScreen('menu');
  refreshMenu();
  maybeShowChest(); // peti menunggu? tawarkan buka
}
function gameOver() {
  game.state = 'gameover';
  AudioFX.crash();
  game.shake = 0.5;
  const isRecord = game.score > store.best;
  if (isRecord) store.best = game.score;

  // Setor koin ke saldo, catat ke misi harian & papan peringkat
  store.coinsTotal += game.coins;
  applyRunToMissions({
    coins: game.coins,
    dist: Math.floor(game.distance),
    powerups: game.runPowerups,
    runs: 1,
  });
  saveToBoard({
    s: game.score,
    d: Math.floor(game.distance),
    c: store.charId,
    t: todayKey(),
  });

  // XP & hadiah naik level
  const lvlBefore = levelInfo().lvl;
  store.xp += game.score;
  const lvlAfter = levelInfo().lvl;
  if (lvlAfter > lvlBefore) {
    let bonus = 0;
    for (let l = lvlBefore + 1; l <= lvlAfter; l++) bonus += 100 * l;
    store.coinsTotal += bonus;
    toast(`⭐ Naik ke Level ${lvlAfter}! +${bonus} 🪙`);
  }

  // Statistik seumur hidup + cek prestasi
  const st = store.stats;
  st.dist += Math.floor(game.distance);
  st.coins += game.coins;
  st.runs += 1;
  st.powerups += game.runPowerups;
  store.stats = st;
  checkAchievements();

  // Peluang peti misterius untuk lari yang jauh
  if (game.distance >= 500 && Math.random() < 0.25) {
    store.chests++;
    toast('📦 Kamu menemukan peti misterius!');
  }

  $('go-score').textContent = game.score;
  $('go-best').textContent = `🏆 TERBAIK: ${store.best}`;
  $('go-dist').textContent = Math.floor(game.distance);
  $('go-coins').textContent = game.coins;
  const pct = store.best > 0 ? Math.min(100, (game.score / store.best) * 100) : 100;
  $('go-progress-fill').style.width = pct + '%';
  const note = $('go-note');
  note.textContent = isRecord ? '🎉 Rekor baru — luar biasa!'
    : pct >= 80 ? 'Nyaris memecahkan rekor!'
    : pct >= 45 ? 'Lumayan! Terus berlatih.'
    : 'Ayo coba lagi!';
  note.classList.toggle('new-record', isRecord);
  setTimeout(() => showScreen('hud', 'gameover'), 600);
}

// Tombol MAIN merangkap tombol BELI untuk item terkunci (dua tap: konfirmasi lalu beli)
$('btn-play').addEventListener('click', () => {
  const { list, idx, ownedKey } = carouselItem();
  const it = list[idx];
  const owned = it.price === 0 || store[ownedKey].includes(it.id);
  if (owned) { startGame(); return; }
  AudioFX.click();
  if (!menuState.buyArmed) {
    menuState.buyArmed = true;
    $('btn-play').innerHTML = store.coinsTotal >= it.price
      ? `🪙 ${it.price}&nbsp;— TAP LAGI!` : '🪙 KOIN KURANG!';
    setTimeout(() => { if (menuState.buyArmed) refreshMenu(); }, 2600);
    return;
  }
  if (tryBuy(it, ownedKey)) refreshMenu();
  else refreshMenu();
});
$('btn-restart').addEventListener('click', () => { AudioFX.click(); startGame(); });
$('btn-menu').addEventListener('click', backToMenu);
$('btn-pause').addEventListener('click', () => { AudioFX.click(); pauseGame(); });
$('btn-resume').addEventListener('click', () => { AudioFX.click(); resumeGame(); });
$('btn-pause-menu').addEventListener('click', backToMenu);
$('btn-missions-close').addEventListener('click', () => { AudioFX.click(); showScreen('menu'); });
$('btn-board-close').addEventListener('click', () => { AudioFX.click(); showScreen('menu'); });
$('car-prev').addEventListener('click', () => carouselMove(-1));
$('car-next').addEventListener('click', () => carouselMove(1));
document.querySelectorAll('.tab').forEach(b =>
  b.addEventListener('click', () => setTab(b.dataset.tab)));

// Hadiah harian, roda, peti, profil
$('btn-daily').addEventListener('click', () => { AudioFX.click(); renderDaily(); showScreen('menu', 'daily'); });
$('btn-daily-claim').addEventListener('click', claimDaily);
$('btn-daily-close').addEventListener('click', () => { AudioFX.click(); showScreen('menu'); maybeShowChest(); });
$('btn-wheel').addEventListener('click', () => { AudioFX.click(); renderWheel(); showScreen('menu', 'wheel'); });
$('btn-spin').addEventListener('click', spinWheel);
$('btn-wheel-close').addEventListener('click', () => { AudioFX.click(); if (!wheel.spinning) showScreen('menu'); });
$('btn-chest-open').addEventListener('click', openChest);
$('btn-chest-close').addEventListener('click', () => { AudioFX.click(); showScreen('menu'); maybeShowChest(); });
$('btn-profile').addEventListener('click', () => { AudioFX.click(); renderProfile(); showScreen('menu', 'profile'); });
$('btn-profile-close').addEventListener('click', () => { AudioFX.click(); showScreen('menu'); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') pauseGame();
});

// ============================================================
// Update loop
// ============================================================
function moveWorld(dt) {
  const dz = game.speed * dt;
  game.distance += dz;

  for (const seg of world.roadSegs) {
    seg.position.z += dz;
    if (seg.position.z > DESPAWN_Z + 6) seg.position.z -= world.roadSegs.length * 10;
  }
  for (let i = world.decos.length - 1; i >= 0; i--) {
    const d = world.decos[i];
    d.mesh.position.z += dz;
    if (d.mesh.position.z > DESPAWN_Z + 10) {
      world.group.remove(d.mesh);
      world.decos.splice(i, 1);
    }
  }
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const o = world.obstacles[i];
    o.mesh.position.z += dz;
    o.z = o.mesh.position.z;
    if (o.z > DESPAWN_Z) { world.group.remove(o.mesh); world.obstacles.splice(i, 1); }
  }
  for (let i = world.coins.length - 1; i >= 0; i--) {
    const c = world.coins[i];
    c.mesh.position.z += dz;
    c.mesh.rotation.y += dt * 4;
    // Magnet: sedot koin di dekat pemain dari lajur mana pun
    if (game.power.magnet > 0 && c.mesh.position.z > -14) {
      const p = c.mesh.position;
      const pull = Math.min(1, dt * 9);
      p.x += (game.laneX - p.x) * pull;
      p.y += (game.y + 0.9 - p.y) * pull;
    }
    if (c.mesh.position.z > DESPAWN_Z) { world.group.remove(c.mesh); world.coins.splice(i, 1); }
  }
  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const p = world.powerups[i];
    p.mesh.position.z += dz;
    p.mesh.rotation.y += dt * 2.5;
    p.mesh.position.y = 1.1 + Math.sin(performance.now() * 0.004 + p.bob) * 0.12;
    if (p.mesh.position.z > DESPAWN_Z) { world.group.remove(p.mesh); world.powerups.splice(i, 1); }
  }
  // Awan bergeser pelan
  for (const cloud of world.clouds) {
    cloud.position.x += dt * 0.6;
    if (cloud.position.x > 90) cloud.position.x = -90;
  }
  // Salju turun (tema salju)
  if (world.snow) {
    const pos = world.snow.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 3.2;
      if (y < 0) y = 24 + Math.random() * 2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(performance.now() * 0.001 + i) * dt * 0.4);
    }
    pos.needsUpdate = true;
  }

  if (game.distance > game.nextSpawn) {
    spawnPattern(SPAWN_Z);
    game.nextSpawn = game.distance + 16 + Math.random() * 10;
  }
  if (game.distance > game.nextDeco) {
    spawnDeco(SPAWN_Z - Math.random() * 8);
    game.nextDeco = game.distance + 6;
  }
}

function updatePlayer(dt) {
  const targetX = LANES[game.lane];
  game.laneX += (targetX - game.laneX) * Math.min(1, dt * 11);

  if (game.y > 0 || game.vy !== 0) {
    game.vy += GRAVITY * dt;
    game.y += game.vy * dt;
    if (game.y <= 0) { game.y = 0; game.vy = 0; }
  }
  if (game.sliding > 0) game.sliding -= dt;

  const ch = game.charMesh;
  ch.position.x = game.laneX;
  ch.position.y = game.y;
  ch.rotation.z = (game.laneX - targetX) * 0.14;

  const { arms, legs } = ch.userData;
  if (game.y > 0.01) {
    legs[0].rotation.x = -0.7; legs[1].rotation.x = 0.5;
    arms[0].rotation.x = -2.4; arms[1].rotation.x = -2.4;
    ch.rotation.x = 0.12;
  } else if (game.sliding > 0) {
    ch.rotation.x = -1.15;
    ch.position.y = -0.25;
    legs[0].rotation.x = 0.3; legs[1].rotation.x = -0.2;
    arms[0].rotation.x = -0.5; arms[1].rotation.x = -0.5;
  } else {
    ch.rotation.x = 0.09;
    game.runPhase += dt * (6 + game.speed * 0.55);
    const s = Math.sin(game.runPhase);
    legs[0].rotation.x = s * 1.0;
    legs[1].rotation.x = -s * 1.0;
    arms[0].rotation.x = -s * 0.9;
    arms[1].rotation.x = s * 0.9;
    ch.position.y = Math.abs(Math.cos(game.runPhase)) * 0.08;
  }

  // Pet melayang mengikuti pemain
  if (petMesh) {
    const t = performance.now() * 0.001;
    const tx = game.laneX + 1.05;
    const ty = 1.55 + game.y * 0.6 + Math.sin(t * 2.2) * 0.12;
    petMesh.position.x += (tx - petMesh.position.x) * Math.min(1, dt * 6);
    petMesh.position.y += (ty - petMesh.position.y) * Math.min(1, dt * 6);
    petMesh.position.z = 0.35;
    petMesh.rotation.z = Math.sin(t * 2.2) * 0.1;
    if (petMesh.userData.anim) petMesh.userData.anim(t);
  }

  // Partikel trail saat berlari di tanah (gameplay),
  // atau saat memratinjau trail di tab Koleksi (menu)
  const emitTrail = (game.state === 'playing' && game.y <= 0.01 && game.sliding <= 0)
    || (game.state === 'menu' && menuState.tab === 'koleksi' && trailFX.previewId);
  if (emitTrail) {
    trailFX.timer -= dt;
    if (trailFX.timer <= 0) {
      trailFX.timer = 0.045;
      trailFX.spawn(game.laneX, 0.15, 0.45);
    }
  }
}

function checkCollisions() {
  const px = game.laneX;
  for (let i = world.coins.length - 1; i >= 0; i--) {
    const c = world.coins[i];
    const m = c.mesh.position;
    if (Math.abs(m.z) < 0.8 && Math.abs(m.x - px) < 0.7 && Math.abs(m.y - (game.y + 0.9)) < 1.1) {
      world.group.remove(c.mesh);
      world.coins.splice(i, 1);
      game.coins++;
      AudioFX.coin();
    }
  }
  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const p = world.powerups[i];
    const m = p.mesh.position;
    if (Math.abs(m.z) < 0.9 && Math.abs(m.x - px) < 0.9 && Math.abs(m.y - (game.y + 0.9)) < 1.3) {
      world.group.remove(p.mesh);
      world.powerups.splice(i, 1);
      game.power[p.type] = powerDuration(p.type);
      game.runPowerups++;
      AudioFX.powerup();
    }
  }
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const o = world.obstacles[i];
    const depth = o.type === 'block' ? 1.0 : 0.5;
    if (Math.abs(o.z) > depth / 2 + 0.35) continue;
    if (Math.abs(LANES[o.lane] - px) > 1.1) continue;
    let hit = false;
    if (o.type === 'barrier') {
      hit = game.y < 0.75;
    } else if (o.type === 'overhang') {
      hit = game.sliding <= 0 && game.y < 2.0; // lompatan roket bisa melewatinya
    } else {
      hit = game.y < 2.3; // block pun bisa dilompati dengan roket
    }
    if (!hit) continue;
    if (game.power.shield > 0) {
      // Shield menahan satu tabrakan: rintangan hancur, lari lanjut
      game.power.shield = 0;
      world.group.remove(o.mesh);
      world.obstacles.splice(i, 1);
      game.shake = 0.3;
      AudioFX.shieldBreak();
      continue;
    }
    return true;
  }
  return false;
}

function updateCamera(dt) {
  let cx = game.laneX * 0.45;
  let cy = 4.1, cz = 6.4;
  if (game.state === 'menu') {
    if (menuState.tab === 'tema') { cx = 0; cy = 4.6; cz = 7.5; }        // seperti gameplay: pamerkan dunia
    else if (menuState.tab === 'koleksi') { cx = 0; cy = 3.3; cz = 5.6; } // dari belakang: pet & trail seperti saat main
    else { cx = 0; cy = 1.65; cz = -3.7; }                              // dari depan: karakter di tengah
  }
  if (game.shake > 0) {
    game.shake -= dt;
    cx += (Math.random() - 0.5) * game.shake * 0.9;
    cy += (Math.random() - 0.5) * game.shake * 0.9;
  }
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 5));
  const menuChar = game.state === 'menu' && menuState.tab !== 'tema';
  const lookTarget = game.state === 'menu' && menuState.tab === 'koleksi'
    ? new THREE.Vector3(0.15, 1.2, -3)   // ke depan seperti gameplay
    : menuChar ? new THREE.Vector3(0, 1.15, 0)
    : new THREE.Vector3(game.laneX * 0.3, 1.3, -5);
  camera.lookAt(lookTarget);
}

// Efek visual & indikator HUD power-up
function updatePowerFX() {
  const ud = game.charMesh.userData;
  if (ud.shieldBubble) ud.shieldBubble.visible = game.power.shield > 0;
  if (ud.rocketFlames) ud.rocketFlames.visible = game.power.rocket > 0 && game.y > 0.01;

  const el = $('powerups');
  const active = Object.keys(game.power).filter(k => game.power[k] > 0);
  const key = active.join(',');
  if (el.dataset.active !== key) { // susunan power aktif berubah → bangun ulang
    el.dataset.active = key;
    el.innerHTML = active.map(k =>
      `<div class="power-pill"><span>${POWER_INFO[k].icon}</span>
        <div class="power-bar"><div></div></div></div>`).join('');
  }
  el.querySelectorAll('.power-bar > div').forEach((bar, i) => {
    bar.style.width = (game.power[active[i]] / powerDuration(active[i])) * 100 + '%';
  });
}

let lastT = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (game.state === 'playing') {
    game.time += dt;
    game.speed = Math.min(MAX_SPEED, BASE_SPEED + game.time * 0.35);
    for (const k in game.power) game.power[k] = Math.max(0, game.power[k] - dt);
    moveWorld(dt);
    updatePlayer(dt);
    trailFX.update(dt, game.speed * dt);
    if (checkCollisions()) gameOver();
    game.score = Math.floor(game.distance) + game.coins * 10;
    $('hud-score').textContent = game.score;
    $('hud-coins-val').textContent = game.coins;
    updatePowerFX();
  } else if (game.state === 'menu') {
    game.speed = 4;
    moveWorld(dt * 0.6);
    game.nextSpawn = game.distance + 999;
    updatePlayer(dt);
    trailFX.update(dt, game.speed * dt * 0.6); // pratinjau trail koleksi ikut bergerak
    // Kamera menu ada di depan karakter — cukup goyangan kecil agar wajah terlihat
    game.charMesh.rotation.y = Math.sin(now * 0.0006) * 0.3;
  } else if (game.state === 'gameover') {
    if (game.charMesh.rotation.x < 1.4) game.charMesh.rotation.x += dt * 5;
    updateCamera(dt);
    renderer.render(scene, camera);
    return;
  }

  updateCamera(dt);
  renderer.render(scene, camera);
}

// ============================================================
// Mulai
// ============================================================
buildTheme(THEMES.find(t => t.id === store.themeId) || THEMES[0]);
setCharacter(CHARACTERS.find(c => c.id === store.charId) || CHARACTERS[0]);
applyPet();
refreshMenu();
showScreen('menu');
// Sambut pemain dengan hadiah harian jika belum diambil
if (!dailyInfo().claimedToday) { renderDaily(); showScreen('menu', 'daily'); }
requestAnimationFrame(tick);

// Handle debug untuk inspeksi dari luar modul
window.__dbg = { renderer, scene, camera, game, world, updatePlayer, updateCamera, spawnPattern, spawnCoin, spawnObstacle, spawnPowerup, updatePowerFX, buildTheme, setCharacter, refreshMenu, getMissions, applyRunToMissions, renderMissions, renderBoard, saveToBoard, THEMES, CHARACTERS, PETS, TRAILS, store, toast, checkCollisions, gameOver, moveWorld, dailyInfo, claimDaily, renderDaily, spinWheel, renderWheel, openChest, maybeShowChest, checkAchievements, achValues, renderProfile, buyUpgrade, applyPet, buildPetMesh, trailFX, powerDuration, levelInfo, setTab, carouselGo };

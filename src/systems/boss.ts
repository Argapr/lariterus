// ============================================================
// Mode Petualangan: peta stage, arsenal, pra-bos & tempur bos
// ============================================================
import * as THREE from 'three';
import { scene, camera, renderer } from '../core/three';
import { game, world, menuState, clearList } from '../core/state';
import { store } from '../core/store';
import { AudioFX } from '../core/audio';
import { WEAPON_UPGRADE_MAX, weaponUpgradeCost } from '../core/constants';
import { buildTheme } from '../gfx/world';
import { buildBoss } from '../gfx/bossMesh';
import { buildWeaponMesh, buildBullet } from '../gfx/weaponMesh';
import { AnimatedCharacter } from '../gfx/animatedCharacter';
import { findBone } from '../gfx/assets';
import { trailFX } from '../gfx/trail';
import { petMesh } from '../gfx/petMesh';
import { STAGES, stageUnlocked } from '../data/stages';
import { WEAPONS, weaponDamage, BATTLE_BOOSTS } from '../data/weapons';
import { THEMES } from '../data/themes';
import { $, showScreen, toast, popup } from '../ui/dom';
import { refreshMenu } from '../ui/menu';
import { resetRun } from './run';
import { endEvent } from './events';
import type { BossState, Weapon } from '../types';

const PLAYER_START_Z = 3;
const BOSS_Z = -11;              // lebih dekat: bos terasa besar & mengancam
const BOSS_SCALE = 1.5;          // bos diperbesar
const BOSS_HIT_X = 2.6, BOSS_HIT_Z = 2.2;
const LUNGE_DIST = 6.5;
const INTRO_TIME = 2.4;          // sorot + nama bos sebelum "MULAI!"
const DEATH_TIME = 0.9;          // dijalankan dalam slow-mo → terasa ~2 dtk
const PX_MIN = -3.4, PX_MAX = 3.4;
const PZ_MIN = -1, PZ_MAX = 5;

// Senjata yang dipegang & bayangan kontak bos (dikelola per-tempur)
let weaponMesh: THREE.Group | null = null;
let muzzleObj: THREE.Object3D | null = null;
let bossShadow: THREE.Mesh | null = null;

/** Bersihkan sisa fase lari supaya arena fokus ke bos. */
function cleanArena() {
  endEvent();                       // hapus chaser & efek event yang tersisa
  clearList(world.obstacles);
  clearList(world.coins);
  clearList(world.powerups);
  trailFX.clear();
  if (petMesh) petMesh.visible = false;
}

function setVignette(on: boolean) {
  $('vignette').classList.toggle('hidden', !on);
}

// ============================================================
// Peta stage
// ============================================================
export function openMap() {
  AudioFX.click();
  game.state = 'menu';        // keluar dari state victory/defeat/boss
  game.charMesh.visible = true;
  game.charMesh.rotation.set(0, 0, 0);
  game.charMesh.position.set(0, 0, 0);
  game.lane = 1; game.laneX = 0;   // kembalikan ke lajur tengah (fix karakter nyangkut di pinggir)
  renderMap();
  showScreen('menu', 'map');
}

export function renderMap() {
  $('map-coins').textContent = store.coinsTotal.toLocaleString('id-ID');
  const eq = WEAPONS.find(w => w.id === store.equippedWeapon) || WEAPONS[0];
  $('map-weapon').textContent = eq.name;
  const cleared = store.clearedStages;

  // Posisi node berkelok (serpentine) dari bawah ke atas, dalam persen papan
  const n = STAGES.length;
  const pts = STAGES.map((_, i) => ({
    x: i % 2 === 0 ? 27 : 73,
    y: n === 1 ? 50 : 85 - i * (70 / (n - 1)),
  }));

  // Jalur S-curve antar node: penuh (redup) + bagian yang sudah terbuka (menyala)
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    ` C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
  let dAll = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < n; i++) dAll += seg(pts[i - 1], pts[i]);
  let lastOpen = 0;
  for (let i = 0; i < n; i++) if (stageUnlocked(i, cleared)) lastOpen = i;
  let dOpen = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i <= lastOpen; i++) dOpen += seg(pts[i - 1], pts[i]);
  $('map-path').innerHTML = `<path class="mp-base" d="${dAll}"/>`
    + (lastOpen > 0 ? `<path class="mp-open" d="${dOpen}"/>` : '');

  $('stage-list').innerHTML = STAGES.map((st, i) => {
    const unlocked = stageUnlocked(i, cleared);
    const done = cleared.includes(st.id);
    const current = unlocked && !done;   // stage berikutnya yang harus dimainkan
    const theme = THEMES.find(t => t.id === st.theme);
    const cls = 'map-node' + (done ? ' cleared' : '') + (current ? ' current' : '') + (unlocked ? '' : ' locked');
    const badge = done ? '✓' : unlocked ? String(i + 1) : '🔒';
    return `<button class="${cls}" data-i="${i}" ${unlocked ? '' : 'disabled'}
      style="left:${pts[i].x}%;top:${pts[i].y}%">
      <span class="node-badge" style="--tc:${theme?.swatch ?? '#f7a51d'}">${badge}</span>
      <span class="node-label">${st.name}</span>
      <span class="node-sub">👹 ${st.boss.name}</span>
    </button>`;
  }).join('');
  $('stage-list').querySelectorAll<HTMLButtonElement>('.map-node').forEach(b => {
    if (b.disabled) return;
    b.addEventListener('click', () => openStage(+b.dataset.i!));
  });
}

// ============================================================
// Arsenal (senjata)
// ============================================================
export function openArsenal(returnTo: 'map' | 'stage') {
  AudioFX.click();
  menuState.arsenalReturn = returnTo;
  renderArsenal();
  showScreen('menu', 'arsenal');
}

export function renderArsenal() {
  $('arsenal-coins').textContent = store.coinsTotal.toLocaleString('id-ID');
  const owned = store.ownedWeapons;
  const equipped = store.equippedWeapon;
  const upg = store.weaponUpgrades;
  $('weapon-list').innerHTML = WEAPONS.map(w => {
    const isOwned = w.price === 0 || owned.includes(w.id);
    const lvl = upg[w.id] || 1;
    const isEq = equipped === w.id;
    const dmg = weaponDamage(w).toFixed(0);
    let action: string;
    if (!isOwned) {
      action = `<button class="btn-upgrade" data-buy="${w.id}">🪙 ${w.price}</button>`;
    } else {
      const eqBtn = `<button class="btn-upgrade ${isEq ? 'eqd' : ''}" data-eq="${w.id}">${isEq ? 'TERPASANG' : 'PASANG'}</button>`;
      const maxed = lvl >= WEAPON_UPGRADE_MAX;
      const upBtn = `<button class="btn-upgrade" data-up="${w.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `⬆ 🪙 ${weaponUpgradeCost(lvl)}`}</button>`;
      action = eqBtn + upBtn;
    }
    return `<div class="weapon-row">
      <div class="weapon-ico">${w.icon}</div>
      <div class="weapon-info">
        <div class="weapon-name">${w.name} <span style="opacity:.6">Lv${lvl}</span></div>
        <div class="weapon-desc">${w.desc}</div>
        <div class="weapon-stats">DMG ${dmg} · ${w.fireRate.toFixed(1)}/dtk${w.pellets > 1 ? ` · ${w.pellets} peluru` : ''}</div>
      </div>
      <div class="weapon-actions">${action}</div>
    </div>`;
  }).join('');

  const list = $('weapon-list');
  list.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(b =>
    b.addEventListener('click', () => buyWeapon(b.dataset.buy!)));
  list.querySelectorAll<HTMLButtonElement>('[data-eq]').forEach(b =>
    b.addEventListener('click', () => { store.equippedWeapon = b.dataset.eq!; AudioFX.click(); renderArsenal(); }));
  list.querySelectorAll<HTMLButtonElement>('[data-up]').forEach(b =>
    b.addEventListener('click', () => upgradeWeapon(b.dataset.up!)));
}

function buyWeapon(id: string) {
  const w = WEAPONS.find(x => x.id === id)!;
  if (store.coinsTotal < w.price) { toast(`Koin kurang! Butuh 🪙 ${w.price}`); return; }
  store.coinsTotal -= w.price;
  store.ownedWeapons = [...store.ownedWeapons, id];
  store.equippedWeapon = id;
  AudioFX.powerup();
  toast(`🎉 ${w.name} terbuka & terpasang!`);
  renderArsenal();
}

function upgradeWeapon(id: string) {
  const upg = store.weaponUpgrades;
  const lvl = upg[id] || 1;
  if (lvl >= WEAPON_UPGRADE_MAX) return;
  const cost = weaponUpgradeCost(lvl);
  if (store.coinsTotal < cost) { toast(`Koin kurang! Butuh 🪙 ${cost}`); return; }
  store.coinsTotal -= cost;
  upg[id] = lvl + 1;
  store.weaponUpgrades = upg;
  AudioFX.powerup();
  toast(`⬆ ${WEAPONS.find(w => w.id === id)!.name} jadi Lv${lvl + 1}!`);
  renderArsenal();
}

// ============================================================
// Detail stage
// ============================================================
export function openStage(idx: number) {
  AudioFX.click();
  menuState.stagePick = idx;
  const st = STAGES[idx];
  $('stage-title').textContent = st.name;
  const eq = WEAPONS.find(w => w.id === store.equippedWeapon) || WEAPONS[0];
  $('stage-boss').innerHTML = `<div class="boss-emoji">👹</div>
    <div><div class="boss-title">${st.boss.name}</div>
    <div class="boss-hp-note">HP ${st.boss.hp} · tema ${st.theme}</div></div>`;
  $('stage-dist').textContent = String(st.distance);
  $('stage-weapon').textContent = `${eq.icon} ${eq.name}`;
  showScreen('menu', 'stage');
}

// ============================================================
// Mulai lari menuju bos (fase endless-runner)
// ============================================================
export function startStageRun() {
  AudioFX.click();
  const st = STAGES[menuState.stagePick];
  game.mode = 'adventure';
  game.stageIdx = menuState.stagePick;
  game.stageGoal = st.distance;
  game.battleBoost = null;
  const theme = THEMES.find(t => t.id === st.theme) || THEMES[0];
  buildTheme(theme);
  resetRun();
  $('hud-mult').classList.add('hidden');
  $('event-banner').classList.add('hidden');
  $('popups').innerHTML = '';
  game.state = 'playing';
  showScreen('hud');
}

// Dipanggil tiap frame 'playing' saat mode petualangan
export function checkStageGoal() {
  if (game.mode === 'adventure' && game.state === 'playing' && game.distance >= game.stageGoal) {
    enterPreboss();
  }
}

// ============================================================
// Pra-bos: pilih boost dari koin lari
// ============================================================
export function enterPreboss() {
  game.state = 'preboss';
  game.battleBoost = null;
  cleanArena();          // arena bersih sebelum tempur
  renderBoosts();
  showScreen('preboss');
}

export function renderBoosts() {
  $('preboss-coins').textContent = String(game.coins);
  $('boost-list').innerHTML = BATTLE_BOOSTS.map(b => {
    const afford = game.coins >= b.cost;
    const chosen = game.battleBoost === b.id;
    return `<button class="boost-card ${chosen ? 'chosen' : ''}" data-b="${b.id}" ${afford ? '' : 'disabled'}>
      <div class="boost-ico">${b.icon}</div>
      <div class="boost-info"><div class="boost-name">${b.name}</div><div class="boost-desc">${b.desc}</div></div>
      <div class="boost-cost">🪙 ${b.cost}</div>
    </button>`;
  }).join('');
  $('boost-list').querySelectorAll<HTMLButtonElement>('.boost-card').forEach(b => {
    if (b.disabled) return;
    b.addEventListener('click', () => {
      AudioFX.click();
      game.battleBoost = game.battleBoost === b.dataset.b ? null : b.dataset.b!;
      renderBoosts();
    });
  });
}

// ============================================================
// Tempur bos
// ============================================================
function clearBoss() {
  if (game.boss) {
    const bAnim = game.boss.mesh.userData.anim as AnimatedCharacter | undefined;
    bAnim?.dispose();
    scene.remove(game.boss.mesh);
    for (const s of game.boss.shots) scene.remove(s.mesh);
    for (const s of game.boss.bshots) scene.remove(s.mesh);
    for (const t of game.boss.telegraphs) scene.remove(t.mesh);
    game.boss = null;
  }
  if (weaponMesh) { game.charMesh.remove(weaponMesh); weaponMesh = null; }
  if (muzzleObj) { muzzleObj.parent?.remove(muzzleObj); muzzleObj = null; }
  if (bossShadow) { scene.remove(bossShadow); bossShadow = null; }
  clearParticles();
  setVignette(false);
  $('boss-intro').classList.add('hidden');
  if (petMesh) petMesh.visible = true;
  game.charMesh.visible = true;          // pulihkan bila mati saat blink invuln
  game.charMesh.rotation.set(0, 0, 0);   // hapus miring/roll dari tempur
  // kembalikan pose lengan/kaki ke normal
  const ud = game.charMesh.userData as { arms?: THREE.Group[]; legs?: THREE.Group[] };
  if (ud.arms) for (const a of ud.arms) a.rotation.set(0, 0, 0);
  if (ud.legs) for (const l of ud.legs) l.rotation.set(0, 0, 0);
}

/** Nama bos menghentak, lalu "MULAI!" */
function playBossIntro(name: string) {
  const el = $('boss-intro');
  $('bi-name').textContent = name;
  el.classList.remove('hidden', 'in', 'go');
  void el.offsetWidth;               // restart animasi
  el.classList.add('in');
  window.setTimeout(() => { if (game.state === 'boss') el.classList.add('go'); }, 1500);
  window.setTimeout(() => { el.classList.add('hidden'); el.classList.remove('in', 'go'); }, INTRO_TIME * 1000);
}

export async function startBossFight() {
  AudioFX.click();
  const st = STAGES[game.stageIdx];
  // Terapkan boost terpilih (bayar dengan koin lari)
  let playerHP = 3, dmgMult = 1, shieldHits = 0;
  const boost = BATTLE_BOOSTS.find(b => b.id === game.battleBoost);
  if (boost && game.coins >= boost.cost) {
    game.coins -= boost.cost;
    if (boost.id === 'heart') playerHP += 2;
    else if (boost.id === 'power') dmgMult = 1.5;
    else if (boost.id === 'shield') shieldHits = 3;
  }

  cleanArena();  // pastikan tak ada koin/rintangan sisa lari di arena
  setVignette(true);

  const weapon: Weapon = WEAPONS.find(w => w.id === store.equippedWeapon) || WEAPONS[0];

  // Bos: model .glb ber-rig kalau ada; fallback ke prosedural
  let bossMesh: THREE.Group;
  let bossAnim: AnimatedCharacter | null = null;
  if (st.boss.model) {
    try {
      bossAnim = await AnimatedCharacter.load(st.boss.model, st.boss.size ?? 4.6);
      bossMesh = bossAnim.root;
      bossMesh.userData.anim = bossAnim;
      // Material di-clone per-tempur (cache GLTF berbagi material — jangan mutasi bersama),
      // lalu simpan emissive dasar untuk kedip putih & fase marah
      const mats: THREE.MeshStandardMaterial[] = [];
      bossMesh.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          m.material = (m.material as THREE.Material).clone();
          const mm = m.material as THREE.MeshStandardMaterial;
          if (mm.emissive) {
            mm.userData.baseEmissive = mm.emissive.clone();
            mats.push(mm);
          }
        }
      });
      bossMesh.userData.mats = mats;
      bossAnim.play('idle');
      // glTF menghadap +Z = ke arah pemain — tidak perlu diputar
    } catch (e) {
      console.error('Gagal memuat model bos, pakai prosedural:', e);
      bossMesh = buildBoss(st.boss);
      bossMesh.scale.setScalar(BOSS_SCALE);
      bossMesh.rotation.y = Math.PI;
    }
  } else {
    bossMesh = buildBoss(st.boss);
    bossMesh.scale.setScalar(BOSS_SCALE);
    bossMesh.rotation.y = Math.PI;
  }
  bossMesh.position.set(0, 0, BOSS_Z);
  scene.add(bossMesh);

  // Bayangan kontak: bikin bos terasa berpijak & besar
  bossShadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })
  );
  bossShadow.rotation.x = -Math.PI / 2;
  bossShadow.position.set(0, 0.02, BOSS_Z);
  scene.add(bossShadow);

  // Bawa karakter pemain ke arena
  game.charMesh.rotation.set(0, 0, 0);
  game.charMesh.position.set(0, 0, PLAYER_START_Z);
  const charAnim = game.charMesh.userData.anim as AnimatedCharacter | undefined;
  if (charAnim) {
    // Model ber-rig sudah membawa senjatanya sendiri (mis. gunner) —
    // cukup cari tulang tangan sebagai titik moncong tembakan
    weaponMesh = null;
    const hand = findBone(game.charMesh, 'handr') ?? findBone(game.charMesh, 'hand');
    if (hand) {
      muzzleObj = new THREE.Object3D();
      muzzleObj.position.set(0, 0.15, 0);
      hand.add(muzzleObj);
    } else {
      muzzleObj = null; // firePlayer punya titik fallback
    }
  } else {
    // Karakter prosedural: pasang mesh senjata sesuai wujudnya
    weaponMesh = buildWeaponMesh(weapon.shape, weapon.projColor);
    weaponMesh.position.set(0.34, 1.05, -0.35);
    weaponMesh.userData.baseZ = -0.35;
    weaponMesh.userData.kick = 0;
    weaponMesh.userData.spin = 0;
    game.charMesh.add(weaponMesh);
    muzzleObj = weaponMesh.userData.muzzle as THREE.Object3D;
  }

  const diff = 1 + game.stageIdx * 0.35;
  game.boss = {
    cfg: st.boss, mesh: bossMesh, baseY: 0,
    hp: st.boss.hp, hpMax: st.boss.hp,
    stage: game.stageIdx, diff,
    px: 0, pz: PLAYER_START_Z, bossX: 0, bossZ: BOSS_Z,
    weapon, dmgMult, shieldHits,
    playerHP, playerHPMax: playerHP,
    invuln: 0, fireTimer: 0, attackTimer: 1.8,
    shots: [], bshots: [], telegraphs: [],
    runPhase: 0, flash: 0, joy: null,
    targetX: 0, targetZ: PLAYER_START_Z, velX: 0, velZ: 0,
    dashTime: 0, dashCd: 0, dashDX: 0, dashDZ: 0, faceAng: 0,
    windup: 0, pendingAttack: null, bossVY: 0, bossLunge: 0,
    enraged: false, hitStop: 0, dead: false, deadT: 0,
    introT: INTRO_TIME, recoil: 0, stagger: 0, hitCombo: 0, hitComboT: 0,
  } as BossState;

  $('boss-name').textContent = st.boss.name;
  renderBossHUD();
  game.state = 'boss';
  showScreen('bosshud');
  playBossIntro(st.boss.name);
}

function renderBossHUD() {
  const b = game.boss!;
  $('boss-hp-fill').style.width = Math.max(0, (b.hp / b.hpMax) * 100) + '%';
  let hearts = '';
  for (let i = 0; i < b.playerHPMax; i++) hearts += i < b.playerHP ? '❤️' : '🤍';
  if (b.shieldHits > 0) hearts += ' 🛡️'.repeat(1) + (b.shieldHits > 1 ? `×${b.shieldHits}` : '');
  $('player-hearts').textContent = hearts;
}

// ---------- Konstanta kelincahan ----------
const DASH_TIME = 0.22, DASH_SPEED = 17, DASH_CD = 0.85, DASH_IFRAME = 0.34;
const LUNGE_TIME = 0.55;
const windupTime = (b: BossState) => (b.enraged ? 0.5 : 0.72);
const attackGap = (b: BossState) => Math.max(0.7, (b.enraged ? 1.2 : 2.2) - b.diff * 0.3);

// ---------- Partikel & angka damage ----------
interface Particle {
  mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; max: number;
  grow?: number;   // >0 = membesar (kilat benturan), default mengecil
  g?: number;      // pengali gravitasi (0 = melayang, untuk ekor tracer)
}
let particles: Particle[] = [];
const _pgeo = new THREE.SphereGeometry(0.12, 6, 6);
const _v = new THREE.Vector3();

function projScreen(x: number, y: number, z: number) {
  _v.set(x, y, z).project(camera);
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h, vis: _v.z < 1 };
}
function damageNumber(x: number, y: number, z: number, text: string, cls = '') {
  const p = projScreen(x, y, z);
  if (!p.vis) return;
  const el = document.createElement('div');
  el.className = 'dmg-num ' + cls;
  el.textContent = text;
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
  $('dmg-layer').appendChild(el);
  setTimeout(() => el.remove(), 720);
}
function spawnBurst(x: number, y: number, z: number, color: number, n = 8, spd = 6) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(_pgeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x, y, z);
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
    const s = spd * (0.5 + Math.random());
    m.scale.setScalar(0.5 + Math.random());
    scene.add(m);
    particles.push({ mesh: m, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.abs(Math.sin(e)) * s + 2, vz: Math.sin(a) * Math.cos(e) * s, life: 0.5, max: 0.5 });
  }
}
function muzzleFlash(x: number, y: number, z: number, color: number) {
  const m = new THREE.Mesh(_pgeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
  m.scale.setScalar(1.7); m.position.set(x, y, z); scene.add(m);
  particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0.08, max: 0.08 });
}
function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    p.vy -= 14 * (p.g ?? 1) * dt;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.max);
    p.mesh.scale.multiplyScalar(p.grow ? 1 + dt * p.grow : 1 - dt * 1.5);
    if (p.life <= 0) { scene.remove(p.mesh); (p.mesh.material as THREE.Material).dispose(); particles.splice(i, 1); }
  }
}

/** Ekor cahaya di belakang peluru (melayang, cepat pudar). */
function spawnTracer(x: number, y: number, z: number, color: number) {
  const m = new THREE.Mesh(_pgeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
  m.position.set(x, y, z);
  m.scale.setScalar(0.55);
  scene.add(m);
  particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0.16, max: 0.16, g: 0 });
}

/** Kilat benturan yang mengembang di badan bos. */
function impactFlash(x: number, y: number, z: number, color: number) {
  const m = new THREE.Mesh(_pgeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
  m.position.set(x, y, z);
  m.scale.setScalar(1.2);
  scene.add(m);
  particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0.16, max: 0.16, g: 0, grow: 16 });
}

/** Sentakan senjata setelah menembak + putaran laras minigun. */
function updateWeapon(dt: number) {
  if (!weaponMesh) return;
  const ud = weaponMesh.userData as any;
  ud.kick = Math.max(0, (ud.kick || 0) - dt * 0.9);
  weaponMesh.position.z = ud.baseZ + ud.kick;
  if (ud.spinner) {
    ud.spin = Math.max(0, (ud.spin || 0) - dt * 26);
    (ud.spinner as THREE.Group).rotation.z += ud.spin * dt;
  }
}
export function clearParticles() {
  for (const p of particles) { scene.remove(p.mesh); (p.mesh.material as THREE.Material).dispose(); }
  particles = [];
  const layer = document.getElementById('dmg-layer');
  if (layer) layer.innerHTML = '';
}

// Peluru pemain — keluar dari moncong senjata, mengarah ke bos
const _mp = new THREE.Vector3();
function firePlayer() {
  const b = game.boss!;
  const w = b.weapon;
  const dmg = weaponDamage(w) * b.dmgMult;
  // Titik moncong sebenarnya (ikut pose & senjata yang dipegang)
  if (muzzleObj) muzzleObj.getWorldPosition(_mp);
  else _mp.set(b.px, 1.05, b.pz - 0.7);
  const dirX = b.mesh.position.x - _mp.x, dirZ = b.mesh.position.z - _mp.z;
  const len = Math.hypot(dirX, dirZ) || 1;
  const baseAng = Math.atan2(dirX / len, -dirZ / len);
  muzzleFlash(_mp.x, _mp.y, _mp.z, w.projColor);
  if (weaponMesh) {
    const ud = weaponMesh.userData as any;
    ud.kick = w.shape === 'cannon' ? 0.18 : 0.09;   // sentakan
    ud.spin = 30;                                    // laras minigun berputar
  }
  for (let p = 0; p < w.pellets; p++) {
    const ang = baseAng + (p - (w.pellets - 1) / 2) * w.spread;
    const vx = Math.sin(ang) * w.projSpeed, vz = -Math.cos(ang) * w.projSpeed;
    const mesh = buildBullet(w);
    mesh.position.copy(_mp);
    mesh.lookAt(_mp.x + vx, _mp.y, _mp.z + vz);      // memanjang searah terbang
    scene.add(mesh);
    b.shots.push({ mesh, vx, vz, life: 2.2, dmg, trailT: 0, color: w.projColor });
  }
  const boom = w.shape === 'cannon';
  AudioFX.beep(boom ? 220 : 760, boom ? 0.12 : 0.05, 'square', 0.04, boom ? -60 : 120);
}

// Dodge/dash — meluncur cepat dengan i-frame
export function doDodge() {
  const b = game.boss;
  if (!b || b.dashCd > 0 || b.dashTime > 0) return;
  let dx = b.velX, dz = b.velZ;
  if (Math.abs(dx) + Math.abs(dz) < 0.6) { dx = b.px <= 0 ? 1 : -1; dz = 0; }
  const len = Math.hypot(dx, dz) || 1;
  b.dashDX = dx / len; b.dashDZ = dz / len;
  b.dashTime = DASH_TIME; b.dashCd = DASH_CD;
  b.invuln = Math.max(b.invuln, DASH_IFRAME);
  AudioFX.beep(520, 0.12, 'sine', 0.06, 240);
}

// Mulai serangan: pilih jenis lalu wind-up (bisa dibaca & dihindari)
function beginAttack() {
  const b = game.boss!;
  const kinds = b.enraged ? ['spray', 'slam', 'sweep', 'lunge'] : ['spray', 'slam', 'spray', 'sweep'];
  const kind = kinds[(Math.random() * kinds.length) | 0];
  b.pendingAttack = kind;
  b.windup = windupTime(b);
  // Model ber-rig: mainkan klip serangannya (mech tak punya 'attack' → 'punch')
  const anim = b.mesh.userData.anim as AnimatedCharacter | undefined;
  if (anim) { anim.play('attack', { loop: false, fade: 0.12 }) || anim.play('punch', { loop: false, fade: 0.12 }); }
  if (kind === 'slam') {
    // Telegraph muncul & mengisi selama wind-up, meledak saat wind-up habis
    const r = 2.0;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.7, r, 28),
      new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(b.px, 0.06, b.pz);
    scene.add(ring);
    b.telegraphs.push({ mesh: ring, x: b.px, z: b.pz, r, t: 0, max: b.windup });
  }
  AudioFX.beep(300, 0.12, 'sawtooth', 0.05, -40);
}

// Lepaskan serangan (dipanggil saat wind-up selesai)
function executeAttack(kind: string) {
  const b = game.boss!;
  b.flash = 0.18;
  if (kind === 'slam') return; // ditangani telegraph
  const bx = b.mesh.position.x, bz = b.bossZ + 1.2;
  const geo = new THREE.SphereGeometry(0.3, 10, 10);
  const mk = (ang: number, spd: number) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff5a4a }));
    mesh.position.set(bx, 1.3, bz); scene.add(mesh);
    b.bshots.push({ mesh, vx: Math.sin(ang) * spd, vz: Math.cos(ang) * spd, life: 3.2 });
  };
  const toPlayer = Math.atan2(b.px - bx, b.pz - bz);
  if (kind === 'spray') {
    const n = 3 + Math.min(4, Math.floor(b.diff));
    for (let i = 0; i < n; i++) mk(toPlayer + (i - (n - 1) / 2) * 0.2, 12 + b.diff * 1.5);
    AudioFX.beep(180, 0.18, 'sawtooth', 0.08, -60);
  } else if (kind === 'sweep') {
    const n = 10 + Math.floor(b.diff * 2);
    for (let i = 0; i < n; i++) mk((i / n) * Math.PI * 2, 9 + b.diff);
    AudioFX.beep(150, 0.25, 'sawtooth', 0.09, -40);
  } else if (kind === 'lunge') {
    b.bossLunge = LUNGE_TIME;
    for (let i = 0; i < 3; i++) mk(toPlayer + (i - 1) * 0.14, 14 + b.diff * 2);
    game.shake = Math.max(game.shake, 0.3);
    AudioFX.beep(120, 0.3, 'sawtooth', 0.12, -50);
  }
}

function bossPlayerHit() {
  const b = game.boss!;
  if (b.invuln > 0) return;
  if (b.shieldHits > 0) {
    b.shieldHits--; b.invuln = 0.7; game.shake = 0.25;
    spawnBurst(b.px, 1.2, b.pz, 0x8ae6ff, 10, 7);
    AudioFX.shieldBreak(); renderBossHUD();
    return;
  }
  b.playerHP--;
  b.invuln = 1.2;
  game.shake = 0.5;
  b.hitStop = 0.05;
  spawnBurst(b.px, 1.1, b.pz, 0xff5a5a, 12, 7);
  damageNumber(b.px, 2.0, b.pz, '-1 ❤', 'player');
  AudioFX.crash();
  renderBossHUD();
  if (b.playerHP <= 0) bossDefeat();
}

/** Limbung: bos kehilangan keseimbangan, serangan dibatalkan. */
function triggerStagger(b: BossState) {
  b.stagger = 0.9;
  b.hitCombo = 0; b.hitComboT = 0;
  b.windup = 0; b.pendingAttack = null;
  for (const t of b.telegraphs) scene.remove(t.mesh);
  b.telegraphs = [];
  b.attackTimer = Math.max(b.attackTimer, 1.0);
  popup('LIMBUNG! 💫');
  spawnBurst(b.mesh.position.x, 3.6, b.mesh.position.z, 0xffe066, 12, 6);
  AudioFX.beep(220, 0.25, 'square', 0.07, -80);
}

/** Mulai animasi tumbang (bukan langsung layar menang). */
function startBossDeath() {
  const b = game.boss!;
  b.dead = true; b.deadT = DEATH_TIME;
  // Model ber-rig: klip kematian kalau ada (ular tak punya → jatuh prosedural)
  const anim = b.mesh.userData.anim as AnimatedCharacter | undefined;
  const played = !!(anim && anim.play('death', { loop: false, fade: 0.1 }));
  b.mesh.userData.deathClip = played;
  if (played) {
    // beri waktu sepanjang klipnya (dibatasi biar tidak kelamaan)
    const clip = anim!.findClip('death');
    if (clip) b.deadT = Math.min(2.4, Math.max(DEATH_TIME, clip.duration * 0.9));
  }
  b.windup = 0; b.pendingAttack = null; b.stagger = 0;
  for (const t of b.telegraphs) scene.remove(t.mesh);
  b.telegraphs = [];
  for (const s of b.bshots) scene.remove(s.mesh);
  b.bshots = [];
  for (const s of b.shots) scene.remove(s.mesh);
  b.shots = [];
  game.shake = 0.7;
  popup('💀 BOS TUMBANG!');
  AudioFX.beep(90, 0.6, 'sawtooth', 0.16, -50);
}

/** Napas, goyang mengancam, sentakan mundur, bayangan kontak. */
function animateBossBody(b: BossState, dt: number, now: number) {
  const ud = b.mesh.userData as any;
  const anim = ud.anim as AnimatedCharacter | undefined;
  if (anim) {
    anim.update(dt); // napas & gerak dari klipnya sendiri
  } else {
    const br = 1 + Math.sin(now * 0.0026) * 0.05;               // napas naik-turun
    if (ud.body) ud.body.scale.set(1.1, 1.15 * br, 1);
    if (ud.head) ud.head.position.y = ud.headBaseY + Math.sin(now * 0.0026 + 0.6) * 0.07;
  }
  const lean = b.stagger > 0 ? 0.3 * (b.stagger / 0.9) : 0;     // limbung ke belakang
  b.mesh.rotation.z = Math.sin(now * 0.0009) * 0.05 + lean * 0.5;
  b.mesh.rotation.x = lean;
  if (b.recoil > 0) b.recoil = Math.max(0, b.recoil - dt * 2.4);
  if (b.bossVY > 0) b.bossVY = Math.max(0, b.bossVY - dt * 3.2);
  if (bossShadow) {
    bossShadow.position.set(b.mesh.position.x, 0.02, b.mesh.position.z);
    const lift = Math.max(0, b.mesh.position.y - b.baseY);
    const k = Math.max(0.5, 1 - lift * 0.16);
    bossShadow.scale.setScalar(k);
    (bossShadow.material as THREE.MeshBasicMaterial).opacity = 0.34 * k;
  }
}

/** Pose tempur: kuda-kuda menghadap bos, senjata teracung. */
function poseCombatStance(b: BossState, dt: number, moving: boolean) {
  const anim = game.charMesh.userData.anim as AnimatedCharacter | undefined;
  if (anim) {
    // Model ber-rig: klip bergaya senjata kalau ada
    if (moving) { anim.play('run_gun') || anim.play('run') || anim.play('walk'); }
    else { anim.play('idle_gun') || anim.play('idle'); }
    anim.update(dt);
    updateWeapon(dt);
    return;
  }
  const ud = game.charMesh.userData as { arms?: THREE.Group[]; legs?: THREE.Group[] };
  b.runPhase += dt * (moving ? 13 : 4);
  const s = Math.sin(b.runPhase) * (moving ? 0.5 : 0.06);
  if (ud.legs) {
    ud.legs[0].rotation.x = s - 0.14;      // sedikit menekuk
    ud.legs[1].rotation.x = -s - 0.14;
  }
  if (ud.arms) {
    ud.arms[1].rotation.x = -1.5;          // tangan kanan memegang senjata
    ud.arms[1].rotation.z = -0.16;
    ud.arms[0].rotation.x = -1.24;         // tangan kiri menopang
    ud.arms[0].rotation.z = 0.2;
  }
  updateWeapon(dt);
}

export function updateBoss(dt: number) {
  const b = game.boss;
  if (!b) return;
  const now = performance.now();
  const ch = game.charMesh;
  const ud2 = b.mesh.userData as any;

  // ---------- Animasi tumbang: dijalankan dalam slow-mo ----------
  if (b.dead) {
    b.deadT -= dt;
    const k = THREE.MathUtils.clamp(1 - b.deadT / DEATH_TIME, 0, 1);
    const deadAnim = b.mesh.userData.anim as AnimatedCharacter | undefined;
    if (b.mesh.userData.deathClip && deadAnim) {
      deadAnim.update(dt);   // klip kematian model yang bekerja
    } else {
      b.mesh.rotation.x = -k * 1.5;
      b.mesh.rotation.z = Math.sin(k * 9) * 0.12 * (1 - k);
      b.mesh.position.y = b.baseY + Math.sin(k * Math.PI) * 0.5 - k * 0.6;
    }
    if (Math.random() < 0.4) {
      spawnBurst(
        b.mesh.position.x + (Math.random() - 0.5) * 3.4,
        0.8 + Math.random() * 3.6,
        b.mesh.position.z + (Math.random() - 0.5) * 2.4,
        Math.random() < 0.5 ? 0xffa030 : 0xff5030, 7, 7,
      );
    }
    game.shake = Math.max(game.shake, 0.22);
    if (bossShadow) (bossShadow.material as THREE.MeshBasicMaterial).opacity = 0.34 * (1 - k);
    updateParticles(dt);
    if (b.deadT <= 0) {
      spawnBurst(b.mesh.position.x, 1.6, b.mesh.position.z, 0xffd060, 26, 11);
      game.shake = 0.8;
      bossWin();
    }
    return;
  }

  // Hit-stop: bekukan sesaat untuk rasa benturan
  if (b.hitStop > 0) { b.hitStop -= dt; updateParticles(dt); return; }

  // ---------- Intro: sorot bos dulu, tempur belum jalan ----------
  if (b.introT > 0) {
    b.introT -= dt;
    b.mesh.position.set(0, b.baseY + Math.abs(Math.sin(now * 0.003)) * 0.2, BOSS_Z);
    animateBossBody(b, dt, now);
    poseCombatStance(b, dt, false);
    ch.position.set(b.px, 0, b.pz);
    updateParticles(dt);
    return;
  }

  // ---------- Gerak pemain: dash atau lerp mulus ----------
  if (b.dashCd > 0) b.dashCd -= dt;
  if (b.dashTime > 0) {
    b.dashTime -= dt;
    b.px = THREE.MathUtils.clamp(b.px + b.dashDX * DASH_SPEED * dt, PX_MIN, PX_MAX);
    b.pz = THREE.MathUtils.clamp(b.pz + b.dashDZ * DASH_SPEED * dt, PZ_MIN, PZ_MAX);
    b.targetX = b.px; b.targetZ = b.pz;
    spawnBurst(b.px, 0.4, b.pz, 0x8ad4ff, 1, 1); // jejak dash
  } else {
    const f = Math.min(1, dt * 11);
    const nx = b.px + (b.targetX - b.px) * f, nz = b.pz + (b.targetZ - b.pz) * f;
    b.velX = (nx - b.px) / Math.max(dt, 0.001);
    b.velZ = (nz - b.pz) / Math.max(dt, 0.001);
    b.px = nx; b.pz = nz;
  }

  // ---------- Karakter: pose tempur menghadap bos ----------
  ch.position.set(b.px, 0, b.pz);
  const moving = Math.abs(b.velX) + Math.abs(b.velZ) > 0.4 || b.dashTime > 0;
  poseCombatStance(b, dt, moving);
  ch.rotation.z = THREE.MathUtils.clamp(-b.velX * 0.05, -0.5, 0.5);
  ch.rotation.y = THREE.MathUtils.clamp(-b.velX * 0.04, -0.4, 0.4);
  ch.rotation.x = b.dashTime > 0 ? -0.5 : (moving ? 0.05 : 0);
  ch.position.y = b.dashTime > 0 ? 0.15 : Math.abs(Math.sin(b.runPhase)) * (moving ? 0.06 : 0.015);
  if (b.invuln > 0) { b.invuln -= dt; ch.visible = b.dashTime > 0 ? true : (Math.floor(b.invuln * 24) % 2 === 0); }
  else ch.visible = true;

  // ---------- Fase marah (HP < 50%) ----------
  if (!b.enraged && b.hp <= b.hpMax * 0.5) {
    b.enraged = true;
    const emats = ud2.mats as THREE.MeshStandardMaterial[] | undefined;
    if (emats) {
      // fase marah: emissive dasar digeser merah → kedip putih tetap jalan di atasnya
      for (const m of emats) (m.userData.baseEmissive as THREE.Color).setHex(0x551010);
    } else if (ud2.bodyMat) {
      (ud2.bodyMat.emissive as THREE.Color).setHex(0x551010);
    }
    game.shake = 0.6;
    popup('BOS MARAH! 🔥');
    AudioFX.beep(90, 0.4, 'sawtooth', 0.14, -30);
  }

  // ---------- Gerak & animasi bos ----------
  if (b.windup <= 0 && b.bossLunge <= 0 && b.stagger <= 0) {
    b.bossX = Math.sin(now * (b.enraged ? 0.0011 : 0.0007)) * 3.0;
  }
  b.mesh.position.x = b.bossX;
  if (b.bossLunge > 0) {
    b.bossLunge -= dt;
    const k = b.bossLunge / LUNGE_TIME, fwd = Math.sin((1 - k) * Math.PI);
    b.mesh.position.z = b.bossZ + fwd * LUNGE_DIST;
    b.mesh.position.y = b.baseY + fwd * 0.7;
    if (fwd > 0.5 && Math.abs(b.mesh.position.z - b.pz) < 2 && Math.abs(b.bossX - b.px) < 1.7) bossPlayerHit();
  } else {
    b.mesh.position.z = b.bossZ - b.recoil * 2.0;   // tersentak mundur saat kena
    b.mesh.position.y = b.baseY + Math.abs(Math.sin(now * 0.003)) * 0.2 - b.bossVY * 0.5;
  }
  animateBossBody(b, dt, now);
  // kedip putih saat kena — model: lewat emissive semua material; prosedural: warna body
  if (b.flash > 0) b.flash -= dt;
  const k = Math.max(0, Math.min(1, b.flash * 3));
  const mats = ud2.mats as THREE.MeshStandardMaterial[] | undefined;
  if (mats) {
    for (const m of mats) m.emissive.copy(m.userData.baseEmissive).lerp(_white, k);
  } else if (ud2.bodyMat) {
    (ud2.bodyMat.color as THREE.Color).copy(ud2.baseColor).lerp(_white, k);
  }
  // pewaktu limbung & pukulan beruntun
  if (b.stagger > 0) b.stagger = Math.max(0, b.stagger - dt);
  if (b.hitComboT > 0) { b.hitComboT -= dt; if (b.hitComboT <= 0) b.hitCombo = 0; }

  // ---------- Tembakan otomatis pemain ----------
  b.fireTimer -= dt;
  if (b.fireTimer <= 0) { firePlayer(); b.fireTimer = 1 / b.weapon.fireRate; }

  // ---------- Peluru pemain ----------
  for (let i = b.shots.length - 1; i >= 0; i--) {
    const s = b.shots[i];
    s.mesh.position.x += s.vx * dt; s.mesh.position.z += s.vz * dt; s.life -= dt;
    // ekor cahaya tracer
    s.trailT = (s.trailT ?? 0) - dt;
    if (s.trailT <= 0) {
      s.trailT = 0.03;
      spawnTracer(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, s.color ?? 0xffe066);
    }
    if (s.mesh.position.z <= b.mesh.position.z + BOSS_HIT_Z && Math.abs(s.mesh.position.x - b.mesh.position.x) < BOSS_HIT_X) {
      const dmg = Math.round(s.dmg || 0);
      b.hp = Math.max(0, b.hp - dmg); b.flash = 0.14;
      const crit = dmg >= 20;
      // reaksi kena: bos tersentak mundur + hitung pukulan beruntun
      b.recoil = Math.min(0.4, b.recoil + (crit ? 0.28 : 0.1));
      b.hitCombo++; b.hitComboT = 0.9;
      damageNumber(s.mesh.position.x, 2.4 + Math.random() * 0.6, s.mesh.position.z, String(dmg), crit ? 'crit' : '');
      impactFlash(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, s.color ?? 0xffd060);
      spawnBurst(s.mesh.position.x, s.mesh.position.y, s.mesh.position.z, 0xffd060, crit ? 14 : 6, crit ? 8 : 5);
      if (crit) b.hitStop = 0.05;
      scene.remove(s.mesh); b.shots.splice(i, 1);
      renderBossHUD();
      AudioFX.beep(320, 0.05, 'square', 0.05, -80);
      if (b.hp <= 0) { startBossDeath(); return; }
      if (b.hitCombo >= 6 && b.stagger <= 0) triggerStagger(b);
      continue;
    }
    if (s.life <= 0) { scene.remove(s.mesh); b.shots.splice(i, 1); }
  }

  // ---------- AI bos: wind-up → lepas ----------
  if (b.windup > 0) {
    b.windup -= dt;
    const w = 1 - Math.max(0, b.windup) / windupTime(b);
    if (ud2.arms) { ud2.arms[0].rotation.x = -1.3 * w; ud2.arms[1].rotation.x = -1.3 * w; }
    if (b.windup <= 0) { executeAttack(b.pendingAttack!); b.pendingAttack = null; b.attackTimer = attackGap(b); }
  } else {
    if (ud2.arms) { ud2.arms[0].rotation.x *= (1 - Math.min(1, dt * 8)); ud2.arms[1].rotation.x *= (1 - Math.min(1, dt * 8)); }
    // Model ber-rig: balik ke idle (saat menerjang: klip lari)
    const bAnim = ud2.anim as AnimatedCharacter | undefined;
    if (bAnim) {
      if (b.bossLunge > 0) { bAnim.play('run') || bAnim.play('walk'); }
      else { bAnim.play('idle'); }
    }
    b.attackTimer -= dt;
    if (b.attackTimer <= 0 && b.bossLunge <= 0 && b.stagger <= 0) beginAttack();
  }

  // ---------- Peluru bos ----------
  for (let i = b.bshots.length - 1; i >= 0; i--) {
    const s = b.bshots[i];
    s.mesh.position.x += s.vx * dt; s.mesh.position.z += s.vz * dt; s.life -= dt;
    if (b.invuln <= 0 && Math.abs(s.mesh.position.z - b.pz) < 0.75 && Math.abs(s.mesh.position.x - b.px) < 0.9) {
      scene.remove(s.mesh); b.bshots.splice(i, 1);
      bossPlayerHit();
      if (!game.boss) return;
      continue;
    }
    if (s.life <= 0 || s.mesh.position.z > 14 || Math.abs(s.mesh.position.x) > 16) { scene.remove(s.mesh); b.bshots.splice(i, 1); }
  }

  // ---------- Telegraph hantaman ----------
  for (let i = b.telegraphs.length - 1; i >= 0; i--) {
    const t = b.telegraphs[i];
    t.t += dt;
    const k = Math.min(1, t.t / t.max);
    (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.abs(Math.sin(t.t * 14)) * 0.55;
    t.mesh.scale.setScalar(0.6 + k * 0.5);
    if (t.t >= t.max) {
      if (b.invuln <= 0 && Math.abs(b.px - t.x) < t.r && Math.abs(b.pz - t.z) < t.r) bossPlayerHit();
      spawnBurst(t.x, 0.3, t.z, 0xff5030, 16, 9);
      spawnBurst(b.mesh.position.x, 0.2, b.mesh.position.z, 0xbba077, 10, 5); // debu di kaki bos
      game.shake = Math.max(game.shake, 0.55);   // hentakan menggetarkan layar
      b.bossVY = 1;                              // bos menghentak turun
      scene.remove(t.mesh); b.telegraphs.splice(i, 1);
      if (!game.boss) return;
    }
  }

  updateParticles(dt);
}

const _white = new THREE.Color(0xffffff);

function bossWin() {
  const st = STAGES[game.stageIdx];
  const first = !store.clearedStages.includes(st.id);
  const reward = 150 + game.stageIdx * 120 + (first ? 250 : 0) + game.coins;
  store.coinsTotal += reward;
  if (first) store.clearedStages = [...store.clearedStages, st.id];
  clearBoss();
  game.state = 'victory';
  AudioFX.powerup();
  $('victory-msg').textContent = `Kamu mengalahkan ${st.boss.name}!${first ? ' Stage baru terbuka.' : ''}`;
  $('victory-coins').textContent = String(reward);
  showScreen('victory');
}

function bossDefeat() {
  clearBoss();
  game.state = 'defeat';
  AudioFX.crash();
  $('defeat-msg').textContent = 'Bos terlalu kuat! Tingkatkan senjata di Arsenal lalu coba lagi.';
  showScreen('defeat');
}

// Dipanggil run.finalizeRun() saat pemain tumbang sebelum bos (mode petualangan)
export function failStage(msg: string) {
  clearBoss();
  game.state = 'defeat';
  AudioFX.crash();
  $('defeat-msg').textContent = msg;
  showScreen('defeat');
}

export function retryStage() { AudioFX.click(); startStageRun(); }
export function victoryToMap() { openMap(); refreshMenu(); }

// ---------- Input tempur bos (geser layar mengatur posisi target) ----------
export function initBossInput() {
  let dragging = false, lastX = 0, lastY = 0;
  const down = (e: PointerEvent) => {
    // Abaikan sentuhan yang dimulai di tombol dodge
    if (game.state !== 'boss') return;
    if ((e.target as HTMLElement)?.id === 'btn-dodge') return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  };
  const move = (e: PointerEvent) => {
    if (!dragging || game.state !== 'boss' || !game.boss) return;
    const b = game.boss;
    b.targetX = THREE.MathUtils.clamp(b.targetX + (e.clientX - lastX) * 0.018, PX_MIN, PX_MAX);
    b.targetZ = THREE.MathUtils.clamp(b.targetZ + (e.clientY - lastY) * 0.016, PZ_MIN, PZ_MAX);
    lastX = e.clientX; lastY = e.clientY;
  };
  const up = () => { dragging = false; };
  window.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// Gerak bos via keyboard (dipanggil dari main saat state 'boss')
export function bossKeyMove(dx: number, dz: number) {
  if (!game.boss) return;
  game.boss.targetX = THREE.MathUtils.clamp(game.boss.targetX + dx, PX_MIN, PX_MAX);
  game.boss.targetZ = THREE.MathUtils.clamp(game.boss.targetZ + dz, PZ_MIN, PZ_MAX);
}

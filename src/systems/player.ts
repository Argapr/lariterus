// ============================================================
// Pemain: karakter, gerak, tabrakan, near-miss
// ============================================================
import * as THREE from 'three';
import { scene } from '../core/three';
import { game, world, menuState } from '../core/state';
import { LANES, GRAVITY, JUMP_VY, SLIDE_TIME } from '../core/constants';
import { AudioFX } from '../core/audio';
import { powerDuration } from '../data/progression';
import { buildCharacter } from '../gfx/characterMesh';
import { AnimatedCharacter } from '../gfx/animatedCharacter';
import { petMesh } from '../gfx/petMesh';
import { trailFX } from '../gfx/trail';
import { popup } from '../ui/dom';
import type { CharacterCfg } from '../types';

// Token supaya pemuatan model yang tersusul (ganti karakter cepat) tidak menimpa
let charToken = 0;

function attachCharExtras(g: THREE.Group) {
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0x55c8f0, transparent: true, opacity: 0.28, depthWrite: false }));
  bubble.position.y = 1.0;
  bubble.visible = false;
  g.add(bubble);
  g.userData.shieldBubble = bubble;

  const flames = new THREE.Group();
  for (const sx of [-0.15, 0.15]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa030 }));
    f.rotation.x = Math.PI;
    f.position.set(sx, -0.15, 0);
    flames.add(f);
  }
  flames.visible = false;
  g.add(flames);
  g.userData.rocketFlames = flames;
}

function swapCharMesh(g: THREE.Group) {
  const old = game.charMesh as THREE.Group | undefined;
  if (old) {
    const oldAnim = old.userData.anim as AnimatedCharacter | undefined;
    oldAnim?.dispose();
    g.position.copy(old.position);   // jangan "teleport" saat swap
    scene.remove(old);
  }
  attachCharExtras(g);
  game.charMesh = g;
  scene.add(g);
}

export function setCharacter(cfg: CharacterCfg) {
  const token = ++charToken;
  if (cfg.model) {
    // Placeholder kosong dulu supaya game loop tidak crash selagi model dimuat
    if (!game.charMesh) {
      const ph = new THREE.Group();
      attachCharExtras(ph);
      game.charMesh = ph;
      scene.add(ph);
    }
    AnimatedCharacter.load(cfg.model, 2.05).then(ac => {
      if (token !== charToken) { ac.dispose(); return; }
      ac.animRoot.rotation.y = Math.PI; // glTF menghadap +Z; arah lari kita -Z
      ac.root.userData.anim = ac;
      if (!ac.play('idle')) ac.play(ac.listClips()[0] ?? '');
      swapCharMesh(ac.root);
    }).catch(e => console.error('Gagal memuat model karakter:', cfg.model, e));
    return;
  }
  const g = buildCharacter(cfg);
  g.position.set(0, 0, 0);
  swapCharMesh(g);
  g.position.set(0, 0, 0);
}

// ---------- Input dasar ----------
export function doJump() {
  if (game.state !== 'playing') return;
  if (game.y <= 0.01 && game.sliding <= 0) {
    game.vy = JUMP_VY * (game.power.rocket > 0 ? 1.45 : 1);
    AudioFX.jump();
  }
}
export function doSlide() {
  if (game.state !== 'playing') return;
  if (game.y <= 0.01) { game.sliding = SLIDE_TIME; AudioFX.slide(); }
  else game.vy = -18;
}
export function doMove(dir: number) {
  if (game.state !== 'playing') return;
  const n = THREE.MathUtils.clamp(game.lane + dir, 0, 2);
  if (n !== game.lane) { game.lane = n; AudioFX.click(); }
}

// ---------- Near-miss ----------
export function registerNearMiss() {
  game.nearMiss++;
  const bonus = 5 * game.mult;
  game.scoreAcc += bonus;
  popup(`NYARIS! +${bonus}`);
  if (Math.random() < 0.4) { game.coins++; }
  AudioFX.beep(900, 0.08, 'square', 0.05, 200);
}

export function updatePlayer(dt: number) {
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

  const anim = ch.userData.anim as AnimatedCharacter | undefined;
  if (anim) {
    // --- Model ber-rig: pakai klip animasi asli ---
    if (game.y > 0.01) { anim.play('jump') || anim.play('idle'); }
    else if (game.sliding > 0) { anim.play('duck') || anim.play('slide') || anim.play('roll') || anim.play('idle'); }
    else if (game.state === 'playing') { anim.play('run') || anim.play('walk'); }
    else { anim.play('idle') || anim.play('run'); }
    ch.rotation.x = 0;
    anim.update(dt);
  } else {
    // --- Karakter prosedural lama (bola & kapsul + gelombang sinus) ---
    const ud = ch.userData as { arms?: THREE.Group[]; legs?: THREE.Group[] };
    const arms = ud.arms, legs = ud.legs;
    if (arms && legs) {
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
    }
  }

  // Pet melayang mengikuti pemain (di halaman koleksi: mengorbit sesuai putaran)
  if (petMesh) {
    const t = performance.now() * 0.001;
    let tx: number, ty: number, tz: number;
    if (menuState.collectionSelect) {
      // Pet menempel di sisi KIRI karakter & ikut berputar bersamanya,
      // menghadap arah yang sama (bukan terbalik). Offset di ruang lokal karakter.
      const a = menuState.spin;
      const ox = -0.95, oz = 0.05; // (-X) = sisi kiri karakter saat menghadap depan
      const cos = Math.cos(a), sin = Math.sin(a);
      tx = game.laneX + ox * cos + oz * sin;
      tz = -ox * sin + oz * cos;
      ty = 1.3 + Math.sin(t * 2.2) * 0.1;
      petMesh.rotation.y = a; // hadap sama seperti karakter
    } else {
      tx = game.laneX + 1.05;
      tz = 0.35;
      ty = 1.55 + game.y * 0.6 + Math.sin(t * 2.2) * 0.12;
    }
    petMesh.position.x += (tx - petMesh.position.x) * Math.min(1, dt * 6);
    petMesh.position.y += (ty - petMesh.position.y) * Math.min(1, dt * 6);
    petMesh.position.z += (tz - petMesh.position.z) * Math.min(1, dt * 6);
    petMesh.rotation.z = Math.sin(t * 2.2) * 0.1;
    if ((petMesh.userData as any).anim) (petMesh.userData as any).anim(t);
  }

  const emitTrail = (game.state === 'playing' && game.y <= 0.01 && game.sliding <= 0)
    || (game.state === 'menu' && trailFX.previewId
        && (menuState.tab === 'koleksi' || menuState.collectionSelect));
  if (emitTrail) {
    trailFX.timer -= dt;
    if (trailFX.timer <= 0) {
      trailFX.timer = 0.045;
      // "Belakang" karakter = +Z lokal; saat pratinjau diputar, ikut berputar
      // supaya jejak selalu di punggung karakter, bukan di titik dunia tetap.
      const s = menuState.collectionSelect ? menuState.spin : 0;
      trailFX.spawn(game.laneX + 0.45 * Math.sin(s), 0.15, 0.45 * Math.cos(s));
    }
  }
}

export function checkCollisions(): boolean {
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
  if (game.invuln > 0) return false;
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const o = world.obstacles[i];
    const depth = (o.type === 'block' || o.type === 'mover') ? 1.0 : 0.5;
    if (Math.abs(o.z) > depth / 2 + 0.35) continue;
    const ox = o.type === 'mover' ? o.mesh.position.x : LANES[o.lane];
    if (Math.abs(ox - px) > 1.1) continue;
    let hit = false;
    if (o.type === 'barrier') {
      hit = game.y < 0.75;
    } else if (o.type === 'overhang') {
      hit = game.sliding <= 0 && game.y < 2.0;
    } else if (o.type === 'mover') {
      hit = game.y < 1.6;
    } else {
      hit = game.y < 2.3;
    }
    if (!hit) continue;
    if (game.power.shield > 0) {
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

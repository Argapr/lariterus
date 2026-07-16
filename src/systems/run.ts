// ============================================================
// Lari: reset, gerak dunia, siklus hidup lari, revive
// ============================================================
import { game, world, clearList } from '../core/state';
import { store } from '../core/store';
import { levelInfo } from '../core/store';
import { AudioFX } from '../core/audio';
import {
  BASE_SPEED, MAX_SPEED, DESPAWN_Z, LANES, SPAWN_Z,
  EVENT_GAP, randRange, REVIVE_BASE, REVIVE_MAX, REVIVE_SECONDS, REVIVE_INVULN,
} from '../core/constants';
import { POWER_INFO } from '../core/constants';
import { powerDuration } from '../data/progression';
import { todayKey } from '../core/util';
import { trailFX } from '../gfx/trail';
import { spawnDeco, setStudioMode } from '../gfx/world';
import { spawnPattern } from './spawn';
import { EVENTS, startEvent, endEvent } from './events';
import { registerNearMiss } from './player';
import { failStage } from './boss';
import { $, showScreen, toast } from '../ui/dom';
import { refreshMenu } from '../ui/menu';
import { applyRunToMissions, saveToBoard, checkAchievements } from '../ui/progress';
import { maybeShowChest } from '../ui/rewards';

export function resetRun() {
  clearList(world.obstacles);
  clearList(world.coins);
  clearList(world.powerups);
  trailFX.clear();
  endEvent();
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
  game.scoreAcc = 0;
  game.time = 0;
  game.shake = 0;
  game.revives = 0;
  game.invuln = 0;
  game.reviveTimer = 0;
  game.mult = 1;
  game.nearMiss = 0;
  game.event = null;
  game.nextEvent = randRange(EVENT_GAP[0] * 0.6, EVENT_GAP[1] * 0.6);
  game.charMesh.rotation.set(0, 0, 0);
  game.charMesh.position.set(0, 0, 0);
}

export function moveWorld(dt: number) {
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
    if (o.type === 'mover') {
      if (o.z > -18 && o.z < -1) {
        o.lane = game.lane;
        o.mesh.position.x += (LANES[o.lane] - o.mesh.position.x) * Math.min(1, dt * 2.4);
      }
      const ball = (o.mesh.userData as any).ball;
      if (ball) ball.rotation.x += dz * 0.5;
    }
    if (game.state === 'playing' && !o.passed && o.z > 0.6) {
      o.passed = true;
      if (game.invuln <= 0) {
        const dx = Math.abs(o.mesh.position.x - game.laneX);
        if (dx < 2.5) registerNearMiss();
      }
    }
    if (o.z > DESPAWN_Z) { world.group.remove(o.mesh); world.obstacles.splice(i, 1); }
  }
  for (let i = world.coins.length - 1; i >= 0; i--) {
    const c = world.coins[i];
    c.mesh.position.z += dz;
    c.mesh.rotation.y += dt * 4;
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
  for (const cloud of world.clouds) {
    cloud.position.x += dt * 0.6;
    if (cloud.position.x > 90) cloud.position.x = -90;
  }
  if (world.snow) {
    const pos = world.snow.geometry.attributes.position as any;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 3.2;
      if (y < 0) y = 24 + Math.random() * 2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(performance.now() * 0.001 + i) * dt * 0.4);
    }
    pos.needsUpdate = true;
  }

  if (game.state === 'playing') {
    if (!game.event && game.distance > game.nextEvent) {
      const types = Object.keys(EVENTS);
      startEvent(types[(Math.random() * types.length) | 0]);
    }
    if (game.event) {
      game.event.timeLeft -= dt;
      if (game.event.timeLeft <= 0) {
        endEvent();
        game.nextEvent = game.distance + randRange(EVENT_GAP[0], EVENT_GAP[1]);
      }
    }
    if (game.chaser) {
      game.chaser.position.x += (game.laneX - game.chaser.position.x) * Math.min(1, dt * 3);
      game.chaser.position.z = 2.8 + Math.sin(performance.now() * 0.006) * 0.4;
      game.chaser.position.y = 1.35 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.3;
      game.chaser.rotation.z = Math.sin(performance.now() * 0.012) * 0.1;
    }
  }

  const spawnGap = game.event ? (game.event.type === 'coin_rain' ? 7 : 11) : (16 + Math.random() * 10);
  if (game.distance > game.nextSpawn) {
    spawnPattern(SPAWN_Z);
    game.nextSpawn = game.distance + spawnGap;
  }
  if (game.distance > game.nextDeco) {
    spawnDeco(SPAWN_Z - Math.random() * 8);
    game.nextDeco = game.distance + 6;
  }
}

// ---------- Siklus hidup lari (endless) ----------
export function startGame() {
  AudioFX.click();
  game.mode = 'endless';
  setStudioMode(false); // keluar dari latar studio lobi
  resetRun();
  const v = store.vouchers;
  const used: string[] = [];
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
  $('hud-mult').classList.add('hidden');
  $('event-banner').classList.add('hidden');
  $('popups').innerHTML = '';
  game.state = 'playing';
  showScreen('hud');
}
export function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  showScreen('hud', 'pause');
}
export function resumeGame() {
  game.state = 'playing';
  showScreen('hud');
}
export function backToMenu() {
  AudioFX.click();
  resetRun();
  game.state = 'menu';
  showScreen('menu');
  refreshMenu();
  maybeShowChest();
}

export function die() {
  const cost = REVIVE_BASE * Math.pow(2, game.revives);
  if (game.revives < REVIVE_MAX && store.coinsTotal >= cost) {
    offerRevive(cost);
  } else {
    finalizeRun();
  }
}
export function offerRevive(cost: number) {
  game.state = 'revive';
  game.reviveTimer = REVIVE_SECONDS;
  game.shake = 0.4;
  AudioFX.crash();
  $('revive-cost').textContent = String(cost);
  ($('btn-revive') as HTMLElement).style.opacity = '1';
  updateReviveUI();
  showScreen('hud', 'revive');
}
export function updateReviveUI() {
  const frac = game.reviveTimer / REVIVE_SECONDS;
  $('revive-count').textContent = String(Math.ceil(game.reviveTimer));
  ($('revive-arc') as unknown as SVGElement).style.strokeDashoffset = (327 * (1 - frac)).toFixed(1);
}
export function acceptRevive() {
  const cost = REVIVE_BASE * Math.pow(2, game.revives);
  if (store.coinsTotal < cost) { finalizeRun(); return; }
  store.coinsTotal -= cost;
  game.revives++;
  game.invuln = REVIVE_INVULN;
  game.power.shield = Math.max(game.power.shield, 2.5);
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    if (world.obstacles[i].z > -22) {
      world.group.remove(world.obstacles[i].mesh);
      world.obstacles.splice(i, 1);
    }
  }
  game.lane = 1;
  AudioFX.powerup();
  import('../ui/dom').then(m => m.popup('BANGKIT! 💪'));
  game.state = 'playing';
  showScreen('hud');
}
export function declineRevive() {
  AudioFX.click();
  finalizeRun();
}

export function finalizeRun() {
  if (game.mode === 'adventure') { failStage('Kamu tumbang sebelum mencapai bos!'); return; }
  game.state = 'gameover';
  AudioFX.crash();
  game.shake = 0.5;
  endEvent();
  if (game.chaser) { world.group.remove(game.chaser); game.chaser = null; }
  const isRecord = game.score > store.best;
  if (isRecord) store.best = game.score;

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

  const lvlBefore = levelInfo().lvl;
  store.xp += game.score;
  const lvlAfter = levelInfo().lvl;
  if (lvlAfter > lvlBefore) {
    let bonus = 0;
    for (let l = lvlBefore + 1; l <= lvlAfter; l++) bonus += 100 * l;
    store.coinsTotal += bonus;
    toast(`⭐ Naik ke Level ${lvlAfter}! +${bonus} 🪙`);
  }

  const st = store.stats;
  st.dist += Math.floor(game.distance);
  st.coins += game.coins;
  st.runs += 1;
  st.powerups += game.runPowerups;
  store.stats = st;
  checkAchievements();

  if (game.distance >= 500 && Math.random() < 0.25) {
    store.chests++;
    toast('📦 Kamu menemukan peti misterius!');
  }

  $('go-score').textContent = String(game.score);
  $('go-best').textContent = `🏆 TERBAIK: ${store.best}`;
  $('go-dist').textContent = String(Math.floor(game.distance));
  $('go-coins').textContent = String(game.coins);
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

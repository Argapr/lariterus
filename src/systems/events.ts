// ============================================================
// Event lintasan (hujan koin, dikejar, lintasan sempit)
// ============================================================
import * as THREE from 'three';
import { game, world } from '../core/state';
import { EVENT_DURATION, MAX_SPEED } from '../core/constants';
import { toon } from '../gfx/textures';
import { spawnObstacle, spawnCoin } from './spawn';
import { showBanner, popup } from '../ui/dom';

export const EVENTS: Record<string, { banner: string; color: string }> = {
  coin_rain: { banner: '☔ HUJAN KOIN!', color: '#ffd34d' },
  chase: { banner: '🏃 DIKEJAR!', color: '#ff5a5a' },
  narrow: { banner: '↔️ LINTASAN SEMPIT!', color: '#8ae6ff' },
};

export function startEvent(type: string) {
  game.event = { type, timeLeft: EVENT_DURATION, narrowLane: 0 };
  showBanner(EVENTS[type].banner, EVENTS[type].color);
  if (type === 'chase') {
    game.speed = Math.min(MAX_SPEED, game.speed + 3);
    spawnChaser();
  } else if (type === 'narrow') {
    game.event.narrowLane = Math.random() < 0.5 ? 0 : 2;
  }
}

export function endEvent() {
  if (game.chaser) { world.group.remove(game.chaser); game.chaser = null; }
  if (game.event && game.event.type === 'chase' && game.state === 'playing') {
    game.coins += 15;
    popup('+15 🪙 SELAMAT!');
  }
  game.event = null;
}

export function spawnChaser() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 14), toon(0x6a2a8a));
  body.scale.set(1, 0.85, 1);
  g.add(body);
  for (const sx of [-0.5, 0.5]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffee44 }));
    eye.position.set(sx, 0.5, -1.1);
    g.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x201000 }));
    pup.position.set(sx, 0.5, -1.35);
    g.add(pup);
  }
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), toon(0xffffff));
    t.position.set(-0.6 + i * 0.24, -0.35, -1.15);
    t.rotation.x = Math.PI;
    g.add(t);
  }
  g.scale.setScalar(0.8);
  g.position.set(0, 1.35, 2.8);
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  world.group.add(g);
  game.chaser = g;
}

export function spawnEventPattern(z: number) {
  const ev = game.event!;
  if (ev.type === 'coin_rain') {
    for (let l = 0; l < 3; l++)
      for (let j = 0; j < 4; j++)
        if (Math.random() < 0.8) spawnCoin(l, z - j * 1.5, 0.9 + Math.sin((l + j)) * 0.3 + 0.4);
  } else if (ev.type === 'chase') {
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const types = ['barrier', 'block', 'overhang'];
    spawnObstacle(types[(Math.random() * 3) | 0], lanes[0], z);
    if (Math.random() < 0.6) spawnObstacle(types[(Math.random() * 3) | 0], lanes[1], z - 1);
    for (let i = 0; i < 3; i++) spawnCoin(lanes[2], z - i * 1.5);
  } else if (ev.type === 'narrow') {
    const wallLane = ev.narrowLane;
    spawnObstacle('block', wallLane, z);
    const others = [0, 1, 2].filter(l => l !== wallLane);
    if (Math.random() < 0.6) {
      const t = ['barrier', 'overhang'][(Math.random() * 2) | 0];
      spawnObstacle(t, others[(Math.random() * others.length) | 0], z);
    }
    for (const l of others) if (Math.random() < 0.5) spawnCoin(l, z, 0.9);
  }
}

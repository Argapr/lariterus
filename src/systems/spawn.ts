// ============================================================
// Spawn: rintangan, koin, power-up, pola lintasan
// ============================================================
import * as THREE from 'three';
import { world } from '../core/state';
import { game } from '../core/state';
import { LANES, POWER_DURATION } from '../core/constants';
import { toon, gradientMap } from '../gfx/textures';
import { spawnEventPattern } from './events';

export function spawnObstacle(type: string, lane: number, z: number) {
  const { geoms, mats } = world.themeAssets!;
  let mesh: THREE.Object3D;
  if (type === 'barrier') {
    const grp = new THREE.Group();
    const board = new THREE.Mesh(geoms.barrier, mats.hazard);
    board.position.y = 0.5;
    grp.add(board);
    for (const sx of [-0.8, 0.8]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.5), mats.pole);
      foot.position.set(sx, 0.11, 0);
      grp.add(foot);
    }
    grp.position.set(LANES[lane], 0, z);
    mesh = grp;
  } else if (type === 'block') {
    const m = new THREE.Mesh(geoms.crate, mats.crate);
    m.position.set(LANES[lane], 1.15, z);
    mesh = m;
  } else if (type === 'mover') {
    const grp = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), toon(0x8a4030));
    grp.add(ball);
    for (let i = 0; i < 10; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 6), toon(0xcaa070));
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      spike.position.set(Math.cos(a) * Math.cos(b) * 0.7, Math.sin(b) * 0.7, Math.sin(a) * Math.cos(b) * 0.7);
      spike.lookAt(spike.position.clone().multiplyScalar(2));
      spike.rotateX(Math.PI / 2);
      grp.add(spike);
    }
    grp.userData.ball = ball;
    grp.position.set(LANES[lane], 0.7, z);
    mesh = grp;
  } else { // overhang
    const grp = new THREE.Group();
    for (const sx of [-1.05, 1.05]) {
      const pole = new THREE.Mesh(geoms.pole, mats.pole);
      pole.position.set(sx, 1.2, 0);
      grp.add(pole);
    }
    const bar = new THREE.Mesh(geoms.bar, mats.bar);
    bar.position.y = 1.55;
    grp.add(bar);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.05), mats.hazard);
    sign.position.y = 1.32;
    grp.add(sign);
    grp.position.set(LANES[lane], 0, z);
    mesh = grp;
  }
  mesh.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  world.group.add(mesh);
  world.obstacles.push({ mesh, type, lane, z });
}

export function spawnCoin(lane: number, z: number, y = 1.0) {
  const { geoms, mats } = world.themeAssets!;
  const mesh = new THREE.Group();
  const disc = new THREE.Mesh(geoms.coin, mats.coin);
  disc.rotation.z = Math.PI / 2;
  mesh.add(disc);
  const rim = new THREE.Mesh(geoms.coinRim, mats.coin);
  mesh.add(rim);
  mesh.position.set(LANES[lane], y, z);
  mesh.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  world.group.add(mesh);
  world.coins.push({ mesh, lane });
}

// ---------- Item power-up (model 3D prosedural) ----------
export function makePowerupMesh(type: string): THREE.Group {
  const g = new THREE.Group();
  if (type === 'magnet') {
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

export function spawnPowerup(lane: number, z: number) {
  const types = Object.keys(POWER_DURATION);
  const type = types[(Math.random() * types.length) | 0];
  const mesh = makePowerupMesh(type);
  mesh.position.set(LANES[lane], 1.1, z);
  world.group.add(mesh);
  world.powerups.push({ mesh, type, lane, bob: Math.random() * Math.PI * 2 });
}

// ---------- Pola spawn ----------
export function spawnPattern(z: number) {
  if (game.event) { spawnEventPattern(z); return; }

  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
  const r = Math.random();
  if (game.distance > 400 && r < 0.14) {
    spawnObstacle('mover', lanes[0], z);
    for (let i = 0; i < 3; i++) spawnCoin(lanes[1], z - i * 1.6);
    for (let i = 0; i < 3; i++) spawnCoin(lanes[2], z - i * 1.6);
  } else if (r < 0.28) {
    spawnObstacle('barrier', lanes[0], z);
    for (let i = -2; i <= 2; i++)
      spawnCoin(lanes[0], z + i * 1.4, 1.0 + Math.max(0, 1.1 - Math.abs(i) * 0.45));
    for (let i = 0; i < 3; i++) spawnCoin(lanes[1], z - i * 1.6);
  } else if (r < 0.5) {
    spawnObstacle('block', lanes[0], z);
    spawnObstacle('barrier', lanes[1], z);
    for (let i = 0; i < 4; i++) spawnCoin(lanes[2], z + 2 - i * 1.6);
  } else if (r < 0.7) {
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
  if (Math.random() < 0.16) {
    const blocked = world.obstacles
      .filter(o => (o.type === 'block' || o.type === 'mover') && Math.abs(o.mesh.position.z - z) < 8)
      .map(o => o.lane);
    const free = [0, 1, 2].filter(l => !blocked.includes(l));
    if (free.length) spawnPowerup(free[(Math.random() * free.length) | 0], z - 9);
  }
}

// ============================================================
// Kamera: gameplay, menu, dan arena bos
// ============================================================
import * as THREE from 'three';
import { camera } from '../core/three';
import { game, menuState } from '../core/state';

export function updateCamera(dt: number) {
  // Kamera arena bos: dari atas-belakang, mengikuti pemain, bos tetap terlihat
  if (game.state === 'boss' && game.boss) {
    const b = game.boss;
    let sx = 0, sy = 0;
    if (game.shake > 0) {
      game.shake -= dt;
      sx = (Math.random() - 0.5) * game.shake * 1.2;
      sy = (Math.random() - 0.5) * game.shake * 1.2;
    }
    // Intro: sorot bos dari dekat sebelum tempur mulai
    if (b.introT > 0) {
      camera.position.lerp(new THREE.Vector3(sx, 4.2 + sy, b.bossZ + 8.5), Math.min(1, dt * 3));
      camera.lookAt(b.mesh.position.x * 0.6, 3.4, b.bossZ);
      return;
    }
    // Tempur: lebih dekat & dramatis daripada kamera lari
    camera.position.lerp(new THREE.Vector3(b.px * 0.45 + sx, 6.6 + sy, b.pz + 8.2), Math.min(1, dt * 4));
    camera.lookAt(b.px * 0.3, 2.2, b.bossZ + 3.2);
    return;
  }
  let cx = game.laneX * 0.45;
  let cy = 4.1, cz = 6.4;
  if (game.state === 'menu') {
    if (menuState.tab === 'tema') { cx = 0; cy = 4.6; cz = 7.5; }
    else if (menuState.tab === 'koleksi') { cx = 0; cy = 3.3; cz = 5.6; }
    else { cx = 0; cy = 1.65; cz = -3.7; }
  }
  if (game.shake > 0) {
    game.shake -= dt;
    cx += (Math.random() - 0.5) * game.shake * 0.9;
    cy += (Math.random() - 0.5) * game.shake * 0.9;
  }
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 5));
  const menuChar = game.state === 'menu' && menuState.tab !== 'tema';
  const lookTarget = game.state === 'menu' && menuState.tab === 'koleksi'
    ? new THREE.Vector3(0.15, 1.2, -3)
    : menuChar ? new THREE.Vector3(0, 1.15, 0)
      : new THREE.Vector3(game.laneX * 0.3, 1.3, -5);
  camera.lookAt(lookTarget);
}

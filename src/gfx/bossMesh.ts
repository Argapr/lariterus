// ============================================================
// Model bos raksasa (prosedural, toon)
// ============================================================
import * as THREE from 'three';
import { toon } from './textures';
import type { BossCfg } from '../types';

export function buildBoss(cfg: BossCfg): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = toon(cfg.color);
  const accMat = toon(cfg.accent);
  // Kaki
  for (const sx of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 6, 12), bodyMat);
    leg.position.set(sx, 0.7, 0); g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), accMat);
    foot.scale.set(1, 0.6, 1.3); foot.position.set(sx, 0.25, -0.25); g.add(foot);
  }
  // Badan + perut
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 18), bodyMat);
  body.position.y = 2.3; body.scale.set(1.1, 1.15, 1); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 16), accMat);
  belly.position.set(0, 2.1, -0.55); belly.scale.set(0.9, 0.95, 0.5); g.add(belly);
  // Lengan
  const arms: THREE.Group[] = [];
  for (const sx of [-1.55, 1.55]) {
    const pivot = new THREE.Group(); pivot.position.set(sx, 2.8, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.95, 6, 12), bodyMat);
    arm.position.y = -0.5; pivot.add(arm);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), accMat);
    fist.position.y = -1.05; pivot.add(fist);
    g.add(pivot); arms.push(pivot);
  }
  // Kepala
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 16), bodyMat);
  head.position.y = 3.7; g.add(head);
  for (const sx of [-0.4, 0.4]) { // mata menyala
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffee44 }));
    eye.position.set(sx, 3.85, -0.85); g.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x300000 }));
    pup.position.set(sx, 3.82, -1.02); g.add(pup);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a0000 }));
  mouth.position.set(0, 3.38, -0.9); g.add(mouth);
  for (let i = 0; i < 4; i++) { // taring
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 6), toon(0xffffff));
    t.position.set(-0.33 + i * 0.22, 3.3, -0.96); t.rotation.x = Math.PI; g.add(t);
  }
  for (let i = 0; i < cfg.horns; i++) { // tanduk
    const side = i % 2 ? 1 : -1;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), accMat);
    horn.position.set(side * (0.4 + (i >> 1) * 0.16), 4.4, -0.05 + (i >> 1) * 0.2);
    horn.rotation.z = side * -0.3; g.add(horn);
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.userData = {
    arms,
    bodyMat, accMat,
    baseColor: new THREE.Color(cfg.color),
    accColor: new THREE.Color(cfg.accent),
  };
  return g;
}

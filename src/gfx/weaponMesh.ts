// ============================================================
// Wujud senjata yang dipegang karakter + bentuk pelurunya
// Semua mesh menghadap -Z (arah bos), moncong = userData.muzzle
// ============================================================
import * as THREE from 'three';
import { toon } from './textures';
import type { Weapon, WeaponShape } from '../types';

const metal = () => toon(0x39404f);
const dark = () => toon(0x1e222b);

function grip(g: THREE.Group, y = -0.15, z = 0.02) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.11), dark());
  m.position.set(0, y, z);
  m.rotation.x = 0.22;
  g.add(m);
}

/** Senjata yang dipegang: tiap wujud beda siluet. */
export function buildWeaponMesh(shape: WeaponShape, color: number): THREE.Group {
  const g = new THREE.Group();
  const accent = new THREE.MeshBasicMaterial({ color });
  const muzzle = new THREE.Object3D();
  let spinner: THREE.Group | null = null;

  if (shape === 'pistol') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.42), metal());
    body.position.set(0, 0, -0.14); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10), dark());
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.44); g.add(barrel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), accent);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.02, -0.57); g.add(ring);
    grip(g);
    muzzle.position.set(0, 0.02, -0.62);

  } else if (shape === 'triple') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.34), metal());
    body.position.set(0, 0, -0.1); g.add(body);
    for (const sx of [-0.09, 0, 0.09]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.42, 8), dark());
      b.rotation.x = Math.PI / 2; b.position.set(sx, 0, -0.42); g.add(b);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), accent);
      tip.position.set(sx, 0, -0.62); g.add(tip);
    }
    grip(g, -0.14, 0.04);
    muzzle.position.set(0, 0, -0.66);

  } else if (shape === 'minigun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.19, 0.4), metal());
    body.position.set(0, 0, -0.06); g.add(body);
    spinner = new THREE.Group();
    spinner.position.set(0, 0, -0.42);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.52, 6), dark());
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0);
      spinner.add(b);
    }
    g.add(spinner);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14), accent);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, 0, -0.42); g.add(ring);
    grip(g, -0.15, 0.06);
    muzzle.position.set(0, 0, -0.72);

  } else { // cannon
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.36, 12), metal());
    body.rotation.x = Math.PI / 2; body.position.set(0, 0, -0.12); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.34, 12), dark());
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0, -0.46); g.add(barrel);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 16), accent);
    lip.rotation.x = Math.PI / 2; lip.position.set(0, 0, -0.62); g.add(lip);
    grip(g, -0.16, 0.02);
    muzzle.position.set(0, 0, -0.68);
  }

  g.add(muzzle);
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.userData = { muzzle, spinner, shape };
  return g;
}

// ---------- Peluru tracer ----------
const bulletGeoCache: Partial<Record<WeaponShape, THREE.BufferGeometry>> = {};
const haloGeoCache: Partial<Record<WeaponShape, THREE.BufferGeometry>> = {};
const bulletMatCache: Record<number, THREE.MeshBasicMaterial> = {};
const haloMatCache: Record<number, THREE.MeshBasicMaterial> = {};

function bulletGeo(shape: WeaponShape) {
  if (!bulletGeoCache[shape]) {
    let g: THREE.BufferGeometry;
    if (shape === 'cannon') g = new THREE.SphereGeometry(0.4, 12, 12);
    else if (shape === 'minigun') g = new THREE.CapsuleGeometry(0.06, 0.9, 4, 8);
    else if (shape === 'triple') g = new THREE.CapsuleGeometry(0.1, 0.3, 4, 8);
    else g = new THREE.CapsuleGeometry(0.12, 0.46, 4, 8);
    if (shape !== 'cannon') g.rotateX(Math.PI / 2); // sumbu kapsul → Z (searah terbang)
    bulletGeoCache[shape] = g;
  }
  return bulletGeoCache[shape]!;
}
function haloGeo(shape: WeaponShape) {
  if (!haloGeoCache[shape]) {
    const r = shape === 'cannon' ? 0.72 : shape === 'minigun' ? 0.2 : shape === 'triple' ? 0.24 : 0.3;
    haloGeoCache[shape] = new THREE.SphereGeometry(r, 10, 10);
  }
  return haloGeoCache[shape]!;
}
function bulletMat(color: number) {
  if (!bulletMatCache[color]) bulletMatCache[color] = new THREE.MeshBasicMaterial({ color });
  return bulletMatCache[color];
}
function haloMat(color: number) {
  if (!haloMatCache[color]) {
    haloMatCache[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26, depthWrite: false });
  }
  return haloMatCache[color];
}

/** Peluru menyala: inti terang + halo glow, memanjang searah terbang. */
export function buildBullet(w: Weapon): THREE.Mesh {
  const m = new THREE.Mesh(bulletGeo(w.shape), bulletMat(w.projColor));
  m.add(new THREE.Mesh(haloGeo(w.shape), haloMat(w.projColor)));
  return m;
}

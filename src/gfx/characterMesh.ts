// ============================================================
// Pembuat karakter chibi (bola & kapsul halus + toon shading)
// ============================================================
import * as THREE from 'three';
import { toon } from './textures';
import type { CharacterCfg } from '../types';

export function buildCharacter(cfg: CharacterCfg): THREE.Group {
  return cfg.kind === 'dino' ? buildDino(cfg) : buildHuman(cfg);
}

function addEyes(g: THREE.Group, y: number, z: number, spread: number, size: number, browColor: number | null) {
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

function buildHuman(cfg: CharacterCfg): THREE.Group {
  const g = new THREE.Group();

  // Kaki (pivot pinggul)
  const legs: THREE.Group[] = [];
  for (const sx of [-0.14, 0.14]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.62, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 4, 10), toon(cfg.pants!));
    leg.position.y = -0.2;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toon(cfg.shoe!));
    shoe.scale.set(1, 0.75, 1.5);
    shoe.position.set(0, -0.42, -0.05);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }

  // Badan
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 6, 14), toon(cfg.shirt!));
  body.position.y = 0.95;
  body.scale.set(1, 1, 0.85);
  g.add(body);
  if (cfg.girl) {
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 14), toon(cfg.pants!));
    skirt.position.y = 0.72;
    g.add(skirt);
  }

  // Lengan (pivot bahu) + sarung tangan putih
  const arms: THREE.Group[] = [];
  for (const sx of [-0.35, 0.35]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.12, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 4, 10), toon(cfg.shirt!));
    arm.position.y = -0.17;
    pivot.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), toon(0xffffff));
    glove.position.y = -0.38;
    pivot.add(glove);
    g.add(pivot);
    arms.push(pivot);
  }

  // Kepala besar khas chibi
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 20), toon(cfg.skin!));
  head.position.y = 1.62;
  g.add(head);

  // Wajah
  addEyes(g, 1.68, -0.34, 0.15, 0.095, cfg.hair!);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), toon(cfg.skin!));
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
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.22), toon(cfg.hair!));
    backHair.position.set(0, 1.66, 0.06);
    backHair.scale.set(1.06, 1.06, 1.06);
    g.add(backHair);
  } else {
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(cfg.hair!));
    hairCap.position.y = 1.64;
    g.add(hairCap);
    if (cfg.girl && !cfg.helmet) {
      const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10), toon(cfg.hair!));
      pony.position.set(0, 1.5, 0.42);
      pony.rotation.x = 0.55;
      g.add(pony);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 12), toon(cfg.shirt!));
      tie.position.set(0, 1.72, 0.36);
      tie.rotation.x = 1.2;
      g.add(tie);
    }
  }

  // --- Aksesori khusus ---
  if (cfg.headband) {
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
  if (cfg.helmet) {
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
  if (cfg.cat) {
    for (const sx of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 10), toon(cfg.skin!));
      ear.position.set(sx, 2.02, 0);
      ear.rotation.z = sx > 0 ? -0.25 : 0.25;
      g.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), toon(0xffc8d0));
      inner.position.set(sx, 2.01, -0.03);
      inner.rotation.z = ear.rotation.z;
      g.add(inner);
    }
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 4, 10), toon(cfg.skin!));
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

  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.userData = { arms, legs };
  return g;
}

function buildDino(cfg: CharacterCfg): THREE.Group {
  const g = new THREE.Group();

  const legs: THREE.Group[] = [];
  for (const sx of [-0.17, 0.17]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.58, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 10), toon(cfg.body!));
    leg.position.y = -0.18;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), toon(cfg.shoe!));
    shoe.scale.set(1, 0.7, 1.5);
    shoe.position.set(0, -0.38, -0.06);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), toon(cfg.body!));
  body.position.y = 0.95;
  body.scale.set(0.95, 1.05, 0.9);
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), toon(cfg.belly!));
  belly.position.set(0, 0.9, -0.14);
  belly.scale.set(0.85, 0.95, 0.6);
  g.add(belly);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 12), toon(cfg.body!));
  tail.position.set(0, 0.85, 0.55);
  tail.rotation.x = 2.2;
  g.add(tail);

  const arms: THREE.Group[] = [];
  for (const sx of [-0.4, 0.4]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.05, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 4, 8), toon(cfg.body!));
    arm.position.y = -0.13;
    pivot.add(arm);
    g.add(pivot);
    arms.push(pivot);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), toon(cfg.body!));
  head.position.y = 1.62;
  g.add(head);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), toon(cfg.belly!));
  snout.scale.set(1, 0.7, 1.1);
  snout.position.set(0, 1.5, -0.33);
  g.add(snout);
  for (const sx of [-0.06, 0.06]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x2a5a2a }));
    n.position.set(sx, 1.56, -0.5);
    g.add(n);
  }
  addEyes(g, 1.74, -0.28, 0.13, 0.09, null);

  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 8), toon(cfg.spike!));
    spike.position.set(0, 1.85 - i * 0.42, 0.3 + i * 0.06);
    spike.rotation.x = 0.5 + i * 0.25;
    g.add(spike);
  }

  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.userData = { arms, legs };
  return g;
}

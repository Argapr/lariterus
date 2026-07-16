// ============================================================
// Pet pendamping (melayang di samping pemain)
// ============================================================
import * as THREE from 'three';
import { scene } from '../core/three';
import { store } from '../core/store';
import { toon } from './textures';
import { instantiate, normalizeModel } from './assets';
import { PETS } from '../data/collections';

export let petMesh: THREE.Group | null = null;
let petToken = 0; // batalkan pemuatan model yang tersusul (ganti pet cepat)

export function buildPetMesh(id: string): THREE.Group {
  const g = new THREE.Group();
  if (id === 'cici') { // burung kuning
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), toon(0xf7d94c));
    g.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), toon(0xf09040));
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0, -0.19);
    g.add(beak);
    const wings: THREE.Mesh[] = [];
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
    g.userData.anim = (t: number) => { for (let i = 0; i < wings.length; i++) wings[i].rotation.z = (i ? -1 : 1) * Math.sin(t * 14) * 0.5; };
  } else if (id === 'kunang') { // kunang-kunang menyala
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: 0xd8ff70 }));
    g.add(glow);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xb8ff5c, transparent: true, opacity: 0.25 }));
    g.add(halo);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(0x3a3a2a));
    head.position.set(0, 0.04, -0.13);
    g.add(head);
    g.userData.anim = (t: number) => {
      const s = 1 + Math.sin(t * 6) * 0.3;
      halo.scale.setScalar(s);
      (halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.abs(Math.sin(t * 6)) * 0.2;
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
    const wings: THREE.Mesh[] = [];
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
    g.userData.anim = (t: number) => { for (let i = 0; i < wings.length; i++) wings[i].rotation.x = Math.sin(t * 10) * 0.4; };
  }
  return g;
}

// Muat pet model .glb ber-rig: dinormalisasi kecil, mixer dijalankan lewat userData.anim
async function loadPetModel(url: string, height: number, token: number) {
  const { root, clips } = await instantiate(url);
  if (token !== petToken) return; // sudah tersusul pilihan lain
  const holder = new THREE.Group();
  holder.add(root);
  normalizeModel(root, height);
  root.rotation.y = Math.PI;      // hadap depan (-Z), searah lari
  const mixer = new THREE.AnimationMixer(root);
  const idle = clips.find(c => /flying_?idle|idle/i.test(c.name)) ?? clips[0];
  if (idle) mixer.clipAction(idle).play();
  let last = 0;
  holder.userData.anim = (t: number) => {
    const dt = last ? Math.min(0.05, t - last) : 0;
    last = t;
    mixer.update(dt);
  };
  if (petMesh) scene.remove(petMesh);
  holder.position.set(1.1, 1.6, 0.3);
  petMesh = holder;
  scene.add(holder);
}

// Tampilkan pet: default pet yang dipakai; previewId untuk pratinjau di shop
export function applyPet(previewId?: string) {
  const id = previewId !== undefined ? previewId : store.petId;
  const token = ++petToken;                    // batalkan model in-flight
  if (petMesh) { scene.remove(petMesh); petMesh = null; }
  if (id === 'nopet') return;
  const cfg = PETS.find(p => p.id === id);
  if (cfg?.model) {
    void loadPetModel(cfg.model, cfg.petHeight ?? 0.9, token);
    return;
  }
  petMesh = buildPetMesh(id);
  petMesh.position.set(1.1, 1.6, 0.3);
  scene.add(petMesh);
}

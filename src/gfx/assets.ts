// ============================================================
// Pemuat aset 3D (.glb/.gltf) — cache + clone aman untuk model ber-rangka
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

/** Muat file GLTF/GLB (di-cache; pemanggilan berikutnya tidak mengunduh ulang). */
export function loadGLTF(url: string): Promise<GLTF> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    cache.set(url, p);
  }
  return p;
}

export interface ModelInstance {
  root: THREE.Group;
  clips: THREE.AnimationClip[];
}

/**
 * Ambil satu salinan model yang siap dipakai.
 * Memakai SkeletonUtils.clone supaya rangka (skinned mesh) ikut ter-clone dengan benar —
 * clone() biasa akan merusak binding tulang.
 */
export async function instantiate(url: string): Promise<ModelInstance> {
  const gltf = await loadGLTF(url);
  const root = cloneSkinned(gltf.scene) as THREE.Group;
  root.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { root, clips: gltf.animations.slice() };
}

/**
 * Samakan skala & pijakan model:
 * - tinggi diskalakan ke `targetHeight`
 * - digeser agar kaki menyentuh y = 0 dan terpusat di x/z
 * Ini yang bikin model dari pack mana pun langsung pas tanpa setel manual.
 */
export function normalizeModel(root: THREE.Object3D, targetHeight: number): number {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y <= 0.0001) return 1;
  const scale = targetHeight / size.y;
  root.scale.setScalar(scale);

  // Hitung ulang setelah diskalakan, lalu tempelkan ke lantai
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box2.min.y;
  return scale;
}

/** Cari tulang/objek di dalam model dengan pencocokan nama longgar (mis. 'righthand'). */
export function findBone(root: THREE.Object3D, want: string): THREE.Object3D | null {
  const target = want.toLowerCase().replace(/[^a-z]/g, '');
  let found: THREE.Object3D | null = null;
  root.traverse(o => {
    if (found) return;
    const n = o.name.toLowerCase().replace(/[^a-z]/g, '');
    if (n.includes(target)) found = o;
  });
  return found;
}

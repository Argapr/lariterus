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
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = false;
      // SkinnedMesh: bounding dihitung dari bind pose, bukan tulang teranimasi —
      // culling salah nilai & model "hilang". Matikan culling per-mesh.
      m.frustumCulled = false;
    }
  });
  return { root, clips: gltf.animations.slice() };
}

/**
 * Bounding box TAMPILAN yang sadar-skinning.
 *
 * Box3.setFromObject() memakai geometri bind-pose × matrixWorld node mesh.
 * Pada model ber-rangka (mis. Quaternius) geometri disimpan mungil dan
 * dikompensasi skala ×100 bertingkat di armature + node mesh — sedangkan yang
 * dirender mengikuti transformasi TULANG. Akibatnya setFromObject bisa melenceng
 * ~100×: model dinormalisasi jadi sebutir debu (bug "karakter hilang/kecil").
 *
 * Di sini vertex SkinnedMesh dihitung lewat getVertexPosition() (menerapkan
 * transformasi tulang), sehingga box = yang benar-benar tampak di layar.
 */
const _tmpBox = new THREE.Box3();
export function computeDisplayBox(root: THREE.Object3D, skinnedOnly = false): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let hasSkinned = false;
  root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) hasSkinned = true; });
  root.traverse(o => {
    const mesh = o as THREE.SkinnedMesh;
    if (!(mesh as unknown as THREE.Mesh).isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) return;
    if (mesh.isSkinnedMesh) {
      for (let i = 0; i < pos.count; i++) {
        mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
        box.expandByPoint(v);
      }
    } else {
      // Prop statis (senjata dll.) di bawah tulang ber-skala bisa memberi box palsu.
      // Kalau model punya skinned mesh, pijakan/tinggi cukup dari badannya saja.
      if (skinnedOnly && hasSkinned) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      _tmpBox.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
      box.union(_tmpBox);
    }
  });
  return box;
}

/**
 * Samakan skala & pijakan model:
 * - tinggi diskalakan ke `targetHeight`
 * - digeser agar kaki menyentuh y = 0 dan terpusat di x/z
 * Ini yang bikin model dari pack mana pun langsung pas tanpa setel manual.
 */
export function normalizeModel(root: THREE.Object3D, targetHeight: number): number {
  const box = computeDisplayBox(root, true);
  const size = box.getSize(new THREE.Vector3());
  if (size.y <= 0.0001) return 1;
  const scale = targetHeight / size.y;
  root.scale.setScalar(scale);

  // Hitung ulang setelah diskalakan, lalu tempelkan ke lantai
  const box2 = computeDisplayBox(root, true);
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

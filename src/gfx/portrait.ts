// ============================================================
// Renderer potret: render satu objek 3D ke gambar PNG (auto-fit).
// Dipakai kartu pilih karakter & koleksi. Studio terpisah dari scene utama.
// ============================================================
import * as THREE from 'three';
import { renderer } from '../core/three';

const SIZE = 220;
let pScene: THREE.Scene | null = null;
let pCam: THREE.PerspectiveCamera | null = null;
let pTarget: THREE.WebGLRenderTarget | null = null;

function ensure() {
  if (pScene) return;
  pScene = new THREE.Scene();
  pScene.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.25));
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
  sun.position.set(-1.6, 3.2, -3.0); // objek menghadap -Z → cahaya dari depan
  pScene.add(sun);
  pCam = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  pTarget = new THREE.WebGLRenderTarget(SIZE, SIZE);
}

/** Render objek (menghadap -Z) ke dataURL PNG, auto-fit bingkai. */
export function renderObjectPortrait(obj: THREE.Object3D, headBias = 0.12): string {
  ensure();
  pScene!.add(obj);

  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, 0.001);
  const fov = (38 * Math.PI) / 180;
  const dist = (maxDim * 0.5) / Math.tan(fov / 2) * 1.4;
  // Kamera di sisi -Z (depan objek), sedikit ke atas
  pCam!.position.set(center.x, center.y + size.y * headBias, center.z - dist);
  pCam!.lookAt(center.x, center.y + size.y * headBias * 0.5, center.z);

  const prevClear = new THREE.Color();
  renderer.getClearColor(prevClear);
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(pTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(pScene!, pCam!);
  const buf = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(pTarget!, 0, 0, SIZE, SIZE, buf);
  renderer.setRenderTarget(null);
  renderer.setClearColor(prevClear, prevAlpha);

  pScene!.remove(obj);

  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    const src = (SIZE - 1 - y) * SIZE * 4; // readPixels dari bawah → balik baris
    img.data.set(buf.subarray(src, src + SIZE * 4), y * SIZE * 4);
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

/** Ikon trail: guratan diagonal dalam warna trail (untuk kartu koleksi). */
export function trailThumb(colors: number[] | 'rainbow' | null): string {
  const cv = document.createElement('canvas');
  cv.width = 160; cv.height = 160;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#2a2440';
  ctx.fillRect(0, 0, 160, 160);
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const pick = (i: number): string => {
    if (colors === 'rainbow') return `hsl(${(i * 34) % 360},85%,62%)`;
    if (!colors) return '#666';
    return hex(colors[i % colors.length]);
  };
  if (!colors) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(40, 120); ctx.lineTo(120, 40); ctx.stroke();
    return cv.toDataURL('image/png');
  }
  for (let i = 0; i < 12; i++) {
    ctx.globalAlpha = 0.35 + Math.random() * 0.55;
    ctx.fillStyle = pick(i);
    const r = 6 + Math.random() * 12;
    const x = 20 + Math.random() * 120, y = 20 + Math.random() * 120;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  return cv.toDataURL('image/png');
}

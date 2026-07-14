// ============================================================
// Alat bantu: toon shading & tekstur canvas
// ============================================================
import * as THREE from 'three';

export const gradientMap = (() => {
  const data = new Uint8Array([120, 190, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

export const toon = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap });

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTexture(w: number, h: number, draw: DrawFn, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tekstur bintik acak (rumput, pasir, aspal)
export function speckleTex(base: string, dots: string[], count = 900, repeat: [number, number] = [1, 1]) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = dots[(Math.random() * dots.length) | 0];
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  }, repeat);
}

// Tekstur gedung dengan jendela
export function buildingTex(wall: string, winOff: string, winOn: string, litChance: number) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 18; y += 26) {
      for (let x = 10; x < w - 14; x += 24) {
        ctx.fillStyle = Math.random() < litChance ? winOn : winOff;
        ctx.fillRect(x, y, 14, 16);
      }
    }
  });
}

// Tekstur garis merah-putih (barrier)
export const hazardTex = canvasTexture(128, 64, (ctx, w, h) => {
  ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d93838';
  for (let x = -h; x < w + h; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.lineTo(x + h + 20, 0); ctx.lineTo(x + 20, h);
    ctx.fill();
  }
});

// Tekstur peti kayu
export const crateTex = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#a5713d'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7a4f26'; ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(w - 6, h - 6);
  ctx.moveTo(w - 6, 6); ctx.lineTo(6, h - 6); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 60; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 6);
});

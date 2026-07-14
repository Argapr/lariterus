// ============================================================
// Trail: partikel jejak lari
// ============================================================
import * as THREE from 'three';
import { scene } from '../core/three';
import { store } from '../core/store';
import { TRAILS } from '../data/collections';

interface TrailPart { sp: THREE.Sprite; life: number; }

export const trailFX = {
  parts: [] as TrailPart[],
  matCache: {} as Record<number, THREE.SpriteMaterial>,
  timer: 0,
  hue: 0,
  previewId: null as string | null,
  mat(color: number) {
    if (!this.matCache[color]) this.matCache[color] = new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.9 });
    return this.matCache[color];
  },
  spawn(x: number, y: number, z: number) {
    const t = TRAILS.find(t => t.id === (this.previewId || store.trailId));
    if (!t || !t.colors) return;
    let color: number;
    if (t.colors === 'rainbow') {
      this.hue = (this.hue + 0.07) % 1;
      color = new THREE.Color().setHSL(this.hue, 0.9, 0.6).getHex();
    } else {
      color = t.colors[(Math.random() * t.colors.length) | 0];
    }
    const sp = new THREE.Sprite(this.mat(color).clone());
    const s = 0.22 + Math.random() * 0.14;
    sp.scale.set(s, s, 1);
    sp.position.set(x + (Math.random() - 0.5) * 0.3, y + Math.random() * 0.15, z);
    scene.add(sp);
    this.parts.push({ sp, life: 0.55 });
  },
  update(dt: number, worldDz: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.sp.position.z += worldDz;
      p.sp.position.y += dt * 0.5;
      p.sp.material.opacity = Math.max(0, p.life / 0.55) * 0.9;
      const s = p.sp.scale.x * (1 - dt * 1.6);
      p.sp.scale.set(s, s, 1);
      if (p.life <= 0) {
        scene.remove(p.sp);
        p.sp.material.dispose();
        this.parts.splice(i, 1);
      }
    }
  },
  clear() {
    for (const p of this.parts) { scene.remove(p.sp); p.sp.material.dispose(); }
    this.parts.length = 0;
  },
};

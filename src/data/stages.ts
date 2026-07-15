import type { Stage } from '../types';

// Lari sampai jarak target, lalu lawan bos
// (warna/tanduk = fallback prosedural kalau model gagal dimuat)
export const STAGES: Stage[] = [
  { id: 'st1', name: 'Taman Awal', theme: 'kota', distance: 450,
    boss: { name: 'Rex Rimba', hp: 120, color: 0x4a8f3c, accent: 0xe0653a, horns: 2,
      model: '/models/bosses/trex.glb', size: 4.8 } },
  { id: 'st2', name: 'Gurun Terik', theme: 'gurun', distance: 650,
    boss: { name: 'Laba-laba Raja', hp: 210, color: 0xd98a3c, accent: 0x7a3f1f, horns: 3,
      model: '/models/bosses/spider.glb', size: 3.2 } },
  { id: 'st3', name: 'Kota Neon', theme: 'neon', distance: 850,
    boss: { name: 'Bot Penjaga', hp: 330, color: 0xc400ff, accent: 0x35e0e0, horns: 4,
      model: '/models/bosses/mech.glb', size: 4.4 } },
  { id: 'st4', name: 'Puncak Salju', theme: 'salju', distance: 1050,
    boss: { name: 'Ular Salju', hp: 480, color: 0xdfeaf5, accent: 0x8fb8dd, horns: 5,
      model: '/models/bosses/snake.glb', size: 3.4 } },
];

export function stageUnlocked(idx: number, cleared: string[]): boolean {
  if (idx === 0) return true;
  return cleared.includes(STAGES[idx - 1].id);
}

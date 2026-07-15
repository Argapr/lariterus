import type { CharacterCfg } from '../types';

// price 0 = gratis
export const CHARACTERS: CharacterCfg[] = [
  // Model .glb ber-rig (Quaternius, CC0) — animasi asli, bukan prosedural
  { id: 'rio', name: 'Rio', desc: 'Penembak pemberani', kind: 'human', swatch: '#f7a51d', price: 0,
    model: '/models/characters/gunner.glb' },
  { id: 'arka', name: 'Arka', desc: 'Ksatria pedang', kind: 'human', swatch: '#8a8f99', price: 0,
    model: '/models/characters/knight.glb' },
  // Karakter prosedural lama (bola & kapsul)
  { id: 'toni', name: 'Toni', desc: 'Jagoan ceria', kind: 'human', swatch: '#e84040', price: 0,
    skin: 0xf2c197, shirt: 0xf7d94c, pants: 0x3a5bd9, cap: 0xe84040, hair: 0x4a2f1d, shoe: 0xc9372c, girl: false },
  { id: 'sinta', name: 'Sinta', desc: 'Si lincah', kind: 'human', swatch: '#ff5fa2', price: 0,
    skin: 0xf7d3ae, shirt: 0xff5fa2, pants: 0x35355c, cap: null, hair: 0x5c3a1e, shoe: 0xffffff, girl: true },
  { id: 'komo', name: 'Komo', desc: 'Dino sahabat', kind: 'dino', swatch: '#4fae4f', price: 0,
    body: 0x4fae4f, belly: 0xd6eeb2, spike: 0xe0653a, shoe: 0xf2f2f2 },
  { id: 'bayu', name: 'Bayu', desc: 'Ninja bayangan', kind: 'human', swatch: '#3a3a55', price: 300,
    skin: 0xf2c197, shirt: 0x32324a, pants: 0x26263a, cap: null, hair: 0x32324a, shoe: 0x26263a, girl: false, headband: 0xe33030 },
  { id: 'zara', name: 'Zara', desc: 'Astronot muda', kind: 'human', swatch: '#f0f0f5', price: 500,
    skin: 0xe8b58c, shirt: 0xf0f0f5, pants: 0xd8d8e0, cap: null, hair: 0x3a2a1a, shoe: 0xe07a30, girl: true, helmet: true },
  { id: 'kiko', name: 'Kiko', desc: 'Kucing oranye', kind: 'human', swatch: '#f09040', price: 800,
    skin: 0xf09040, shirt: 0xf09040, pants: 0xf09040, cap: null, hair: 0xf09040, shoe: 0xffffff, girl: false, cat: true },
];

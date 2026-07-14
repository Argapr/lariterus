import type { PetCfg, TrailCfg, CollectionItem } from '../types';

export const PETS: PetCfg[] = [
  { id: 'nopet', name: 'Tanpa Pet', desc: 'Lari sendirian', price: 0, kind: 'pet', swatch: '#666' },
  { id: 'cici', name: 'Cici', desc: 'Pet · Burung kuning', price: 500, kind: 'pet', swatch: '#f7d94c' },
  { id: 'kunang', name: 'Kunang', desc: 'Pet · Kunang-kunang', price: 700, kind: 'pet', swatch: '#b8ff5c' },
  { id: 'dodo', name: 'Dodo', desc: 'Pet · Naga mini', price: 1200, kind: 'pet', swatch: '#5cd98a' },
];

export const TRAILS: TrailCfg[] = [
  { id: 'notrail', name: 'Tanpa Trail', desc: 'Jejak polos', price: 0, kind: 'trail', swatch: '#666', colors: null },
  { id: 'api', name: 'Api', desc: 'Trail · Jejak membara', price: 500, kind: 'trail', swatch: '#ff7a30', colors: [0xff8c30, 0xff5030, 0xffc040] },
  { id: 'bintang', name: 'Bintang', desc: 'Trail · Kelip bintang', price: 700, kind: 'trail', swatch: '#fff0a0', colors: [0xfff0a0, 0xffffff, 0xffd34d] },
  { id: 'pelangi', name: 'Pelangi', desc: 'Trail · Warna-warni', price: 900, kind: 'trail', swatch: '#c060ff', colors: 'rainbow' },
];

export const KOLEKSI: CollectionItem[] = [...PETS, ...TRAILS];

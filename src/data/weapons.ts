import type { Weapon, BattleBoost } from '../types';
import { store } from '../core/store';

// price 0 = gratis; upgrade menaikkan damage
export const WEAPONS: Weapon[] = [
  { id: 'blaster', name: 'Blaster', desc: 'Senjata dasar — tembakan lurus', icon: '🔫', price: 0,
    damage: 9, fireRate: 2.6, projSpeed: 28, projColor: 0xffe066, pellets: 1, spread: 0 },
  { id: 'spread', name: 'Penyebar', desc: 'Tiga peluru menyebar', icon: '🔱', price: 800,
    damage: 6, fireRate: 1.9, projSpeed: 25, projColor: 0x7ee0ff, pellets: 3, spread: 0.26 },
  { id: 'rapid', name: 'Rentetan', desc: 'Tembakan cepat tanpa henti', icon: '⚡', price: 1400,
    damage: 4, fireRate: 8, projSpeed: 32, projColor: 0xffa64d, pellets: 1, spread: 0.06 },
  { id: 'cannon', name: 'Meriam', desc: 'Lambat tapi damage besar', icon: '💥', price: 2200,
    damage: 34, fireRate: 0.95, projSpeed: 22, projColor: 0xff5a5a, pellets: 1, spread: 0 },
];

export function weaponDamage(w: Weapon): number {
  const lvl = store.weaponUpgrades[w.id] || 1;
  return w.damage * (1 + 0.2 * (lvl - 1)); // +20% damage per level
}

// Boost sekali-pakai sebelum bos (dibeli pakai koin run saat itu)
export const BATTLE_BOOSTS: BattleBoost[] = [
  { id: 'heart', icon: '❤️', name: '+2 Nyawa', desc: 'Mulai tempur dengan 2 nyawa ekstra', cost: 150 },
  { id: 'power', icon: '💪', name: 'Damage ×1.5', desc: 'Serangan lebih kuat sepanjang tempur', cost: 220 },
  { id: 'shield', icon: '🛡️', name: 'Perisai', desc: 'Tahan 3 serangan bos pertama', cost: 180 },
];

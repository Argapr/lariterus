import type { LoginReward, WheelPrize, Achievement, MissionDef } from '../types';
import { POWER_DURATION } from '../core/constants';
import { store } from '../core/store';

export function powerDuration(type: string): number {
  return POWER_DURATION[type] * (1 + 0.25 * ((store.pupgrades[type] || 1) - 1));
}

// Hadiah login harian (siklus 7 hari)
export const LOGIN_REWARDS: LoginReward[] = [
  { coins: 50 }, { coins: 75 }, { coins: 100 }, { coins: 150 },
  { coins: 200 }, { coins: 300 }, { coins: 500, chest: true },
];

// Roda hadiah (8 segmen, searah jarum jam dari atas)
export const WHEEL_PRIZES: WheelPrize[] = [
  { label: '🪙100', coins: 100 },
  { label: '🧲', voucher: 'magnet' },
  { label: '🪙50', coins: 50 },
  { label: '🛡️', voucher: 'shield' },
  { label: '🪙200', coins: 200 },
  { label: '🚀', voucher: 'rocket' },
  { label: '🪙75', coins: 75 },
  { label: '💰500', coins: 500, jackpot: true },
];
export const WHEEL_EXTRA_COST = 150;

// Prestasi permanen (3 tingkat, hadiah otomatis)
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'dist', icon: '🏃', name: 'Pelari Sejati', stat: 'dist', tiers: [1000, 10000, 50000], reward: [100, 300, 1000], fmt: v => v >= 1000 ? (v / 1000) + ' km' : v + ' m' },
  { id: 'coins', icon: '🪙', name: 'Kolektor Koin', stat: 'coins', tiers: [500, 5000, 20000], reward: [100, 300, 1000], fmt: v => v + ' koin' },
  { id: 'runs', icon: '💀', name: 'Pantang Menyerah', stat: 'runs', tiers: [10, 100, 500], reward: [50, 200, 800], fmt: v => v + ' kali main' },
  { id: 'power', icon: '⚡', name: 'Power Ranger', stat: 'powerups', tiers: [10, 100, 300], reward: [50, 200, 600], fmt: v => v + ' power-up' },
  { id: 'streak', icon: '📅', name: 'Setia Hadir', stat: 'streak', tiers: [3, 7, 30], reward: [100, 300, 1500], fmt: v => v + ' hari beruntun' },
  { id: 'level', icon: '⭐', name: 'Naik Daun', stat: 'level', tiers: [5, 10, 20], reward: [150, 400, 1200], fmt: v => 'level ' + v },
];

export const MISSION_POOL: MissionDef[] = [
  { stat: 'coins', kind: 'max', vals: [30, 50, 80], reward: [60, 100, 150], text: v => `Kumpulkan ${v} koin dalam satu lari` },
  { stat: 'dist', kind: 'max', vals: [300, 500, 800], reward: [60, 100, 150], text: v => `Berlari ${v} m dalam satu lari` },
  { stat: 'coins', kind: 'sum', vals: [100, 180], reward: [80, 140], text: v => `Kumpulkan total ${v} koin hari ini` },
  { stat: 'runs', kind: 'sum', vals: [3, 5], reward: [70, 120], text: v => `Main ${v} kali hari ini` },
  { stat: 'powerups', kind: 'sum', vals: [4, 7], reward: [80, 140], text: v => `Ambil ${v} power-up hari ini` },
];

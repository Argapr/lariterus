// ============================================================
// Konstanta gameplay
// ============================================================
import type { PowerInfo } from '../types';

export const LANES = [-2.2, 0, 2.2];
export const ROAD_WIDTH = 7.4;
export const SPAWN_Z = -115;
export const DESPAWN_Z = 14;
export const GRAVITY = -26;
export const JUMP_VY = 9.2;
export const SLIDE_TIME = 0.72;
export const BASE_SPEED = 11;
export const MAX_SPEED = 30;

export const POWER_DURATION: Record<string, number> = { magnet: 8, shield: 15, rocket: 8 };
export const POWER_INFO: Record<string, PowerInfo> = {
  magnet: { icon: '🧲', name: 'Magnet' },
  shield: { icon: '🛡️', name: 'Shield' },
  rocket: { icon: '🚀', name: 'Roket' },
};

// Revive: biaya menggandakan tiap kali dalam satu lari (maks 3x)
export const REVIVE_BASE = 200;
export const REVIVE_MAX = 3;
export const REVIVE_SECONDS = 5;
export const REVIVE_INVULN = 2.2;

// Multiplier: naik tiap ambang jarak
export const MULT_STEPS = [0, 250, 550, 950, 1500];

// Event lintasan
export const EVENT_GAP = [700, 1100];
export const EVENT_DURATION = 12;

// Upgrade power-up
export const UPGRADE_MAX = 5;
export const upgradeCost = (lvl: number) => 200 * lvl;

// Upgrade senjata
export const WEAPON_UPGRADE_MAX = 5;
export const weaponUpgradeCost = (lvl: number) => 300 * lvl;

export const randRange = (a: number, b: number) => a + Math.random() * (b - a);

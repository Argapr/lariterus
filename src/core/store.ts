// ============================================================
// Penyimpanan (localStorage)
// ============================================================
import type { MissionState, BoardEntry, LoginState } from '../types';

const jsonGet = <T>(k: string, def: T): T => {
  try { return (JSON.parse(localStorage.getItem(k) || 'null') as T) ?? def; } catch { return def; }
};

export const store = {
  get best() { return +(localStorage.getItem('er_best') || 0); },
  set best(v: number) { localStorage.setItem('er_best', String(v)); },
  get charId() { return localStorage.getItem('er_char') || 'toni'; },
  set charId(v: string) { localStorage.setItem('er_char', v); },
  get themeId() { return localStorage.getItem('er_theme') || 'kota'; },
  set themeId(v: string) { localStorage.setItem('er_theme', v); },
  get coinsTotal() { return +(localStorage.getItem('er_coins_total') || 0); },
  set coinsTotal(v: number) { localStorage.setItem('er_coins_total', String(v)); },
  get ownedChars() { return jsonGet<string[]>('er_owned_chars', ['toni', 'sinta', 'komo']); },
  set ownedChars(v: string[]) { localStorage.setItem('er_owned_chars', JSON.stringify(v)); },
  get ownedThemes() { return jsonGet<string[]>('er_owned_themes', ['kota', 'gurun', 'neon']); },
  set ownedThemes(v: string[]) { localStorage.setItem('er_owned_themes', JSON.stringify(v)); },
  get missions() { return jsonGet<MissionState | null>('er_missions', null); },
  set missions(v: MissionState | null) { localStorage.setItem('er_missions', JSON.stringify(v)); },
  get board() { return jsonGet<BoardEntry[]>('er_board', []); },
  set board(v: BoardEntry[]) { localStorage.setItem('er_board', JSON.stringify(v)); },
  get xp() { return +(localStorage.getItem('er_xp') || 0); },
  set xp(v: number) { localStorage.setItem('er_xp', String(v)); },
  get login() { return jsonGet<LoginState>('er_login', { last: null, streak: 0 }); },
  set login(v: LoginState) { localStorage.setItem('er_login', JSON.stringify(v)); },
  get wheelLast() { return localStorage.getItem('er_wheel_last') || ''; },
  set wheelLast(v: string) { localStorage.setItem('er_wheel_last', v); },
  get vouchers() { return jsonGet<Record<string, number>>('er_vouchers', { magnet: 0, shield: 0, rocket: 0 }); },
  set vouchers(v: Record<string, number>) { localStorage.setItem('er_vouchers', JSON.stringify(v)); },
  get pupgrades() { return jsonGet<Record<string, number>>('er_pupgrades', { magnet: 1, shield: 1, rocket: 1 }); },
  set pupgrades(v: Record<string, number>) { localStorage.setItem('er_pupgrades', JSON.stringify(v)); },
  get stats() { return jsonGet<Record<string, number>>('er_stats', { dist: 0, coins: 0, runs: 0, powerups: 0 }); },
  set stats(v: Record<string, number>) { localStorage.setItem('er_stats', JSON.stringify(v)); },
  get ach() { return jsonGet<Record<string, number>>('er_ach', {}); },
  set ach(v: Record<string, number>) { localStorage.setItem('er_ach', JSON.stringify(v)); },
  get chests() { return +(localStorage.getItem('er_chests') || 0); },
  set chests(v: number) { localStorage.setItem('er_chests', String(v)); },
  get petId() { return localStorage.getItem('er_pet') || 'nopet'; },
  set petId(v: string) { localStorage.setItem('er_pet', v); },
  get trailId() { return localStorage.getItem('er_trail') || 'notrail'; },
  set trailId(v: string) { localStorage.setItem('er_trail', v); },
  get ownedPets() { return jsonGet<string[]>('er_owned_pets', ['nopet']); },
  set ownedPets(v: string[]) { localStorage.setItem('er_owned_pets', JSON.stringify(v)); },
  get ownedTrails() { return jsonGet<string[]>('er_owned_trails', ['notrail']); },
  set ownedTrails(v: string[]) { localStorage.setItem('er_owned_trails', JSON.stringify(v)); },
  // Mode Petualangan
  get ownedWeapons() { return jsonGet<string[]>('er_owned_weapons', ['blaster']); },
  set ownedWeapons(v: string[]) { localStorage.setItem('er_owned_weapons', JSON.stringify(v)); },
  get weaponUpgrades() { return jsonGet<Record<string, number>>('er_weapon_upg', { blaster: 1 }); },
  set weaponUpgrades(v: Record<string, number>) { localStorage.setItem('er_weapon_upg', JSON.stringify(v)); },
  get equippedWeapon() { return localStorage.getItem('er_equipped_weapon') || 'blaster'; },
  set equippedWeapon(v: string) { localStorage.setItem('er_equipped_weapon', v); },
  get clearedStages() { return jsonGet<string[]>('er_cleared_stages', []); },
  set clearedStages(v: string[]) { localStorage.setItem('er_cleared_stages', JSON.stringify(v)); },
};

// Migrasi sekali: pemain lama di default 'toni' dipindah ke karakter model 'rio'.
// Harus di sini (bukan main.ts) supaya jalan SEBELUM menuState menghitung index karakter.
if (store.charId === 'toni' && !localStorage.getItem('er_char_v2')) store.charId = 'rio';
localStorage.setItem('er_char_v2', '1');

// XP → level (dipakai lintas modul)
export function levelInfo() {
  const xp = store.xp;
  const lvl = Math.floor(Math.sqrt(xp / 500)) + 1;
  const start = 500 * (lvl - 1) * (lvl - 1);
  const next = 500 * lvl * lvl;
  return { lvl, pct: Math.min(100, ((xp - start) / (next - start)) * 100) };
}

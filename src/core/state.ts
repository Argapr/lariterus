// ============================================================
// Keadaan runtime bersama (mutable singletons)
// ============================================================
import * as THREE from 'three';
import { BASE_SPEED } from './constants';
import { store } from './store';
import { CHARACTERS } from '../data/characters';
import { THEMES } from '../data/themes';
import type { GameState, World } from '../types';

export const game: GameState = {
  state: 'menu',
  charMesh: null as unknown as THREE.Group, // diisi setCharacter() saat bootstrap
  lane: 1, laneX: 0,
  y: 0, vy: 0,
  sliding: 0,
  runPhase: 0,
  speed: BASE_SPEED,
  distance: 0,
  nextSpawn: 30,
  nextDeco: 7,
  coins: 0,
  score: 0,
  scoreAcc: 0,
  time: 0,
  shake: 0,
  power: { magnet: 0, shield: 0, rocket: 0 },
  runPowerups: 0,
  revives: 0,
  invuln: 0,
  reviveTimer: 0,
  mult: 1,
  nearMiss: 0,
  event: null,
  nextEvent: 0,
  chaser: null,
  mode: 'endless',
  stageIdx: 0,
  stageGoal: 0,
  battleBoost: null,
  boss: null,
};

export const world: World = {
  group: new THREE.Group(),
  roadSegs: [],
  decos: [],
  obstacles: [],
  coins: [],
  powerups: [],
  clouds: [],
  themeAssets: null,
  scenery: new THREE.Group(),
  snow: null,
};

export const menuState = {
  tab: 'karakter' as string,          // 'karakter' | 'tema' | 'koleksi'
  charIdx: Math.max(0, CHARACTERS.findIndex(c => c.id === store.charId)),
  themeIdx: Math.max(0, THEMES.findIndex(t => t.id === store.themeId)),
  kolIdx: 0,
  buyArmed: false,
  stagePick: 0,
  arsenalReturn: 'map' as 'map' | 'stage',
  charSelect: false, // halaman pilih karakter terbuka (kamera geser karakter ke kanan)
  collectionSelect: false, // halaman koleksi (pet/jejak) terbuka
  colTab: 'pet' as 'pet' | 'trail', // sub-tab di halaman koleksi
  spin: 0, // sudut putar pratinjau (digeser untuk memutar karakter)
};

export function clearList(list: { mesh?: THREE.Object3D }[] | THREE.Object3D[]) {
  for (const o of list as any[]) world.group.remove(o.mesh || o);
  (list as any[]).length = 0;
}

// ============================================================
// Tipe bersama untuk seluruh game
// ============================================================
import type * as THREE from 'three';

// ---------- Data toko / koleksi ----------
export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export interface CharacterCfg extends ShopItem {
  kind: 'human' | 'dino';
  swatch: string;
  // Manusia
  skin?: number; shirt?: number; pants?: number; cap?: number | null;
  hair?: number; shoe?: number; girl?: boolean;
  headband?: number; helmet?: boolean; cat?: boolean;
  // Dino
  body?: number; belly?: number; spike?: number;
}

export interface ThemeCfg extends ShopItem {
  swatch: string;
  skyTop: string; skyBot: string;
  fog: number; fogNear: number; fogFar: number;
  hemi: [number, number, number];
  sun: [number, number];
  sunPos: [number, number, number];
}

export interface PetCfg extends ShopItem {
  kind: 'pet';
  swatch: string;
}
export interface TrailCfg extends ShopItem {
  kind: 'trail';
  swatch: string;
  colors: number[] | 'rainbow' | null;
}
export type CollectionItem = PetCfg | TrailCfg;

// ---------- Mode Petualangan ----------
export interface Weapon extends Omit<ShopItem, 'desc'> {
  desc: string;
  icon: string;
  damage: number;
  fireRate: number;
  projSpeed: number;
  projColor: number;
  pellets: number;
  spread: number;
}

export interface BattleBoost {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;
}

export interface BossCfg {
  name: string;
  hp: number;
  color: number;
  accent: number;
  horns: number;
}

export interface Stage {
  id: string;
  name: string;
  theme: string;
  distance: number;
  boss: BossCfg;
}

// ---------- Progresi & hadiah ----------
export interface LoginReward { coins: number; chest?: boolean; }
export interface WheelPrize { label: string; coins?: number; voucher?: string; jackpot?: boolean; }
export interface Achievement {
  id: string; icon: string; name: string; stat: string;
  tiers: number[]; reward: number[]; fmt: (v: number) => string;
}
export interface MissionDef {
  stat: string; kind: 'max' | 'sum'; vals: number[]; reward: number[];
  text: (v: number) => string;
}
export interface PowerInfo { icon: string; name: string; }

// ---------- Keadaan runtime ----------
export type PowerType = 'magnet' | 'shield' | 'rocket';

export interface GameEvent {
  type: string;
  timeLeft: number;
  narrowLane: number;
}

export interface Projectile {
  mesh: THREE.Mesh;
  vx: number;
  vz: number;
  life: number;
  dmg?: number;
}
export interface Telegraph {
  mesh: THREE.Mesh;
  x: number; z: number; r: number;
  t: number; max: number;
}

export interface BossState {
  cfg: BossCfg;
  mesh: THREE.Group;
  baseY: number;
  hp: number; hpMax: number;
  stage: number; diff: number;
  px: number; pz: number; bossX: number; bossZ: number;
  weapon: Weapon;
  dmgMult: number; shieldHits: number;
  playerHP: number; playerHPMax: number;
  invuln: number; fireTimer: number; attackTimer: number;
  shots: Projectile[]; bshots: Projectile[]; telegraphs: Telegraph[];
  runPhase: number; flash: number;
  joy: { x: number; y: number } | null;
  // Gerak mulus & kelincahan
  targetX: number; targetZ: number;
  velX: number; velZ: number;
  dashTime: number; dashCd: number; dashDX: number; dashDZ: number;
  faceAng: number;
  // Serangan bos & fase
  windup: number; pendingAttack: string | null;
  bossVY: number; bossLunge: number;
  enraged: boolean; hitStop: number;
  dead: boolean; deadT: number;
}

export type GameStateName =
  | 'menu' | 'playing' | 'paused' | 'revive' | 'gameover'
  | 'preboss' | 'boss' | 'victory' | 'defeat';

export interface GameState {
  state: GameStateName;
  charMesh: THREE.Group;
  lane: number; laneX: number;
  y: number; vy: number;
  sliding: number; runPhase: number;
  speed: number; distance: number;
  nextSpawn: number; nextDeco: number;
  coins: number; score: number; scoreAcc: number;
  time: number; shake: number;
  power: Record<string, number>;
  runPowerups: number;
  revives: number; invuln: number; reviveTimer: number;
  mult: number; nearMiss: number;
  event: GameEvent | null; nextEvent: number;
  chaser: THREE.Group | null;
  mode: 'endless' | 'adventure';
  stageIdx: number; stageGoal: number;
  battleBoost: string | null;
  boss: BossState | null;
}

export interface World {
  group: THREE.Group;
  roadSegs: THREE.Mesh[];
  decos: WorldItem[];
  obstacles: Obstacle[];
  coins: CoinItem[];
  powerups: PowerupItem[];
  clouds: THREE.Group[];
  themeAssets: ThemeAssets | null;
  scenery: THREE.Group;
  snow?: THREE.Points | null;
}

export interface WorldItem { mesh: THREE.Object3D; }
export interface Obstacle {
  mesh: THREE.Object3D;
  type: string;
  lane: number;
  z: number;
  passed?: boolean;
}
export interface CoinItem { mesh: THREE.Object3D; lane: number; }
export interface PowerupItem { mesh: THREE.Object3D; type: string; lane: number; bob: number; }

export interface ThemeAssets {
  geoms: Record<string, THREE.BufferGeometry>;
  mats: Record<string, THREE.Material>;
  id: string;
}

export interface MissionState {
  date: string;
  list: { pi: number; vi: number; progress: number; done: boolean }[];
  chestGiven?: boolean;
}
export interface BoardEntry { s: number; d: number; c: string; t: string; }
export interface LoginState { last: string | null; streak: number; }

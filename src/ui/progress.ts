// ============================================================
// Misi harian, papan peringkat, prestasi, profil
// ============================================================
import { store, levelInfo } from '../core/store';
import { AudioFX } from '../core/audio';
import { POWER_INFO, UPGRADE_MAX, upgradeCost } from '../core/constants';
import { MISSION_POOL, ACHIEVEMENTS, powerDuration } from '../data/progression';
import { CHARACTERS } from '../data/characters';
import { todayKey, hashStr } from '../core/util';
import { $ } from './dom';
import { toast } from './dom';
import { refreshMenu } from './menu';
import type { MissionState, BoardEntry } from '../types';

// ---------- Misi harian ----------
export function getMissions(): MissionState {
  const t = todayKey();
  let data = store.missions;
  if (!data || data.date !== t) {
    const h = hashStr(t);
    const idxs: number[] = [];
    let i = 0;
    while (idxs.length < 3 && i < 30) {
      const cand = (h >> i) % MISSION_POOL.length;
      if (!idxs.includes(cand)) idxs.push(cand);
      i++;
    }
    for (let j = 0; idxs.length < 3; j++) if (!idxs.includes(j)) idxs.push(j);
    data = {
      date: t,
      list: idxs.map((pi, k) => ({ pi, vi: (h >> (k * 4)) % MISSION_POOL[pi].vals.length, progress: 0, done: false })),
    };
    store.missions = data;
  }
  return data;
}

export function applyRunToMissions(stats: Record<string, number>) {
  const data = getMissions();
  let changed = false;
  for (const m of data.list) {
    if (m.done) continue;
    const pool = MISSION_POOL[m.pi];
    const v = stats[pool.stat] || 0;
    m.progress = pool.kind === 'max' ? Math.max(m.progress, v) : m.progress + v;
    if (m.progress >= pool.vals[m.vi]) {
      m.done = true;
      const reward = pool.reward[m.vi];
      store.coinsTotal += reward;
      toast(`🎯 Misi selesai! +${reward} 🪙`);
    }
    changed = true;
  }
  if (data.list.every(m => m.done) && !data.chestGiven) {
    data.chestGiven = true;
    store.chests++;
    toast('📦 Semua misi tuntas — dapat peti misterius!');
    changed = true;
  }
  if (changed) store.missions = data;
}

export function renderMissions() {
  const data = getMissions();
  const missionsHtml = data.list.map(m => {
    const pool = MISSION_POOL[m.pi];
    const target = pool.vals[m.vi];
    const pct = Math.min(100, (m.progress / target) * 100);
    return `<div class="mission-item${m.done ? ' done' : ''}">
      <div class="mission-text"><span>${m.done ? '✅ ' : ''}${pool.text(target)}</span>
        <span class="mission-reward">+${pool.reward[m.vi]} 🪙</span></div>
      <div class="mission-progress"><div style="width:${pct}%"></div></div>
      <div class="mission-sub">${Math.min(Math.floor(m.progress), target)} / ${target}</div>
    </div>`;
  }).join('');

  const vals = achValues();
  const claimed = store.ach;
  const achHtml = ACHIEVEMENTS.map(a => {
    const tier = claimed[a.id] || 0;
    const doneAll = tier >= a.tiers.length;
    const target = doneAll ? a.tiers[a.tiers.length - 1] : a.tiers[tier];
    const pct = Math.min(100, (vals[a.stat] / target) * 100);
    const medals = a.tiers.map((_, i) => i < tier ? ['🥉', '🥈', '🥇'][i] : '·').join(' ');
    return `<div class="mission-item${doneAll ? ' done' : ''}">
      <div class="mission-text"><span>${a.icon} ${a.name}</span>
        <span class="ach-tiers">${medals}</span></div>
      <div class="mission-progress"><div style="width:${pct}%"></div></div>
      <div class="mission-sub">${doneAll ? 'Tuntas! ' + a.fmt(target) : `Berikutnya: ${a.fmt(target)} (+${a.reward[tier]} 🪙)`}</div>
    </div>`;
  }).join('');

  $('mission-list').innerHTML = missionsHtml + '<div class="list-divider">🏆 Prestasi</div>' + achHtml;
}

// ---------- Papan peringkat ----------
export function saveToBoard(entry: BoardEntry) {
  const board = store.board;
  board.push(entry);
  board.sort((a, b) => b.s - a.s);
  store.board = board.slice(0, 10);
}

export function renderBoard() {
  const board = store.board;
  const medals = ['🥇', '🥈', '🥉'];
  $('board-list').innerHTML = board.length === 0
    ? '<div class="board-empty">Belum ada skor — ayo main dulu!</div>'
    : board.map((e, i) => {
      const ch = CHARACTERS.find(c => c.id === e.c);
      return `<div class="board-item">
        <div class="board-rank">${medals[i] || i + 1}</div>
        <div><div>${ch ? ch.name : '?'}</div>
          <div class="board-meta">${e.d} m · ${e.t}</div></div>
        <div class="board-score">${e.s}</div>
      </div>`;
    }).join('');
}

// ---------- Prestasi permanen ----------
export function achValues(): Record<string, number> {
  const s = store.stats;
  return { dist: s.dist, coins: s.coins, runs: s.runs, powerups: s.powerups, streak: store.login.streak, level: levelInfo().lvl };
}

export function checkAchievements() {
  const vals = achValues();
  const claimed = store.ach;
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    let tier = claimed[a.id] || 0;
    while (tier < a.tiers.length && vals[a.stat] >= a.tiers[tier]) {
      store.coinsTotal += a.reward[tier];
      toast(`${a.icon} Prestasi: ${a.name} (${a.fmt(a.tiers[tier])}) +${a.reward[tier]} 🪙`);
      tier++;
      changed = true;
    }
    claimed[a.id] = tier;
  }
  if (changed) { store.ach = claimed; AudioFX.powerup(); }
  else store.ach = claimed;
}

// ---------- Profil: statistik & upgrade power-up ----------
export function renderProfile() {
  const s = store.stats;
  const li = levelInfo();
  const cards: [string, string | number][] = [
    ['Total Jarak', s.dist >= 1000 ? (s.dist / 1000).toFixed(1) + ' km' : s.dist + ' m'],
    ['Total Koin', s.coins.toLocaleString('id-ID')],
    ['Total Main', s.runs + '×'],
    ['Power-up', s.powerups + '×'],
    ['Level', li.lvl],
    ['Streak', '🔥 ' + store.login.streak + ' hari'],
  ];
  $('stats-grid').innerHTML = cards.map(([l, v]) =>
    `<div class="stat-card"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');

  const up = store.pupgrades;
  $('upgrade-list').innerHTML = Object.keys(POWER_INFO).map(k => {
    const lvl = up[k];
    const maxed = lvl >= UPGRADE_MAX;
    const pips = Array.from({ length: UPGRADE_MAX }, (_, i) => `<span class="pip${i < lvl ? ' on' : ''}"></span>`).join('');
    return `<div class="upgrade-row">
      <div class="upgrade-ico">${POWER_INFO[k].icon}</div>
      <div class="upgrade-info">
        <div class="upgrade-name">${POWER_INFO[k].name}</div>
        <div class="upgrade-lvl">Durasi ${powerDuration(k).toFixed(1)} dtk</div>
        <div class="upgrade-pips">${pips}</div>
      </div>
      <button class="btn-upgrade" data-up="${k}" ${maxed ? 'disabled' : ''}>
        ${maxed ? 'MAX' : `🪙 ${upgradeCost(lvl)}`}
      </button>
    </div>`;
  }).join('');
  $('upgrade-list').querySelectorAll<HTMLElement>('.btn-upgrade').forEach(b =>
    b.addEventListener('click', () => buyUpgrade(b.dataset.up!)));
}

export function buyUpgrade(type: string) {
  const up = store.pupgrades;
  const lvl = up[type];
  if (lvl >= UPGRADE_MAX) return;
  const cost = upgradeCost(lvl);
  if (store.coinsTotal < cost) { toast(`Koin kurang! Butuh 🪙 ${cost}`); return; }
  store.coinsTotal -= cost;
  up[type]++;
  store.pupgrades = up;
  AudioFX.powerup();
  toast(`⚡ ${POWER_INFO[type].name} level ${up[type]} — durasi ${powerDuration(type).toFixed(1)} dtk!`);
  renderProfile();
  refreshMenu();
}

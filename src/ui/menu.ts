// ============================================================
// Menu utama: carousel karakter/tema/koleksi, tab, beli
// ============================================================
import { game, menuState } from '../core/state';
import { store, levelInfo } from '../core/store';
import { AudioFX } from '../core/audio';
import { CHARACTERS } from '../data/characters';
import { THEMES } from '../data/themes';
import { KOLEKSI } from '../data/collections';
import { todayKey } from '../core/util';
import { buildTheme, setStudioMode } from '../gfx/world';
import { applyPet } from '../gfx/petMesh';
import { trailFX } from '../gfx/trail';
import { setCharacter } from '../systems/player';
import { $, showScreen, toast } from './dom';
import { dailyInfo } from './rewards';
import { renderMissions, renderBoard } from './progress';
import type { ShopItem } from '../types';

interface CarouselRef { list: ShopItem[]; idx: number; ownedKey: string; }

export function tryBuy(item: ShopItem, ownedKey: string): boolean {
  if (store.coinsTotal < item.price) {
    toast(`Koin kurang! Butuh 🪙 ${item.price}, punyamu 🪙 ${store.coinsTotal}`);
    return false;
  }
  store.coinsTotal -= item.price;
  (store as any)[ownedKey] = [...(store as any)[ownedKey], item.id];
  AudioFX.powerup();
  toast(`🎉 ${item.name} terbuka!`);
  return true;
}

export function carouselItem(): CarouselRef {
  if (menuState.tab === 'tema') return { list: THEMES, idx: menuState.themeIdx, ownedKey: 'ownedThemes' };
  if (menuState.tab === 'koleksi') {
    const it = KOLEKSI[menuState.kolIdx];
    return { list: KOLEKSI, idx: menuState.kolIdx, ownedKey: it.kind === 'pet' ? 'ownedPets' : 'ownedTrails' };
  }
  return { list: CHARACTERS, idx: menuState.charIdx, ownedKey: 'ownedChars' };
}

export function refreshMenu() {
  const { list, idx, ownedKey } = carouselItem();
  const it = list[idx];
  const ownedIds: string[] = (store as any)[ownedKey];
  const owned = it.price === 0 || ownedIds.includes(it.id);
  menuState.buyArmed = false;

  // Tab karakter: pemilihan pindah ke halaman sendiri → panah & titik disembunyikan
  const isCharTab = menuState.tab === 'karakter';
  $('car-prev').classList.toggle('hidden', isCharTab);
  $('car-next').classList.toggle('hidden', isCharTab);
  $('car-dots').classList.toggle('hidden', isCharTab);

  $('car-name').textContent = it.name.toUpperCase();
  $('car-desc').textContent = owned ? it.desc : `${it.desc} · 🔒 terkunci`;
  $('car-dots').innerHTML = list.map((x, i) => {
    const xOwned = x.price === 0 || ownedIds.includes(x.id);
    return `<span class="dot${i === idx ? ' on' : ''}${xOwned ? '' : ' locked-dot'}" data-i="${i}"></span>`;
  }).join('');
  $('car-dots').querySelectorAll<HTMLElement>('.dot').forEach(d =>
    d.addEventListener('click', () => carouselGo(+d.dataset.i!)));

  // Pratinjau 3D langsung + pilih otomatis jika sudah dimiliki.
  // Tab karakter & koleksi pakai latar studio bersih; tab tema pamerkan dunianya.
  setStudioMode(menuState.tab !== 'tema');
  if (menuState.tab === 'tema') {
    trailFX.previewId = null;
    applyPet();
    buildTheme(it as any);
    if (owned) store.themeId = it.id;
  } else if (menuState.tab === 'koleksi') {
    const kit = KOLEKSI[idx];
    if (kit.kind === 'pet') {
      applyPet(it.id);
      trailFX.previewId = null;
      if (owned) { store.petId = it.id; }
    } else {
      applyPet();
      trailFX.previewId = it.id;
      if (owned) { store.trailId = it.id; }
    }
  } else {
    trailFX.previewId = null;
    applyPet();
    setCharacter(it as any);
    if (owned) store.charId = it.id;
  }

  const play = $('btn-play');
  play.classList.toggle('buy', !owned);
  play.innerHTML = owned ? '▷&nbsp; MAIN' : `🔒&nbsp; BELI — 🪙 ${it.price}`;

  $('menu-coins-val').textContent = store.coinsTotal.toLocaleString('id-ID');
  $('menu-best').textContent = `🏆 SKOR TERBAIK: ${store.best}`;
  $('side-best').textContent = store.best.toLocaleString('id-ID');
  const li = levelInfo();
  $('side-level').textContent = String(li.lvl);
  $('level-fill').style.width = li.pct + '%';

  $('daily-dot').classList.toggle('hidden', dailyInfo().claimedToday);
  $('wheel-dot').classList.toggle('hidden', store.wheelLast === todayKey());
}

export function carouselGo(i: number) {
  if (menuState.tab === 'karakter') return; // karakter dipilih lewat halamannya sendiri
  AudioFX.click();
  const { list } = carouselItem();
  const idx = ((i % list.length) + list.length) % list.length;
  if (menuState.tab === 'tema') menuState.themeIdx = idx;
  else if (menuState.tab === 'koleksi') menuState.kolIdx = idx;
  else menuState.charIdx = idx;
  refreshMenu();
}
export const carouselMove = (dir: number) => carouselGo(carouselItem().idx + dir);

export function setTab(tab: string) {
  AudioFX.click();
  if (tab === 'misi') { renderMissions(); showScreen('menu', 'missions'); return; }
  if (tab === 'peringkat') { renderBoard(); showScreen('menu', 'board'); return; }
  menuState.tab = tab;
  document.querySelectorAll<HTMLElement>('.tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  refreshMenu();
}

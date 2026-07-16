// ============================================================
// Halaman koleksi (pet & jejak) — 2 sub-tab, kartu grid, pratinjau 3D
// yang bisa diputar dengan digeser. Sejalan dengan halaman pilih karakter.
// ============================================================
import { store } from '../core/store';
import { AudioFX } from '../core/audio';
import { menuState } from '../core/state';
import { PETS, TRAILS } from '../data/collections';
import { applyPet, buildPetMesh } from '../gfx/petMesh';
import { trailFX } from '../gfx/trail';
import { setStudioMode } from '../gfx/world';
import { AnimatedCharacter } from '../gfx/animatedCharacter';
import { renderObjectPortrait, trailThumb } from '../gfx/portrait';
import { $, showScreen, toast } from './dom';
import { tryBuy, refreshMenu } from './menu';
import type { PetCfg, TrailCfg } from '../types';

const petPortraits = new Map<string, string>();
const trailThumbs = new Map<string, string>();

let selectedPet = store.petId;
let selectedTrail = store.trailId;

// ---------- data helper ----------
const petOwned = (c: PetCfg) => c.price === 0 || store.ownedPets.includes(c.id);
const trailOwned = (c: TrailCfg) => c.price === 0 || store.ownedTrails.includes(c.id);

// ---------- pratinjau 3D ----------
function previewPet(id: string) { applyPet(id); trailFX.previewId = null; }
function previewTrail(id: string) {
  applyPet(); // tampilkan pet terpasang
  trailFX.previewId = id === 'notrail' ? null : id;
}

// ---------- render sisi kanan (nama + tombol) ----------
function renderSide() {
  if (menuState.colTab === 'pet') {
    const c = PETS.find(p => p.id === selectedPet)!;
    $('col-name').textContent = c.name.toUpperCase();
    $('col-desc').textContent = c.desc;
    setConfirm(petOwned(c), store.petId === c.id, c.price);
  } else {
    const c = TRAILS.find(t => t.id === selectedTrail)!;
    $('col-name').textContent = c.name.toUpperCase();
    $('col-desc').textContent = c.desc;
    setConfirm(trailOwned(c), store.trailId === c.id, c.price);
  }
}
function setConfirm(owned: boolean, active: boolean, price: number) {
  const btn = $('btn-col-confirm');
  if (owned) {
    btn.innerHTML = active ? '✓&nbsp; DIPAKAI' : 'PAKAI';
    btn.classList.toggle('inuse', active);
  } else {
    btn.innerHTML = `🔓&nbsp; BELI — 🪙 ${price}`;
    btn.classList.remove('inuse');
  }
}

// ---------- render grid ----------
function cardHTML(id: string, name: string, owned: boolean, sel: boolean, thumb: string | undefined, price: number, swatch: string, ph: string) {
  return `<button class="char-card${owned ? '' : ' locked'}${sel ? ' sel' : ''}" data-id="${id}">
    <span class="cc-img" style="--sw:${swatch}">
      ${thumb ? `<img src="${thumb}" alt="">` : `<span class="cc-ph">${ph}</span>`}
      ${owned ? '' : '<span class="cc-lock">🔒</span>'}
    </span>
    <span class="cc-name">${name}</span>
    ${owned ? '' : `<span class="cc-price">🪙 ${price}</span>`}
  </button>`;
}

function renderGrid() {
  const isPet = menuState.colTab === 'pet';
  $('col-tab-pet').classList.toggle('on', isPet);
  $('col-tab-trail').classList.toggle('on', !isPet);

  if (isPet) {
    const owned = PETS.filter(petOwned).length;
    $('col-count').textContent = `PUNYA: ${owned}/${PETS.length}`;
    $('col-grid').innerHTML = PETS.map(c =>
      cardHTML(c.id, c.name, petOwned(c), c.id === selectedPet, petPortraits.get(c.id), c.price, c.swatch, '🐾')
    ).join('');
  } else {
    const owned = TRAILS.filter(trailOwned).length;
    $('col-count').textContent = `PUNYA: ${owned}/${TRAILS.length}`;
    $('col-grid').innerHTML = TRAILS.map(c =>
      cardHTML(c.id, c.name, trailOwned(c), c.id === selectedTrail, trailThumbs.get(c.id), c.price, c.swatch, '✨')
    ).join('');
  }
  $('col-grid').querySelectorAll<HTMLButtonElement>('.char-card').forEach(b =>
    b.addEventListener('click', () => selectItem(b.dataset.id!)));
  renderSide();
}

function selectItem(id: string) {
  AudioFX.click();
  if (menuState.colTab === 'pet') {
    if (id === selectedPet) return;
    selectedPet = id; previewPet(id);
  } else {
    if (id === selectedTrail) return;
    selectedTrail = id; previewTrail(id);
  }
  $('col-grid').querySelectorAll('.char-card').forEach(el =>
    el.classList.toggle('sel', (el as HTMLElement).dataset.id === id));
  renderSide();
}

function setColTab(tab: 'pet' | 'trail') {
  if (menuState.colTab === tab) return;
  AudioFX.click();
  menuState.colTab = tab;
  menuState.spin = 0;
  if (tab === 'pet') { selectedPet = store.petId; previewPet(selectedPet); }
  else { selectedTrail = store.trailId; previewTrail(selectedTrail); }
  renderGrid();
}

// ---------- isi thumbnail (potret pet 3D + guratan trail) ----------
async function fillThumbs() {
  for (const c of TRAILS) if (!trailThumbs.has(c.id)) trailThumbs.set(c.id, trailThumb(c.colors));
  if (menuState.colTab === 'trail') refreshGridImages('trail');

  for (const c of PETS) {
    if (petPortraits.has(c.id)) continue;
    if (c.id === 'nopet') continue; // biar placeholder 🐾
    try {
      let obj;
      let ac: AnimatedCharacter | null = null;
      if (c.model) { ac = await AnimatedCharacter.load(c.model, 1.2); ac.animRoot.rotation.y = Math.PI; obj = ac.root; }
      else obj = buildPetMesh(c.id);
      const url = renderObjectPortrait(obj, 0.05);
      petPortraits.set(c.id, url);
      ac?.dispose();
      if (menuState.colTab === 'pet') refreshGridImages('pet');
    } catch (e) { console.error('Gagal potret pet', c.id, e); }
  }
}
function refreshGridImages(which: 'pet' | 'trail') {
  if ((which === 'pet') !== (menuState.colTab === 'pet')) return;
  const map = which === 'pet' ? petPortraits : trailThumbs;
  $('col-grid').querySelectorAll<HTMLElement>('.char-card').forEach(card => {
    const id = card.dataset.id!;
    const url = map.get(id);
    const holder = card.querySelector('.cc-img')!;
    if (url && !holder.querySelector('img')) {
      const ph = holder.querySelector('.cc-ph');
      if (ph) ph.remove();
      holder.insertAdjacentHTML('afterbegin', `<img src="${url}" alt="">`);
    }
  });
}

// ---------- buka / tutup / konfirmasi ----------
export function openCollection() {
  AudioFX.click();
  menuState.collectionSelect = true;
  menuState.colTab = 'pet';
  menuState.spin = 0;
  selectedPet = store.petId;
  selectedTrail = store.trailId;
  setStudioMode(true);
  previewPet(selectedPet);
  renderGrid();
  showScreen('collection');
  void fillThumbs();
}

function closeCollection() {
  AudioFX.click();
  menuState.collectionSelect = false;
  applyPet(); // kembali ke pet terpasang
  trailFX.previewId = null;
  refreshMenu();
  showScreen('menu');
}

function confirmCollection() {
  if (menuState.colTab === 'pet') {
    const c = PETS.find(p => p.id === selectedPet)!;
    if (petOwned(c)) {
      store.petId = c.id; AudioFX.powerup(); toast(`🐾 ${c.name} menemani!`);
      closeCollection();
    } else if (tryBuy(c, 'ownedPets')) {
      store.petId = c.id; renderGrid();
    }
  } else {
    const c = TRAILS.find(t => t.id === selectedTrail)!;
    if (trailOwned(c)) {
      store.trailId = c.id; AudioFX.powerup(); toast(`✨ Jejak ${c.name} aktif!`);
      closeCollection();
    } else if (tryBuy(c, 'ownedTrails')) {
      store.trailId = c.id; renderGrid();
    }
  }
}

export function initCollectionSelect() {
  $('btn-col-close').addEventListener('click', closeCollection);
  $('btn-col-confirm').addEventListener('click', confirmCollection);
  $('col-tab-pet').addEventListener('click', () => setColTab('pet'));
  $('col-tab-trail').addEventListener('click', () => setColTab('trail'));
}

export function collectionVisible(): boolean {
  return !$('collection-screen').classList.contains('hidden');
}
export { closeCollection };

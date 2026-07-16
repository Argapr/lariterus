// ============================================================
// Halaman pilih karakter (ala layar seleksi game mobile):
// grid kartu berpotret di kiri, pratinjau 3D hidup di kanan.
// Potret dibuat sungguhan: tiap karakter di-render ke render target
// lalu dijadikan gambar PNG (di-cache, dibuat sekali).
// ============================================================
import * as THREE from 'three';
import { renderer } from '../core/three';
import { store } from '../core/store';
import { AudioFX } from '../core/audio';
import { game, menuState } from '../core/state';
import { CHARACTERS } from '../data/characters';
import { buildCharacter } from '../gfx/characterMesh';
import { AnimatedCharacter } from '../gfx/animatedCharacter';
import { setCharacter } from '../systems/player';
import { $, showScreen, toast } from './dom';
import { tryBuy, refreshMenu } from './menu';
import type { CharacterCfg } from '../types';

const PORTRAIT = 220; // ukuran piksel potret

const portraits = new Map<string, string>(); // charId → dataURL
let selectedId = store.charId;

// ---------- Studio potret kecil (scene terpisah, dipakai ulang) ----------
let pScene: THREE.Scene | null = null;
let pCam: THREE.PerspectiveCamera | null = null;
let pTarget: THREE.WebGLRenderTarget | null = null;

function ensurePortraitStudio() {
  if (pScene) return;
  pScene = new THREE.Scene();
  pScene.add(new THREE.HemisphereLight(0xffffff, 0x887766, 1.25));
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.2);
  sun.position.set(-1.6, 3.2, -3.0); // karakter menghadap -Z → cahaya dari depan
  pScene.add(sun);
  pCam = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
  pCam.position.set(0, 1.45, -2.7);
  pCam.lookAt(0, 1.02, 0);
  pTarget = new THREE.WebGLRenderTarget(PORTRAIT, PORTRAIT);
}

async function makePortrait(cfg: CharacterCfg): Promise<string> {
  const hit = portraits.get(cfg.id);
  if (hit) return hit;
  ensurePortraitStudio();

  let obj: THREE.Object3D;
  let ac: AnimatedCharacter | null = null;
  if (cfg.model) {
    ac = await AnimatedCharacter.load(cfg.model, 2.05);
    ac.animRoot.rotation.y = Math.PI; // hadapkan ke kamera potret
    ac.play('idle');
    ac.update(0.06); // ambil pose frame awal idle (bukan T-pose)
    obj = ac.root;
  } else {
    obj = buildCharacter(cfg);
  }
  pScene!.add(obj);

  // Render ke target dengan latar transparan, tanpa mengganggu frame utama
  const prevClear = new THREE.Color();
  renderer.getClearColor(prevClear);
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(pTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(pScene!, pCam!);
  const buf = new Uint8Array(PORTRAIT * PORTRAIT * 4);
  renderer.readRenderTargetPixels(pTarget!, 0, 0, PORTRAIT, PORTRAIT, buf);
  renderer.setRenderTarget(null);
  renderer.setClearColor(prevClear, prevAlpha);

  pScene!.remove(obj);
  ac?.dispose();

  // Balik baris (readPixels dari bawah) → canvas 2D → PNG
  const cv = document.createElement('canvas');
  cv.width = PORTRAIT; cv.height = PORTRAIT;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(PORTRAIT, PORTRAIT);
  for (let y = 0; y < PORTRAIT; y++) {
    const src = (PORTRAIT - 1 - y) * PORTRAIT * 4;
    img.data.set(buf.subarray(src, src + PORTRAIT * 4), y * PORTRAIT * 4);
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  portraits.set(cfg.id, url);
  return url;
}

// ---------- Render grid & panel kanan ----------
function ownedIds(): string[] { return store.ownedChars; }
function isOwned(cfg: CharacterCfg): boolean { return cfg.price === 0 || ownedIds().includes(cfg.id); }

function renderSide() {
  const cfg = CHARACTERS.find(c => c.id === selectedId)!;
  $('chars-name').textContent = cfg.name.toUpperCase();
  $('chars-desc').textContent = cfg.desc;
  const btn = $('btn-chars-confirm');
  if (isOwned(cfg)) {
    const active = store.charId === cfg.id;
    btn.innerHTML = active ? '✓&nbsp; DIPAKAI' : 'PAKAI';
    btn.classList.toggle('inuse', active);
  } else {
    btn.innerHTML = `🔓&nbsp; BELI — 🪙 ${cfg.price}`;
    btn.classList.remove('inuse');
  }
}

function renderGrid() {
  const total = CHARACTERS.length;
  const owned = CHARACTERS.filter(isOwned).length;
  $('chars-count').textContent = `PUNYA: ${owned}/${total}`;

  $('chars-grid').innerHTML = CHARACTERS.map(c => {
    const own = isOwned(c);
    const sel = c.id === selectedId;
    const img = portraits.get(c.id);
    return `<button class="char-card${own ? '' : ' locked'}${sel ? ' sel' : ''}" data-id="${c.id}">
      <span class="cc-img" style="--sw:${c.swatch}">
        ${img ? `<img src="${img}" alt="">` : '<span class="cc-ph">👤</span>'}
        ${own ? '' : '<span class="cc-lock">🔒</span>'}
      </span>
      <span class="cc-name">${c.name}</span>
      ${own ? '' : `<span class="cc-price">🪙 ${c.price}</span>`}
    </button>`;
  }).join('');

  $('chars-grid').querySelectorAll<HTMLButtonElement>('.char-card').forEach(b =>
    b.addEventListener('click', () => selectChar(b.dataset.id!)));
  renderSide();
}

function selectChar(id: string) {
  if (id === selectedId) return;
  AudioFX.click();
  selectedId = id;
  const cfg = CHARACTERS.find(c => c.id === id)!;
  setCharacter(cfg); // pratinjau 3D hidup di kanan
  $('chars-grid').querySelectorAll('.char-card').forEach(el =>
    el.classList.toggle('sel', (el as HTMLElement).dataset.id === id));
  renderSide();
}

// Isi potret secara bertahap (kartu tampil dulu dengan placeholder)
async function fillPortraits() {
  for (const c of CHARACTERS) {
    if (portraits.has(c.id)) continue;
    try {
      const url = await makePortrait(c);
      const img = $('chars-grid').querySelector(`[data-id="${c.id}"] .cc-img`);
      if (img) img.innerHTML = `<img src="${url}" alt="">` + (isOwned(c) ? '' : '<span class="cc-lock">🔒</span>');
    } catch (e) {
      console.error('Gagal membuat potret', c.id, e);
    }
  }
}

// ---------- Buka / tutup / konfirmasi ----------
export function openCharSelect() {
  AudioFX.click();
  selectedId = store.charId;
  menuState.charSelect = true;
  const cur = CHARACTERS.find(c => c.id === selectedId);
  if (cur) setCharacter(cur);
  renderGrid();
  showScreen('chars');
  void fillPortraits();
}

function closeCharSelect() {
  AudioFX.click();
  menuState.charSelect = false;
  // Batal tanpa konfirmasi → kembalikan karakter yang dipakai
  if (selectedId !== store.charId) {
    const cur = CHARACTERS.find(c => c.id === store.charId);
    if (cur) setCharacter(cur);
  }
  menuState.charIdx = Math.max(0, CHARACTERS.findIndex(c => c.id === store.charId));
  refreshMenu();
  showScreen('menu');
}

function confirmCharSelect() {
  const cfg = CHARACTERS.find(c => c.id === selectedId)!;
  if (isOwned(cfg)) {
    store.charId = cfg.id;
    AudioFX.powerup();
    toast(`🎉 ${cfg.name} siap berlari!`);
    menuState.charSelect = false;
    menuState.charIdx = Math.max(0, CHARACTERS.findIndex(c => c.id === cfg.id));
    refreshMenu();
    showScreen('menu');
  } else if (tryBuy(cfg, 'ownedChars')) {
    store.charId = cfg.id;   // beli langsung dipakai
    renderGrid();            // gembok kartu terbuka, tetap di halaman
  }
}

export function initCharSelect() {
  $('btn-chars-close').addEventListener('click', closeCharSelect);
  $('btn-chars-confirm').addEventListener('click', confirmCharSelect);
}

// Dipakai main.ts untuk guard keyboard
export function charSelectVisible(): boolean {
  return !$('chars-screen').classList.contains('hidden');
}
export { closeCharSelect, confirmCharSelect };

// ============================================================
// Entry point: bootstrap, wiring tombol/input, dan game loop
// ============================================================
import { renderer, scene, camera } from './core/three';
import { game, world, menuState } from './core/state';
import { store } from './core/store';
import { AudioFX } from './core/audio';
import { MULT_STEPS } from './core/constants';
import { CHARACTERS } from './data/characters';
import { THEMES } from './data/themes';

import { buildTheme } from './gfx/world';
import { applyPet } from './gfx/petMesh';
import { trailFX } from './gfx/trail';
import { AnimatedCharacter } from './gfx/animatedCharacter';

import {
  setCharacter, updatePlayer, checkCollisions, doJump, doSlide, doMove,
} from './systems/player';
import { moveWorld, startGame, pauseGame, resumeGame, backToMenu, die,
  acceptRevive, declineRevive, updateReviveUI, finalizeRun } from './systems/run';
import { updateCamera } from './systems/camera';
import {
  openMap, renderMap, openArsenal, renderArsenal, startStageRun, checkStageGoal,
  startBossFight, updateBoss, retryStage, victoryToMap, failStage, initBossInput, bossKeyMove, doDodge,
} from './systems/boss';

import { $, showScreen } from './ui/dom';
import { updatePowerFX, updateMultUI } from './ui/hud';
import { carouselItem, carouselMove, tryBuy, refreshMenu, setTab } from './ui/menu';
import { renderDaily, claimDaily, renderWheel, spinWheel, wheel, openChest, maybeShowChest, dailyInfo } from './ui/rewards';
import { renderProfile } from './ui/progress';
import { openCharSelect, initCharSelect, charSelectVisible } from './ui/charSelect';
import { openCollection, initCollectionSelect, collectionVisible } from './ui/collectionSelect';
import { initPreviewRotate } from './ui/previewRotate';

// ============================================================
// Bootstrap
// ============================================================
buildTheme(THEMES.find(t => t.id === store.themeId) || THEMES[0]);
setCharacter(CHARACTERS.find(c => c.id === store.charId) || CHARACTERS[0]);
applyPet();
refreshMenu();
showScreen('menu');
if (!dailyInfo().claimedToday) { renderDaily(); showScreen('menu', 'daily'); }
initBossInput();

// ============================================================
// Wiring tombol
// ============================================================
const on = (id: string, fn: () => void) => $(id).addEventListener('click', fn);

// --- Menu utama ---
$('btn-play').addEventListener('click', () => {
  const { list, idx, ownedKey } = carouselItem();
  const it = list[idx];
  const owned = it.price === 0 || (store as any)[ownedKey].includes(it.id);
  if (owned) { startGame(); return; }
  AudioFX.click();
  if (!menuState.buyArmed) {
    menuState.buyArmed = true;
    $('btn-play').innerHTML = store.coinsTotal >= it.price
      ? `🪙 ${it.price}&nbsp;— TAP LAGI!` : '🪙 KOIN KURANG!';
    setTimeout(() => { if (menuState.buyArmed) refreshMenu(); }, 2600);
    return;
  }
  tryBuy(it, ownedKey);
  refreshMenu();
});
on('btn-adventure', openMap);
on('car-prev', () => carouselMove(-1));
on('car-next', () => carouselMove(1));
document.querySelectorAll<HTMLElement>('.tab').forEach(b =>
  b.addEventListener('click', () => {
    // Karakter & Koleksi punya halaman sendiri (bukan carousel panah)
    if (b.dataset.tab === 'karakter') { setTab('karakter'); openCharSelect(); return; }
    if (b.dataset.tab === 'koleksi') { openCollection(); return; }
    setTab(b.dataset.tab!);
  }));
initCharSelect();
initCollectionSelect();
initPreviewRotate();

// --- HUD / pause / gameover / revive ---
on('btn-pause', () => { AudioFX.click(); pauseGame(); });
on('btn-resume', () => { AudioFX.click(); resumeGame(); });
on('btn-pause-menu', backToMenu);
on('btn-restart', () => { AudioFX.click(); startGame(); });
on('btn-menu', backToMenu);
on('btn-revive', acceptRevive);
on('btn-revive-give', declineRevive);

// --- Hadiah harian / roda / peti / profil ---
on('btn-daily', () => { AudioFX.click(); renderDaily(); showScreen('menu', 'daily'); });
on('btn-daily-claim', claimDaily);
on('btn-daily-close', () => { AudioFX.click(); showScreen('menu'); maybeShowChest(); });
on('btn-wheel', () => { AudioFX.click(); renderWheel(); showScreen('menu', 'wheel'); });
on('btn-spin', spinWheel);
on('btn-wheel-close', () => { AudioFX.click(); if (!wheel.spinning) showScreen('menu'); });
on('btn-chest-open', openChest);
on('btn-chest-close', () => { AudioFX.click(); showScreen('menu'); maybeShowChest(); });
on('btn-profile', () => { AudioFX.click(); renderProfile(); showScreen('menu', 'profile'); });
on('btn-profile-close', () => { AudioFX.click(); showScreen('menu'); });
on('btn-missions-close', () => { AudioFX.click(); showScreen('menu'); });
on('btn-board-close', () => { AudioFX.click(); showScreen('menu'); });

// --- Mode Petualangan ---
on('btn-map-close', () => { AudioFX.click(); showScreen('menu'); });
on('btn-arsenal', () => openArsenal('map'));
on('btn-arsenal-close', () => {
  AudioFX.click();
  if (menuState.arsenalReturn === 'stage') showScreen('menu', 'stage');
  else { renderMap(); showScreen('menu', 'map'); }
});
on('btn-stage-start', startStageRun);
on('btn-stage-weapon', () => openArsenal('stage'));
on('btn-stage-close', () => { AudioFX.click(); renderMap(); showScreen('menu', 'map'); });
on('btn-boss-start', () => { void startBossFight(); });
on('btn-victory-next', victoryToMap);
on('btn-defeat-retry', retryStage);
on('btn-defeat-map', openMap);
$('btn-dodge').addEventListener('pointerdown', (e) => { e.preventDefault(); doDodge(); });

// Re-render arsenal saat dibuka dari stage (biar tombol PASANG konsisten)
on('btn-arsenal', () => renderArsenal());

// ============================================================
// Input keyboard
// ============================================================
window.addEventListener('keydown', (e) => {
  if (game.state === 'menu') {
    // Halaman pilih karakter terbuka: Enter = pakai, Escape = tutup
    if (charSelectVisible()) {
      if (e.code === 'Enter' || e.code === 'Space') $('btn-chars-confirm').click();
      else if (e.code === 'Escape') $('btn-chars-close').click();
      return;
    }
    if (collectionVisible()) {
      if (e.code === 'Enter' || e.code === 'Space') $('btn-col-confirm').click();
      else if (e.code === 'Escape') $('btn-col-close').click();
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') carouselMove(-1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') carouselMove(1);
    else if (e.code === 'Enter' || e.code === 'Space') $('btn-play').click();
    return;
  }
  if (game.state === 'boss') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') bossKeyMove(-0.6, 0);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') bossKeyMove(0.6, 0);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') bossKeyMove(0, -0.6);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') bossKeyMove(0, 0.6);
    else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') doDodge();
    return;
  }
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': doMove(-1); break;
    case 'ArrowRight': case 'KeyD': doMove(1); break;
    case 'ArrowUp': case 'KeyW': case 'Space': doJump(); break;
    case 'ArrowDown': case 'KeyS': doSlide(); break;
    case 'KeyP': case 'Escape':
      if (game.state === 'playing') pauseGame();
      else if (game.state === 'paused') resumeGame();
      break;
  }
});

// ============================================================
// Input sentuh (swipe) — boss pakai pointer drag (initBossInput)
// ============================================================
let touchStart: { x: number; y: number } | null = null;
window.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  const TH = 28;
  if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
  if (game.state === 'menu') {
    if (Math.abs(dx) > Math.abs(dy)) carouselMove(dx > 0 ? -1 : 1);
    return;
  }
  if (game.state !== 'playing') return;
  if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : -1);
  else if (dy < 0) doJump();
  else doSlide();
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') pauseGame();
});

// ============================================================
// Game loop
// ============================================================
let lastT = performance.now();
function tick(now: number) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (game.state === 'playing') {
    game.time += dt;
    game.speed = Math.min(30, 11 + game.time * 0.35);
    if (game.invuln > 0) game.invuln = Math.max(0, game.invuln - dt);
    for (const k in game.power) game.power[k] = Math.max(0, game.power[k] - dt);
    moveWorld(dt);
    updatePlayer(dt);
    trailFX.update(dt, game.speed * dt);
    if (checkCollisions()) die();
    checkStageGoal();
    const prevMult = game.mult;
    let m = 1;
    for (const step of MULT_STEPS) if (game.distance >= step) m++;
    game.mult = Math.min(5, m - 1) || 1;
    game.scoreAcc += game.speed * dt * game.mult;
    game.score = Math.floor(game.scoreAcc) + game.coins * 10;
    $('hud-score').textContent = String(game.score);
    $('hud-coins-val').textContent = String(game.coins);
    if (game.mult !== prevMult) updateMultUI();
    updatePowerFX();
  } else if (game.state === 'revive') {
    game.reviveTimer -= dt;
    updateReviveUI();
    updatePlayer(dt * 0.15);
    if (game.reviveTimer <= 0) finalizeRun();
  } else if (game.state === 'boss') {
    // Slow-mo saat bos tumbang biar momennya terasa
    updateBoss(game.boss?.dead ? dt * 0.45 : dt);
  } else if (game.state === 'menu') {
    game.speed = 4;
    moveWorld(dt * 0.6);
    game.nextSpawn = game.distance + 999;
    updatePlayer(dt);
    // Di halaman koleksi: partikel jejak mengambang di tempat (di belakang karakter)
    // lalu memudar — tidak mengalir ke +Z dunia yang salah arah saat karakter diputar.
    trailFX.update(dt, menuState.collectionSelect ? 0 : game.speed * dt * 0.6);
    // Halaman pilih (karakter/koleksi): putaran dikontrol geseran; selain itu ayun lembut
    game.charMesh.rotation.y = (menuState.charSelect || menuState.collectionSelect)
      ? menuState.spin
      : Math.sin(now * 0.0006) * 0.3;
  } else if (game.state === 'gameover') {
    const anim = game.charMesh.userData.anim as AnimatedCharacter | undefined;
    if (anim) {
      anim.play('death', { loop: false });
      anim.update(dt);
    } else if (game.charMesh.rotation.x < 1.4) {
      game.charMesh.rotation.x += dt * 5;
    }
  }

  updateCamera(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);

// ============================================================
// SPIKE: uji model 3D ber-rig sebelum konversi besar-besaran
// Dipakai dari console browser — lihat public/models/README.md
// ============================================================
let spikeChar: AnimatedCharacter | null = null;

/** Tampilkan model .glb sebagai karakter (menggantikan yang prosedural). */
async function spike(url: string, height = 2.05) {
  const ac = await AnimatedCharacter.load(url, height);
  ac.animRoot.rotation.y = Math.PI; // samakan orientasi dengan karakter game
  if (game.charMesh) scene.remove(game.charMesh);
  spikeChar = ac;
  game.charMesh = ac.root;
  ac.root.userData.anim = ac;
  scene.add(ac.root);
  const clips = ac.listClips();
  if (!ac.play('idle')) ac.play(clips[0] ?? '');
  return { klip: clips, memutar: ac.playing || '(tidak ada klip)' };
}

/** Intip nama klip di sebuah file tanpa menampilkannya. */
async function spikeClips(url: string) {
  const ac = await AnimatedCharacter.load(url);
  const clips = ac.listClips();
  ac.dispose();
  return clips.length ? clips : '(file ini tidak punya klip animasi)';
}

/** Coba mainkan klip tertentu pada model spike. */
function spikePlay(name: string) {
  if (!spikeChar) return 'Belum ada model — jalankan __game.spike(url) dulu.';
  return spikeChar.play(name)
    ? 'memutar: ' + spikeChar.playing
    : 'klip tidak ketemu: ' + name + ' | tersedia: ' + spikeChar.listClips().join(', ');
}

/** Kembali ke karakter prosedural lama. */
function spikeOff() {
  if (game.charMesh) scene.remove(game.charMesh);
  if (spikeChar) { spikeChar.dispose(); spikeChar = null; }
  setCharacter(CHARACTERS.find(c => c.id === store.charId) || CHARACTERS[0]);
  return 'kembali ke karakter prosedural';
}

// Debug handle (opsional)
(window as any).__game = {
  game, world, store, menuState, renderer, scene, camera, updateBoss, doDodge, updateCamera, checkStageGoal,
  updatePlayer, moveWorld, trailFX, spike, spikeClips, spikePlay, spikeOff,
};

// failStage diekspor ulang agar tree-shaking tidak membuang (dipakai run.ts)
void failStage;

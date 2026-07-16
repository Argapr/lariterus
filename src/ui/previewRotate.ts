// ============================================================
// Geser layar untuk memutar pratinjau 3D (halaman pilih karakter & koleksi)
// ============================================================
import { menuState } from '../core/state';

const active = () => menuState.charSelect || menuState.collectionSelect;

export function initPreviewRotate() {
  let dragging = false, lastX = 0;
  window.addEventListener('pointerdown', (e) => {
    if (!active()) return;
    const t = e.target as HTMLElement;
    // Biarkan panel grid bisa di-scroll & tombol bisa diklik
    if (t.closest('.chars-panel') || t.closest('.col-tabs') || t.closest('button')) return;
    dragging = true; lastX = e.clientX;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || !active()) return;
    menuState.spin -= (e.clientX - lastX) * 0.01;
    lastX = e.clientX;
  });
  const stop = () => { dragging = false; };
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

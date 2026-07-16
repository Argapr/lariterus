// ============================================================
// Helper DOM, pergantian layar, toast/banner/popup
// ============================================================
export const $ = (id: string) => document.getElementById(id) as HTMLElement;

export const screens: Record<string, HTMLElement> = {
  menu: $('menu'), hud: $('hud'), pause: $('pause-screen'), gameover: $('gameover'),
  missions: $('missions-screen'), board: $('board-screen'),
  daily: $('daily-screen'), wheel: $('wheel-screen'),
  chest: $('chest-screen'), profile: $('profile-screen'),
  revive: $('revive-screen'),
  // Mode Petualangan
  map: $('map-screen'), arsenal: $('arsenal-screen'), stage: $('stage-screen'),
  preboss: $('preboss-screen'), bosshud: $('bosshud'), victory: $('victory-screen'),
  defeat: $('defeat-screen'),
  chars: $('chars-screen'),
  collection: $('collection-screen'),
};

export function showScreen(...names: string[]) {
  for (const k in screens) screens[k].classList.toggle('hidden', !names.includes(k));
}

export function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function popup(text: string) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

export function showBanner(text: string, color: string) {
  const el = $('event-banner') as HTMLElement & { _t?: number };
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('hidden', 'out');
  void el.offsetWidth; // restart animasi
  el.classList.add('shown');
  clearTimeout(el._t);
  el._t = window.setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.classList.add('hidden'), 500);
  }, 1600);
}

// ============================================================
// Efek visual & indikator HUD power-up / multiplier
// ============================================================
import { game } from '../core/state';
import { POWER_INFO } from '../core/constants';
import { powerDuration } from '../data/progression';
import { $ } from './dom';

export function updateMultUI() {
  const el = $('hud-mult');
  if (game.mult > 1) {
    el.textContent = 'x' + game.mult;
    el.classList.remove('hidden');
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 160);
  } else {
    el.classList.add('hidden');
  }
}

export function updatePowerFX() {
  const ud = game.charMesh.userData as any;
  if (ud.shieldBubble) ud.shieldBubble.visible = game.power.shield > 0;
  if (ud.rocketFlames) ud.rocketFlames.visible = game.power.rocket > 0 && game.y > 0.01;

  const el = $('powerups');
  const active = Object.keys(game.power).filter(k => game.power[k] > 0);
  const key = active.join(',');
  if (el.dataset.active !== key) {
    el.dataset.active = key;
    el.innerHTML = active.map(k =>
      `<div class="power-pill"><span>${POWER_INFO[k].icon}</span>
        <div class="power-bar"><div></div></div></div>`).join('');
  }
  el.querySelectorAll<HTMLElement>('.power-bar > div').forEach((bar, i) => {
    bar.style.width = (game.power[active[i]] / powerDuration(active[i])) * 100 + '%';
  });
}

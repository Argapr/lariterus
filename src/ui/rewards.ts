// ============================================================
// Hadiah login harian, roda hadiah, peti misterius
// ============================================================
import { game } from '../core/state';
import { store } from '../core/store';
import { AudioFX } from '../core/audio';
import { POWER_INFO } from '../core/constants';
import { LOGIN_REWARDS, WHEEL_PRIZES, WHEEL_EXTRA_COST } from '../data/progression';
import { todayKey } from '../core/util';
import { $, showScreen, toast } from './dom';
import { refreshMenu } from './menu';
import { checkAchievements } from './progress';

// ---------- Hadiah login harian ----------
export function dailyInfo() {
  const t = todayKey();
  const L = store.login;
  const claimedToday = L.last === t;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const nextStreak = claimedToday ? L.streak : (L.last === yesterday ? L.streak + 1 : 1);
  const day = ((nextStreak - 1) % 7) + 1;
  return { claimedToday, nextStreak, day };
}

export function renderDaily() {
  const { claimedToday, nextStreak, day } = dailyInfo();
  $('daily-streak-text').textContent = claimedToday
    ? `🔥 Streak ${nextStreak} hari — sudah diambil, kembali besok!`
    : `🔥 Streak ${nextStreak} hari — ambil hadiah hari ke-${day}!`;
  $('daily-grid').innerHTML = LOGIN_REWARDS.map((r, i) => {
    const d = i + 1;
    const cls = ['login-card'];
    if (d === 7) cls.push('day7');
    if (d < day || (d === day && claimedToday)) cls.push('claimed');
    if (d === day && !claimedToday) cls.push('today');
    return `<div class="${cls.join(' ')}">
      <div class="d">Hari ${d}</div>
      <div class="r">🪙 ${r.coins}${r.chest ? ' +📦' : ''}</div>
    </div>`;
  }).join('');
  const btn = $('btn-daily-claim') as HTMLButtonElement;
  btn.disabled = claimedToday;
  btn.style.opacity = claimedToday ? '0.4' : '1';
  btn.textContent = claimedToday ? 'SUDAH DIAMBIL ✓' : 'AMBIL HADIAH';
}

export function claimDaily() {
  const { claimedToday, nextStreak, day } = dailyInfo();
  if (claimedToday) return;
  const r = LOGIN_REWARDS[day - 1];
  store.coinsTotal += r.coins;
  if (r.chest) store.chests++;
  store.login = { last: todayKey(), streak: nextStreak };
  AudioFX.powerup();
  toast(`🎁 Hari ${day}: +${r.coins} 🪙${r.chest ? ' + peti misterius!' : ''}`);
  checkAchievements();
  renderDaily();
  refreshMenu();
}

// ---------- Roda hadiah ----------
export const wheel = { spinning: false, angle: 0 };

export function renderWheel() {
  const el = $('wheel');
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = WHEEL_PRIZES.map((p, i) => {
      const ang = i * 45 + 22.5;
      return `<div class="wheel-label" style="transform:rotate(${ang}deg) translate(0,-105px) rotate(${-ang}deg) translate(-50%,-50%)">${p.label}</div>`;
    }).join('');
  }
  const free = store.wheelLast !== todayKey();
  $('btn-spin').textContent = wheel.spinning ? '...' : (free ? 'PUTAR — GRATIS!' : `PUTAR — 🪙 ${WHEEL_EXTRA_COST}`);
}

export function spinWheel() {
  if (wheel.spinning) return;
  const free = store.wheelLast !== todayKey();
  if (!free) {
    if (store.coinsTotal < WHEEL_EXTRA_COST) { toast(`Koin kurang! Putaran ekstra 🪙 ${WHEEL_EXTRA_COST}`); return; }
    store.coinsTotal -= WHEEL_EXTRA_COST;
  } else {
    store.wheelLast = todayKey();
  }
  wheel.spinning = true;
  renderWheel();
  AudioFX.click();
  const target = (Math.random() * WHEEL_PRIZES.length) | 0;
  const desired = (360 - (target * 45 + 22.5)) % 360;
  const cur = ((wheel.angle % 360) + 360) % 360;
  wheel.angle += 5 * 360 + ((desired - cur + 360) % 360);
  $('wheel').style.transform = `rotate(${wheel.angle}deg)`;
  setTimeout(() => {
    wheel.spinning = false;
    const p = WHEEL_PRIZES[target];
    if (p.coins) {
      store.coinsTotal += p.coins;
      toast(`${p.jackpot ? '💰 JACKPOT! ' : '🎡 '}+${p.coins} 🪙`);
    } else if (p.voucher) {
      const v = store.vouchers;
      v[p.voucher]++;
      store.vouchers = v;
      toast(`🎡 Voucher ${POWER_INFO[p.voucher].icon} ${POWER_INFO[p.voucher].name} — aktif otomatis di lari berikutnya!`);
    }
    AudioFX.powerup();
    renderWheel();
    refreshMenu();
  }, 3400);
}

// ---------- Peti misterius ----------
export function maybeShowChest() {
  if (store.chests <= 0 || game.state !== 'menu') return;
  $('chest-sub').textContent = store.chests > 1 ? `Kamu punya ${store.chests} peti misterius!` : 'Kamu mendapat peti misterius!';
  $('chest-box').classList.remove('opened');
  $('chest-box').textContent = '🎁';
  $('chest-result').classList.add('hidden');
  $('btn-chest-open').classList.remove('hidden');
  $('btn-chest-close').classList.add('hidden');
  showScreen('menu', 'chest');
}

export function openChest() {
  if (store.chests <= 0) return;
  store.chests--;
  const r = Math.random();
  let text: string;
  if (r < 0.55) {
    const c = 50 + 10 * ((Math.random() * 20) | 0);
    store.coinsTotal += c;
    text = `+${c} 🪙`;
  } else if (r < 0.85) {
    const c = 300 + 10 * ((Math.random() * 20) | 0);
    store.coinsTotal += c;
    text = `💰 +${c} 🪙`;
  } else {
    const types = Object.keys(POWER_INFO);
    const t = types[(Math.random() * types.length) | 0];
    const v = store.vouchers;
    v[t]++;
    store.vouchers = v;
    text = `${POWER_INFO[t].icon} Voucher ${POWER_INFO[t].name}!`;
  }
  AudioFX.powerup();
  $('chest-box').classList.add('opened');
  $('chest-box').textContent = '✨';
  const res = $('chest-result');
  res.textContent = text;
  res.classList.remove('hidden');
  $('btn-chest-open').classList.add('hidden');
  $('btn-chest-close').classList.remove('hidden');
  refreshMenu();
}

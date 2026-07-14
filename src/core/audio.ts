// ============================================================
// Audio prosedural
// ============================================================
export const AudioFX = {
  ctx: null as AudioContext | null,
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  beep(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slide = 0) {
    try {
      this.ensure();
      const ctx = this.ctx!;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur);
    } catch (e) { /* audio tidak tersedia */ }
  },
  coin() { this.beep(1150, 0.12, 'square', 0.07); this.beep(1720, 0.16, 'square', 0.05); },
  jump() { this.beep(300, 0.22, 'sine', 0.1, 350); },
  slide() { this.beep(240, 0.18, 'sawtooth', 0.05, -120); },
  crash() { this.beep(120, 0.5, 'sawtooth', 0.16, -70); },
  click() { this.beep(650, 0.06, 'square', 0.06); },
  powerup() {
    this.beep(520, 0.1, 'square', 0.07);
    setTimeout(() => this.beep(780, 0.1, 'square', 0.07), 90);
    setTimeout(() => this.beep(1040, 0.16, 'square', 0.07), 180);
  },
  shieldBreak() { this.beep(500, 0.3, 'sawtooth', 0.12, -300); },
};

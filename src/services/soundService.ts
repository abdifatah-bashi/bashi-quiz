class SoundService {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  playCorrect() {
    // A pleasant "ding" - Louder and longer
    this.playTone(523.25, 'sine', 0.8, 0.4); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.8, 0.4), 150); // E5
  }

  playWrong() {
    // A low "buzz" - Louder and longer
    this.playTone(220, 'sawtooth', 0.6, 0.3); // A3
    setTimeout(() => this.playTone(180, 'sawtooth', 0.7, 0.3), 150);
  }

  playTick() {
    // A short "click"
    this.playTone(800, 'sine', 0.1, 0.1);
  }

  playWarning() {
    // A slightly more urgent tick - Louder and longer
    this.playTone(1200, 'sine', 0.15, 0.2);
  }

  playPop() {
    // A high-pitched "pop" sound
    this.playTone(1000, 'sine', 0.1, 0.3);
    setTimeout(() => this.playTone(1500, 'sine', 0.1, 0.3), 50);
  }
}

export const soundService = new SoundService();

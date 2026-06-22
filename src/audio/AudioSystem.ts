export class AudioSystem {
  private context?: AudioContext;
  private drone?: OscillatorNode;
  private gain?: GainNode;

  resume(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0.035;
      this.gain.connect(this.context.destination);
      this.drone = this.context.createOscillator();
      this.drone.type = "sawtooth";
      this.drone.frequency.value = 46;
      this.drone.connect(this.gain);
      this.drone.start();
    }
    void this.context.resume();
  }

  click(): void {
    this.tone(880, 0.025, 0.04, "square");
  }

  bell(): void {
    this.tone(620, 0.08, 0.16, "sine");
    setTimeout(() => this.tone(460, 0.05, 0.18, "sine"), 90);
  }

  stinger(): void {
    this.tone(90, 0.18, 0.7, "sawtooth");
    this.tone(44, 0.18, 0.9, "square");
  }

  endTone(): void {
    this.tone(330, 0.05, 0.55, "triangle");
    setTimeout(() => this.tone(220, 0.04, 0.9, "triangle"), 260);
  }

  private tone(freq: number, volume: number, duration: number, type: OscillatorType): void {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    osc.stop(this.context.currentTime + duration);
  }
}

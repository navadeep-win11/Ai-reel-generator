/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Phonk Drum & Bass Synthesizer using Web Audio API
// Custom engineered with high-resonance cowbell, 808 kick, rolling hat ticks, and thick crawling sub-bass.

class PhonkSynthEngine {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private bpm = 126;
  private step = 0;
  private masterGain: GainNode | null = null;
  private bassSynthGain: GainNode | null = null;

  constructor() {}

  public async start() {
    if (this.intervalId) return;

    // Initialize AudioContext lazily on user interaction
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Set up master nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime); // keep BGM pleasant below voice
    this.masterGain.connect(this.ctx.destination);

    this.bassSynthGain = this.ctx.createGain();
    this.bassSynthGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.bassSynthGain.connect(this.masterGain);

    const stepDuration = 60 / this.bpm / 4; // sixteenth notes
    let nextStepTime = this.ctx.currentTime;

    this.step = 0;
    this.intervalId = setInterval(() => {
      if (!this.ctx || !this.masterGain) return;

      const lookahead = 0.1;
      while (nextStepTime < this.ctx.currentTime + lookahead) {
        this.schedulePattern(this.step, nextStepTime);
        nextStepTime += stepDuration;
        this.step = (this.step + 1) % 16;
      }
    }, 25);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.bassSynthGain = null;
  }

  private schedulePattern(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Pattern definitions (16 steps)
    // Kick on steps 0, 4, 8, 12, 14
    const kickPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
    
    // Distorted metallic beefy bass scale
    // E.g., dark, brooding minimal phonk progression in F# minor
    const bassPattern = [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0];
    const bassNotes = [36, 36, 36, 36, 39, 39, 39, 39, 34, 34, 34, 34, 36, 36, 42, 41]; // midi

    // Rolling Hi-hat on almost all steps except kick starts
    const hatPattern = [0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1];
    
    // Iconic cowbell rhythm (Phonk melody lines) on step 2, 6, 12
    const cowbellPattern = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0];
    const cowbellMelody = [800, 800, 950, 950, 800, 850, 1050, 1000, 950, 950, 950, 950, 800, 900, 800, 800];

    if (kickPattern[step]) {
      this.triggerKick(time);
    }
    if (bassPattern[step]) {
      const midiNote = bassNotes[step % bassNotes.length];
      const freq = this.midiToFreq(midiNote - 12); // drop octave
      this.triggerBass(freq, time);
    }
    if (hatPattern[step]) {
      // randomly do double tick for Phonk swing
      this.triggerHat(time, step % 3 === 0);
    }
    if (cowbellPattern[step]) {
      this.triggerCowbell(cowbellMelody[step], time);
    }
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    // Deep distorted 808 pitch sweep
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

    gain.gain.setValueAtTime(1.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private triggerBass(freq: number, time: number) {
    if (!this.ctx || !this.bassSynthGain) return;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq / 2, time); // sub bass

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.25);
    filter.Q.setValueAtTime(8, time);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassSynthGain);

    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(1.0, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.3);
    subOsc.stop(time + 0.3);
  }

  private triggerHat(time: number, accent: boolean) {
    if (!this.ctx || !this.masterGain) return;

    // Noise buffer for snap drum
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.35 : 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private triggerCowbell(freq: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Classic 808 Phonk cowbell consists of two square wave oscillators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const bandpass = this.ctx.createBiquadFilter();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(freq * 1.488, time); // detuned interval

    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(freq * 1.1, time);
    bandpass.Q.setValueAtTime(5, time);

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.2);
    osc2.stop(time + 0.2);
  }

  private midiToFreq(note: number) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }
}

export const phonkSynth = new PhonkSynthEngine();

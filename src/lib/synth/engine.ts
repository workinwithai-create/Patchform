import type { Patch } from "./types";
import { clamp } from "./types";

const MAX_VOICES = 16;
const PEAK = 0.2;

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 1);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

type Voice = {
  midi: number;
  osc: OscillatorNode;
  osc2: OscillatorNode | null;
  sub: OscillatorNode | null;
  noise: AudioBufferSourceNode | null;
  filter: BiquadFilterNode;
  amp: GainNode;
  startedAt: number;
  releasing: boolean;
};

export class SynthEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly voices = new Map<number, Voice>();
  private readonly noiseBuffer: AudioBuffer;
  private patch: Patch;
  private volume = 0.75;
  private muted = false;
  private bendRatio = 1;
  private readonly keepAlive: ConstantSourceNode | null = null;

  constructor(ctx: AudioContext, patch: Patch) {
    this.ctx = ctx;
    this.patch = patch;

    this.master = ctx.createGain();
    this.master.gain.value = this.gainValue();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 6;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.12;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.62;

    this.master.connect(compressor);
    compressor.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    try {
      const keepGain = ctx.createGain();
      keepGain.gain.value = 0;
      const keepAlive = ctx.createConstantSource();
      keepAlive.offset.value = 0;
      keepAlive.connect(keepGain);
      keepGain.connect(ctx.destination);
      keepAlive.start();
      this.keepAlive = keepAlive;
    } catch {
      this.keepAlive = null;
    }

    this.noiseBuffer = makeNoise(ctx);
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  getState(): AudioContextState {
    return this.ctx.state;
  }

  private gainValue(): number {
    const v = this.muted ? 0 : this.volume;
    return v * v * 0.9;
  }

  setVolume(volume: number) {
    this.volume = clamp(volume, 0, 1);
    this.master.gain.setTargetAtTime(this.gainValue(), this.ctx.currentTime, 0.025);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.master.gain.setTargetAtTime(this.gainValue(), this.ctx.currentTime, 0.025);
  }

  setPitchBend(norm: number) {
    const semitones = clamp(norm, -1, 1) * 2;
    this.bendRatio = Math.pow(2, semitones / 12);
    const now = this.ctx.currentTime;
    for (const voice of this.voices.values()) {
      const hz = midiToHz(voice.midi) * this.bendRatio;
      voice.osc.frequency.setTargetAtTime(hz, now, 0.012);
      voice.osc2?.frequency.setTargetAtTime(hz, now, 0.012);
      voice.sub?.frequency.setTargetAtTime(hz / 2, now, 0.012);
    }
  }

  setPatch(patch: Patch) {
    this.patch = patch;
    const now = this.ctx.currentTime;
    for (const voice of this.voices.values()) {
      voice.filter.type = patch.filterType;
      voice.filter.frequency.setTargetAtTime(patch.cutoff, now, 0.04);
      voice.filter.Q.setTargetAtTime(patch.resonance, now, 0.04);
      try {
        voice.osc.type = patch.waveform;
        if (voice.osc2) {
          voice.osc2.type = patch.waveform;
          voice.osc2.detune.setTargetAtTime(patch.detune, now, 0.04);
        }
      } catch {
        /* oscillator type is always valid for Waveform */
      }
    }
  }

  noteOn(midi: number, velocity = 1) {
    const existing = this.voices.get(midi);
    if (existing) this.kill(existing);

    if (this.voices.size >= MAX_VOICES) {
      let victim: Voice | null = null;
      for (const voice of this.voices.values()) {
        if (!voice.releasing) continue;
        if (!victim || voice.startedAt < victim.startedAt) victim = voice;
      }
      if (!victim) {
        for (const voice of this.voices.values()) {
          if (!victim || voice.startedAt < victim.startedAt) victim = voice;
        }
      }
      if (victim) this.kill(victim);
    }

    const now = this.ctx.currentTime;
    const patch = this.patch;
    const freq = midiToHz(midi) * this.bendRatio;

    const filter = this.ctx.createBiquadFilter();
    filter.type = patch.filterType;
    filter.Q.value = patch.resonance;

    const amp = this.ctx.createGain();
    amp.gain.value = 0.0001;

    filter.connect(amp);
    amp.connect(this.master);

    const oscGain = this.ctx.createGain();
    oscGain.gain.value = Math.max(0.08, 1 - patch.noiseMix * 0.9);
    oscGain.connect(filter);

    const osc = this.ctx.createOscillator();
    osc.type = patch.waveform;
    osc.frequency.value = freq;
    osc.connect(oscGain);
    osc.start(now);

    let osc2: OscillatorNode | null = null;
    if (patch.osc2Mix > 0.02) {
      osc2 = this.ctx.createOscillator();
      osc2.type = patch.waveform;
      osc2.frequency.value = freq;
      osc2.detune.value = patch.detune;
      const mix = this.ctx.createGain();
      mix.gain.value = patch.osc2Mix;
      osc2.connect(mix);
      mix.connect(oscGain);
      osc2.start(now);
    }

    let sub: OscillatorNode | null = null;
    if (patch.subMix > 0.02) {
      sub = this.ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      const mix = this.ctx.createGain();
      mix.gain.value = patch.subMix * 0.85;
      sub.connect(mix);
      mix.connect(filter);
      sub.start(now);
    }

    let noise: AudioBufferSourceNode | null = null;
    if (patch.noiseMix > 0.02) {
      noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const mix = this.ctx.createGain();
      mix.gain.value = patch.noiseMix;
      noise.connect(mix);
      mix.connect(filter);
      noise.start(now);
    }

    const attack = Math.max(patch.attack, 0.006);
    const decay = Math.max(patch.decay, 0.012);
    const peak = PEAK * velocity;
    const sustain = Math.max(peak * patch.sustain, 0.0001);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(peak, now + attack);
    amp.gain.exponentialRampToValueAtTime(sustain, now + attack + decay);

    const envHz = patch.filterEnv * 4200;
    const startHz = clamp(patch.cutoff, 40, 16000);
    const peakHz = clamp(patch.cutoff + envHz, 40, 16000);
    const sustainHz = clamp(patch.cutoff + envHz * patch.sustain, 40, 16000);
    filter.frequency.setValueAtTime(startHz, now);
    filter.frequency.linearRampToValueAtTime(peakHz, now + attack);
    filter.frequency.linearRampToValueAtTime(sustainHz, now + attack + decay);

    this.voices.set(midi, {
      midi,
      osc,
      osc2,
      sub,
      noise,
      filter,
      amp,
      startedAt: now,
      releasing: false,
    });
  }

  noteOff(midi: number, releaseOverride?: number) {
    const voice = this.voices.get(midi);
    if (!voice || voice.releasing) return;
    voice.releasing = true;

    const now = this.ctx.currentTime;
    const release = Math.max(releaseOverride ?? this.patch.release, 0.03);
    const current = Math.max(voice.amp.gain.value, 0.0001);
    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setValueAtTime(current, now);
    voice.amp.gain.exponentialRampToValueAtTime(0.0001, now + release);
    voice.filter.frequency.cancelScheduledValues(now);
    voice.filter.frequency.setTargetAtTime(this.patch.cutoff, now, release * 0.25);

    const stopAt = now + release + 0.04;
    this.stopSources(voice, stopAt);

    globalThis.setTimeout(() => {
      this.disconnect(voice);
      if (this.voices.get(midi) === voice) this.voices.delete(midi);
    }, (release + 0.06) * 1000);
  }

  allOff() {
    for (const midi of [...this.voices.keys()]) this.noteOff(midi, 0.05);
  }

  preview(midi: number, seconds = 0.6) {
    this.noteOn(midi);
    globalThis.setTimeout(() => this.noteOff(midi), seconds * 1000);
  }

  async resume() {
    if (this.ctx.state === "closed") return;
    if (this.ctx.state !== "running") {
      try {
        await this.ctx.resume();
      } catch {
        /* resume requires a user gesture in some browsers */
      }
    }
  }

  private kill(voice: Voice) {
    const now = this.ctx.currentTime;
    try {
      voice.amp.gain.cancelScheduledValues(now);
      voice.amp.gain.setTargetAtTime(0.0001, now, 0.01);
      this.stopSources(voice, now + 0.03);
    } catch {
      /* already stopped */
    }
    this.disconnect(voice);
    this.voices.delete(voice.midi);
  }

  private stopSources(voice: Voice, when: number) {
    try {
      voice.osc.stop(when);
      voice.osc2?.stop(when);
      voice.sub?.stop(when);
      voice.noise?.stop(when);
    } catch {
      /* already stopped */
    }
  }

  private disconnect(voice: Voice) {
    try {
      voice.amp.disconnect();
      voice.filter.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}

export function createAudioContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor({ latencyHint: "balanced" });
}

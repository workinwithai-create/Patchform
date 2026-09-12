export type Waveform = "sine" | "square" | "sawtooth" | "triangle";
export type FilterType = "lowpass" | "highpass" | "bandpass";

export type Patch = {
  name: string;
  description: string;
  waveform: Waveform;
  detune: number;
  osc2Mix: number;
  subMix: number;
  noiseMix: number;
  cutoff: number;
  resonance: number;
  filterType: FilterType;
  filterEnv: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

export const WAVEFORMS: { id: Waveform; label: string }[] = [
  { id: "sine", label: "Sine" },
  { id: "triangle", label: "Tri" },
  { id: "sawtooth", label: "Saw" },
  { id: "square", label: "Square" },
];

export const FILTER_TYPES: { id: FilterType; label: string }[] = [
  { id: "lowpass", label: "LP" },
  { id: "highpass", label: "HP" },
  { id: "bandpass", label: "BP" },
];

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function sanitizePatch(input: Partial<Patch> & { name?: string }): Patch {
  const waveform: Waveform = WAVEFORMS.some((w) => w.id === input.waveform)
    ? (input.waveform as Waveform)
    : "sawtooth";
  const filterType: FilterType = FILTER_TYPES.some((f) => f.id === input.filterType)
    ? (input.filterType as FilterType)
    : "lowpass";

  return {
    name: (input.name ?? "Untitled").trim().slice(0, 40) || "Untitled",
    description: (input.description ?? "").trim().slice(0, 180),
    waveform,
    detune: clamp(Number(input.detune) || 0, 0, 50),
    osc2Mix: clamp(Number(input.osc2Mix) || 0, 0, 1),
    subMix: clamp(Number(input.subMix) || 0, 0, 1),
    noiseMix: clamp(Number(input.noiseMix) || 0, 0, 1),
    cutoff: clamp(Number(input.cutoff) || 2000, 60, 14000),
    resonance: clamp(Number(input.resonance) || 0.8, 0.1, 18),
    filterType,
    filterEnv: clamp(Number(input.filterEnv) || 0, -1, 1),
    attack: clamp(Number(input.attack) || 0.01, 0.004, 2.5),
    decay: clamp(Number(input.decay) || 0.2, 0.01, 2.5),
    sustain: clamp(Number(input.sustain) ?? 0.7, 0, 1),
    release: clamp(Number(input.release) || 0.25, 0.02, 5),
  };
}

export type MidiNoteMessage = {
  type: "noteon" | "noteoff";
  channel: number;
  note: number;
  velocity: number;
};

export type MidiCcMessage = {
  type: "cc";
  channel: number;
  controller: number;
  value: number;
};

export type MidiPitchMessage = {
  type: "pitchbend";
  channel: number;
  /** -1 … 1 */
  value: number;
};

export type MidiMessage = MidiNoteMessage | MidiCcMessage | MidiPitchMessage;

export const CC = {
  mod: 1,
  volume: 7,
  expression: 11,
  sustain: 64,
  resonance: 71,
  cutoff: 74,
} as const;

export function midiSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

export function parseMidi(data: Uint8Array): MidiMessage | null {
  if (data.length < 2) return null;
  const status = data[0]!;
  if (status === 0xf8 || status === 0xfe || status === 0xff) return null;
  const cmd = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const a = data[1]!;
  const b = data[2] ?? 0;

  if (cmd === 0x90) {
    if (b === 0) return { type: "noteoff", channel, note: a, velocity: 0 };
    return { type: "noteon", channel, note: a, velocity: b };
  }
  if (cmd === 0x80) return { type: "noteoff", channel, note: a, velocity: b };
  if (cmd === 0xb0) return { type: "cc", channel, controller: a, value: b };
  if (cmd === 0xe0) {
    const raw = (b << 7) | a;
    return { type: "pitchbend", channel, value: (raw - 8192) / 8192 };
  }
  return null;
}

export function velocityGain(midiVelocity: number): number {
  const t = Math.min(1, Math.max(0, midiVelocity / 127));
  return Math.max(0.06, t * t * 0.35 + t * 0.65);
}

export function logMap(value: number, min: number, max: number): number {
  const t = Math.min(1, Math.max(0, value / 127));
  return min * Math.pow(max / min, t);
}

export function listPorts(map: MIDIInputMap | MIDIOutputMap): { id: string; name: string }[] {
  const ports: { id: string; name: string }[] = [];
  map.forEach((port) => {
    if (port.state === "disconnected") return;
    ports.push({ id: port.id, name: port.name || port.id });
  });
  return ports;
}

export function sendNoteOn(output: MIDIOutput, channel: number, note: number, velocity: number) {
  const ch = Math.min(16, Math.max(1, channel)) - 1;
  const vel = Math.min(127, Math.max(1, Math.round(velocity)));
  output.send([0x90 | ch, note & 0x7f, vel]);
}

export function sendNoteOff(output: MIDIOutput, channel: number, note: number) {
  const ch = Math.min(16, Math.max(1, channel)) - 1;
  output.send([0x80 | ch, note & 0x7f, 0]);
}

export const MIDI_EVENT = "patchform-midi";

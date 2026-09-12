const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToName(midi: number): string {
  const name = NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

/** Physical key codes → semitone offset from the current octave's C. */
export const KEY_INTERVAL: Record<string, number> = {
  KeyZ: 0,
  KeyS: 1,
  KeyX: 2,
  KeyD: 3,
  KeyC: 4,
  KeyV: 5,
  KeyG: 6,
  KeyB: 7,
  KeyH: 8,
  KeyN: 9,
  KeyJ: 10,
  KeyM: 11,
  Comma: 12,
  KeyL: 13,
  Period: 14,
  Semicolon: 15,
  Slash: 16,
  KeyQ: 12,
  Digit2: 13,
  KeyW: 14,
  Digit3: 15,
  KeyE: 16,
  KeyR: 17,
  Digit5: 18,
  KeyT: 19,
  Digit6: 20,
  KeyY: 21,
  Digit7: 22,
  KeyU: 23,
  KeyI: 24,
  Digit9: 25,
  KeyO: 26,
  Digit0: 27,
  KeyP: 28,
};

export const INTERVAL_HINT: Record<number, string> = {
  0: "Z",
  1: "S",
  2: "X",
  3: "D",
  4: "C",
  5: "V",
  6: "G",
  7: "B",
  8: "H",
  9: "N",
  10: "J",
  11: "M",
  12: "Q",
  13: "2",
  14: "W",
  15: "3",
  16: "E",
  17: "R",
  18: "5",
  19: "T",
  20: "6",
  21: "Y",
  22: "7",
  23: "U",
  24: "I",
};

export function octaveToMidiC(octave: number): number {
  return (octave + 1) * 12;
}

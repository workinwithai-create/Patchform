import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioContext, SynthEngine } from "@/lib/synth/engine";
import { KEY_INTERVAL, octaveToMidiC } from "@/lib/synth/notes";
import { DEFAULT_PATCH } from "@/lib/synth/presets";
import type { Patch } from "@/lib/synth/types";
import { useMidi } from "@/lib/synth/use-midi";

const STORAGE_KEY = "patchform-v1";
const MIN_OCTAVE = 1;
const MAX_OCTAVE = 6;

type AudioStatus = "off" | "running" | "suspended";

type Stored = {
  patch: Patch;
  octave: number;
  volume: number;
};

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { patch: DEFAULT_PATCH, octave: 3, volume: 0.75 };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      patch: parsed.patch ?? DEFAULT_PATCH,
      octave: Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, parsed.octave ?? 3)),
      volume: Math.min(1, Math.max(0, parsed.volume ?? 0.75)),
    };
  } catch {
    return { patch: DEFAULT_PATCH, octave: 3, volume: 0.75 };
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useSynth() {
  const engineRef = useRef<SynthEngine | null>(null);
  const patchRef = useRef<Patch>(DEFAULT_PATCH);
  const octaveRef = useRef(3);
  const heldRef = useRef(new Set<number>());
  const computerHeld = useRef(new Set<string>());

  const [status, setStatus] = useState<AudioStatus>("off");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [patch, setPatchState] = useState<Patch>(DEFAULT_PATCH);
  const [octave, setOctaveState] = useState(3);
  const [volume, setVolumeState] = useState(0.75);
  const [muted, setMutedState] = useState(false);
  const [held, setHeld] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStored();
    patchRef.current = stored.patch;
    octaveRef.current = stored.octave;
    setPatchState(stored.patch);
    setOctaveState(stored.octave);
    setVolumeState(stored.volume);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ patch, octave, volume } satisfies Stored),
      );
    } catch {
      /* ignore quota */
    }
  }, [patch, octave, volume, hydrated]);

  const syncHeld = useCallback(() => {
    setHeld([...heldRef.current]);
  }, []);

  const soundOn = useCallback(
    (midi: number, velocity = 1) => {
      engineRef.current?.noteOn(midi, velocity);
      heldRef.current.add(midi);
      syncHeld();
    },
    [syncHeld],
  );

  const soundOff = useCallback(
    (midi: number) => {
      engineRef.current?.noteOff(midi);
      heldRef.current.delete(midi);
      syncHeld();
    },
    [syncHeld],
  );

  const allOff = useCallback(() => {
    engineRef.current?.allOff();
    heldRef.current.clear();
    computerHeld.current.clear();
    syncHeld();
  }, [syncHeld]);

  const enable = useCallback(async () => {
    if (!engineRef.current) {
      const ctx = createAudioContext();
      const engine = new SynthEngine(ctx, patchRef.current);
      engine.setVolume(volume);
      engine.setMuted(muted);
      engineRef.current = engine;
      setAnalyser(engine.getAnalyser());
      ctx.addEventListener("statechange", () => {
        setStatus(ctx.state === "running" ? "running" : "suspended");
      });
    }
    await engineRef.current.resume();
    setStatus(engineRef.current.getState() === "running" ? "running" : "suspended");
  }, [muted, volume]);

  useEffect(() => {
    const resume = () => {
      const engine = engineRef.current;
      if (!engine) return;
      void engine.resume().then(() => {
        setStatus(engine.getState() === "running" ? "running" : "suspended");
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resume();
    };
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisible);
    const tick = window.setInterval(resume, 2000);
    return () => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(tick);
    };
  }, []);

  const setPatch = useCallback((next: Patch) => {
    patchRef.current = next;
    setPatchState(next);
    engineRef.current?.setPatch(next);
  }, []);

  const updatePatch = useCallback((partial: Partial<Patch>) => {
    const next = { ...patchRef.current, ...partial };
    patchRef.current = next;
    setPatchState(next);
    engineRef.current?.setPatch(next);
  }, []);

  const setVolume = useCallback((next: number) => {
    setVolumeState(next);
    engineRef.current?.setVolume(next);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    engineRef.current?.setMuted(next);
  }, []);

  const setPitchBend = useCallback((norm: number) => {
    engineRef.current?.setPitchBend(norm);
  }, []);

  const midi = useMidi({
    noteOn: soundOn,
    noteOff: soundOff,
    allOff,
    enableAudio: () => {
      void enable();
    },
    setVolume,
    setCutoff: (hz) => updatePatch({ cutoff: hz }),
    setResonance: (q) => updatePatch({ resonance: q }),
    setPitchBend,
  });

  const setOctave = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, next));
      allOff();
      midi.clearPedal();
      octaveRef.current = clamped;
      setOctaveState(clamped);
    },
    [allOff, midi.clearPedal],
  );

  const noteOn = useCallback(
    (midiNote: number, velocity = 1) => {
      soundOn(midiNote, velocity);
      midi.emitNoteOn(midiNote, Math.round(Math.min(127, Math.max(1, velocity * 127))));
    },
    [midi.emitNoteOn, soundOn],
  );

  const noteOff = useCallback(
    (midiNote: number) => {
      soundOff(midiNote);
      midi.emitNoteOff(midiNote);
    },
    [midi.emitNoteOff, soundOff],
  );

  const panic = useCallback(() => {
    midi.panic();
  }, [midi.panic]);

  const preview = useCallback((midiNote?: number) => {
    const note = midiNote ?? octaveToMidiC(octaveRef.current) + 12;
    engineRef.current?.preview(note);
  }, []);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.code === "Space") {
        event.preventDefault();
        panic();
        return;
      }
      if (event.code === "Minus" || event.code === "BracketLeft") {
        event.preventDefault();
        setOctave(octaveRef.current - 1);
        return;
      }
      if (event.code === "Equal" || event.code === "BracketRight") {
        event.preventDefault();
        setOctave(octaveRef.current + 1);
        return;
      }

      const interval = KEY_INTERVAL[event.code];
      if (interval === undefined) return;
      event.preventDefault();
      if (computerHeld.current.has(event.code)) return;
      computerHeld.current.add(event.code);
      void enable();
      noteOn(octaveToMidiC(octaveRef.current) + interval);
    };

    const onUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) && !computerHeld.current.has(event.code)) return;
      const interval = KEY_INTERVAL[event.code];
      if (interval === undefined) return;
      computerHeld.current.delete(event.code);
      noteOff(octaveToMidiC(octaveRef.current) + interval);
    };

    const liftComputerKeys = () => {
      for (const code of [...computerHeld.current]) {
        const interval = KEY_INTERVAL[code];
        if (interval === undefined) continue;
        noteOff(octaveToMidiC(octaveRef.current) + interval);
      }
      computerHeld.current.clear();
    };

    const onBlur = () => liftComputerKeys();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") liftComputerKeys();
      else if (engineRef.current) void engineRef.current.resume();
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enable, noteOff, noteOn, panic, setOctave]);

  return {
    status,
    analyser,
    patch,
    octave,
    volume,
    muted,
    held,
    minOctave: MIN_OCTAVE,
    maxOctave: MAX_OCTAVE,
    midi,
    enable,
    noteOn,
    noteOff,
    allOff: panic,
    setPatch,
    updatePatch,
    setOctave,
    setVolume,
    setMuted,
    preview,
  };
}

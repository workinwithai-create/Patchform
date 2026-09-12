import { useCallback, useEffect, useRef, useState } from "react";
import {
  CC,
  MIDI_EVENT,
  listPorts,
  logMap,
  midiSupported,
  parseMidi,
  sendNoteOff,
  sendNoteOn,
  velocityGain,
  type MidiMessage,
} from "@/lib/synth/midi";

export type MidiStatus = "unsupported" | "idle" | "denied" | "on";

export type MidiPortInfo = { id: string; name: string };

type UseMidiOpts = {
  noteOn: (midi: number, velocity: number) => void;
  noteOff: (midi: number) => void;
  allOff: () => void;
  enableAudio: () => void;
  setVolume: (value: number) => void;
  setCutoff: (hz: number) => void;
  setResonance: (q: number) => void;
  setPitchBend: (norm: number) => void;
};

const PREF_KEY = "patchform-midi-v1";

type Prefs = {
  inputId: string;
  outputId: string;
  channel: number;
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { inputId: "all", outputId: "none", channel: 0 };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      inputId: parsed.inputId ?? "all",
      outputId: parsed.outputId ?? "none",
      channel: Math.min(16, Math.max(0, parsed.channel ?? 0)),
    };
  } catch {
    return { inputId: "all", outputId: "none", channel: 0 };
  }
}

export function useMidi(opts: UseMidiOpts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const accessRef = useRef<MIDIAccess | null>(null);
  const outputRef = useRef<MIDIOutput | null>(null);
  const sustainDown = useRef(false);
  const sustained = useRef(new Set<number>());
  const incomingHeld = useRef(new Set<number>());

  const [status, setStatus] = useState<MidiStatus>("idle");
  const [inputs, setInputs] = useState<MidiPortInfo[]>([]);
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([]);
  const [inputId, setInputId] = useState("all");
  const [outputId, setOutputId] = useState("none");
  const [channel, setChannel] = useState(0);
  const [activity, setActivity] = useState(false);
  const [sustain, setSustain] = useState(false);
  const activityTimer = useRef<number>(0);
  const inputIdRef = useRef("all");

  const pulse = useCallback(() => {
    setActivity(true);
    window.clearTimeout(activityTimer.current);
    activityTimer.current = window.setTimeout(() => setActivity(false), 120);
  }, []);

  useEffect(() => {
    if (!midiSupported()) setStatus("unsupported");
  }, []);

  const channelOk = useCallback(
    (msgChannel: number) => channel === 0 || msgChannel === channel,
    [channel],
  );

  const handle = useCallback(
    (data: Uint8Array) => {
      const msg: MidiMessage | null = parseMidi(data);
      if (!msg) return;
      if (!channelOk(msg.channel)) return;
      pulse();
      const api = optsRef.current;
      void api.enableAudio();

      if (msg.type === "noteon") {
        incomingHeld.current.add(msg.note);
        sustained.current.delete(msg.note);
        api.noteOn(msg.note, velocityGain(msg.velocity));
        return;
      }
      if (msg.type === "noteoff") {
        incomingHeld.current.delete(msg.note);
        if (sustainDown.current) {
          sustained.current.add(msg.note);
          return;
        }
        api.noteOff(msg.note);
        return;
      }
      if (msg.type === "pitchbend") {
        api.setPitchBend(msg.value);
        return;
      }
      if (msg.type === "cc") {
        if (msg.controller === CC.sustain) {
          const down = msg.value >= 64;
          sustainDown.current = down;
          setSustain(down);
          if (!down) {
            for (const note of sustained.current) {
              if (!incomingHeld.current.has(note)) api.noteOff(note);
            }
            sustained.current.clear();
          }
          return;
        }
        if (msg.controller === CC.volume || msg.controller === CC.expression) {
          api.setVolume(msg.value / 127);
          return;
        }
        if (msg.controller === CC.cutoff) {
          api.setCutoff(logMap(msg.value, 80, 12000));
          return;
        }
        if (msg.controller === CC.resonance) {
          api.setResonance(0.1 + (msg.value / 127) * 15.9);
        }
      }
    },
    [channelOk, pulse],
  );

  const refreshPorts = useCallback((access: MIDIAccess) => {
    setInputs(listPorts(access.inputs));
    setOutputs(listPorts(access.outputs));
    const prefs = loadPrefs();
    const out =
      prefs.outputId === "none"
        ? null
        : [...access.outputs.values()].find((port) => port.id === prefs.outputId) ?? null;
    outputRef.current = out ?? null;
  }, []);

  const attachInputs = useCallback(
    (access: MIDIAccess, selected: string) => {
      access.inputs.forEach((input) => {
        input.onmidimessage = (event: MIDIMessageEvent) => {
          if (selected !== "all" && input.id !== selected) return;
          const data = event.data;
          if (!data) return;
          handle(data instanceof Uint8Array ? data : new Uint8Array(data));
        };
      });
    },
    [handle],
  );

  const connect = useCallback(async () => {
    if (!midiSupported()) {
      setStatus("unsupported");
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      const prefs = loadPrefs();
      setInputId(prefs.inputId);
      setOutputId(prefs.outputId);
      setChannel(prefs.channel);
      refreshPorts(access);
      attachInputs(access, prefs.inputId);
      access.onstatechange = () => {
        const current = accessRef.current;
        if (!current) return;
        refreshPorts(current);
        attachInputs(current, inputIdRef.current);
      };
      setStatus("on");
    } catch {
      setStatus("denied");
    }
  }, [attachInputs, refreshPorts]);

  useEffect(() => {
    const access = accessRef.current;
    if (!access || status !== "on") return;
    inputIdRef.current = inputId;
    attachInputs(access, inputId);
    try {
      localStorage.setItem(
        PREF_KEY,
        JSON.stringify({ inputId, outputId, channel } satisfies Prefs),
      );
    } catch {
      /* ignore */
    }
    const out =
      outputId === "none"
        ? null
        : [...access.outputs.values()].find((port) => port.id === outputId) ?? null;
    outputRef.current = out;
  }, [attachInputs, channel, inputId, outputId, status]);

  useEffect(() => {
    const onInject = (event: Event) => {
      const detail = (event as CustomEvent<number[]>).detail;
      if (!Array.isArray(detail)) return;
      handle(Uint8Array.from(detail));
    };
    window.addEventListener(MIDI_EVENT, onInject);
    return () => window.removeEventListener(MIDI_EVENT, onInject);
  }, [handle]);

  useEffect(() => {
    return () => window.clearTimeout(activityTimer.current);
  }, []);

  const emitNoteOn = useCallback((note: number, velocity = 100) => {
    const out = outputRef.current;
    if (!out) return;
    const ch = channel === 0 ? 1 : channel;
    try {
      sendNoteOn(out, ch, note, velocity);
    } catch {
      /* port closed */
    }
  }, [channel]);

  const emitNoteOff = useCallback(
    (note: number) => {
      const out = outputRef.current;
      if (!out) return;
      const ch = channel === 0 ? 1 : channel;
      try {
        sendNoteOff(out, ch, note);
      } catch {
        /* port closed */
      }
    },
    [channel],
  );

  const clearPedal = useCallback(() => {
    sustainDown.current = false;
    setSustain(false);
    sustained.current.clear();
    incomingHeld.current.clear();
  }, []);

  const panic = useCallback(() => {
    clearPedal();
    optsRef.current.allOff();
    optsRef.current.setPitchBend(0);
  }, [clearPedal]);

  return {
    status,
    inputs,
    outputs,
    inputId,
    outputId,
    channel,
    activity,
    sustain,
    supported: status !== "unsupported",
    connect,
    setInputId,
    setOutputId,
    setChannel,
    emitNoteOn,
    emitNoteOff,
    panic,
    clearPedal,
  };
}

export type MidiApi = ReturnType<typeof useMidi>;

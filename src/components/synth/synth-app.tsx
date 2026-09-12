import { ChevronLeft, ChevronRight, Power, Volume2, VolumeX } from "lucide-react";
import { Keyboard } from "@/components/synth/keyboard";
import { Knob } from "@/components/synth/knob";
import { MidiBar } from "@/components/synth/midi-bar";
import { Oscilloscope } from "@/components/synth/oscilloscope";
import { PatchCrafter } from "@/components/synth/patch-crafter";
import { WaveformSelect } from "@/components/synth/waveform-select";
import { Button } from "@/components/ui/button";
import { midiToName, octaveToMidiC } from "@/lib/synth/notes";
import { DEFAULT_PATCH } from "@/lib/synth/presets";
import { useSynth } from "@/lib/synth/use-synth";

function formatHz(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
}

function formatSec(value: number) {
  return value < 1 ? `${Math.round(value * 1000)}ms` : `${value.toFixed(2)}s`;
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function SynthApp() {
  const synth = useSynth();
  const live = synth.status === "running";
  const startMidi = octaveToMidiC(synth.octave);
  const lastHeld = synth.held[synth.held.length - 1];

  const playKey = async (midi: number) => {
    await synth.enable();
    synth.noteOn(midi);
  };

  return (
    <div className="grid h-dvh min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Patchform
          </h1>
          <p className="hidden text-sm text-muted md:block">Describe an instrument. Play it.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden font-mono text-2xs uppercase tracking-widest text-faint sm:inline">
            PF-01
          </span>
          <Button
            type="button"
            size="sm"
            variant={live ? "secondary" : "primary"}
            onClick={() => {
              void synth.enable();
              void synth.midi.connect();
            }}
            aria-pressed={live}
          >
            <Power className="size-4" aria-hidden="true" />
            {synth.status === "off"
              ? "Enable audio"
              : synth.status === "suspended"
                ? "Resume"
                : "Live"}
          </Button>
        </div>
      </header>

      <main className="min-h-0 min-w-0 overflow-y-auto px-4 py-3 md:px-6">
        <div className="flex flex-col gap-5">
        <PatchCrafter
          patch={synth.patch}
          live={live}
          onPatch={synth.setPatch}
          onPreview={() => synth.preview()}
        />

        <div className="flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-border md:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-medium tracking-tight">{synth.patch.name}</p>
              <p className="max-w-xl text-sm text-muted">{synth.patch.description}</p>
            </div>
            <p className="font-mono text-sm tabular-nums text-faint">
              {lastHeld !== undefined ? midiToName(lastHeld) : "—"}
            </p>
          </div>
          <div className="flex items-stretch gap-3">
            <Oscilloscope analyser={synth.analyser} live={live} />
            <Knob
              label="Volume"
              value={synth.volume}
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.75}
              format={formatPct}
              onChange={synth.setVolume}
            />
          </div>
          <WaveformSelect
            waveform={synth.patch.waveform}
            filterType={synth.patch.filterType}
            onWaveform={(waveform) => synth.updatePatch({ waveform })}
            onFilterType={(filterType) => synth.updatePatch({ filterType })}
          />
        </div>

        <div className="flex flex-col gap-5 rounded-xl bg-surface p-3 shadow-border md:p-4">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 md:justify-between">
            <Knob
              label="Cutoff"
              value={synth.patch.cutoff}
              min={80}
              max={12000}
              curve="log"
              defaultValue={DEFAULT_PATCH.cutoff}
              format={formatHz}
              onChange={(cutoff) => synth.updatePatch({ cutoff })}
            />
            <Knob
              label="Reso"
              value={synth.patch.resonance}
              min={0.1}
              max={16}
              step={0.1}
              defaultValue={DEFAULT_PATCH.resonance}
              format={(v) => v.toFixed(1)}
              onChange={(resonance) => synth.updatePatch({ resonance })}
            />
            <Knob
              label="Attack"
              value={synth.patch.attack}
              min={0.005}
              max={2}
              curve="log"
              defaultValue={DEFAULT_PATCH.attack}
              format={formatSec}
              onChange={(attack) => synth.updatePatch({ attack })}
            />
            <Knob
              label="Decay"
              value={synth.patch.decay}
              min={0.02}
              max={2}
              curve="log"
              defaultValue={DEFAULT_PATCH.decay}
              format={formatSec}
              onChange={(decay) => synth.updatePatch({ decay })}
            />
            <Knob
              label="Sustain"
              value={synth.patch.sustain}
              min={0}
              max={1}
              step={0.01}
              defaultValue={DEFAULT_PATCH.sustain}
              format={formatPct}
              onChange={(sustain) => synth.updatePatch({ sustain })}
            />
            <Knob
              label="Release"
              value={synth.patch.release}
              min={0.03}
              max={4}
              curve="log"
              defaultValue={DEFAULT_PATCH.release}
              format={formatSec}
              onChange={(release) => synth.updatePatch({ release })}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 md:justify-between">
            <Knob
              label="Flt env"
              value={synth.patch.filterEnv}
              min={-1}
              max={1}
              step={0.01}
              defaultValue={DEFAULT_PATCH.filterEnv}
              format={(v) => v.toFixed(2)}
              onChange={(filterEnv) => synth.updatePatch({ filterEnv })}
            />
            <Knob
              label="Detune"
              value={synth.patch.detune}
              min={0}
              max={40}
              step={0.5}
              defaultValue={DEFAULT_PATCH.detune}
              format={(v) => `${Math.round(v)}¢`}
              onChange={(detune) => synth.updatePatch({ detune })}
            />
            <Knob
              label="Osc 2"
              value={synth.patch.osc2Mix}
              min={0}
              max={1}
              step={0.01}
              defaultValue={DEFAULT_PATCH.osc2Mix}
              format={formatPct}
              onChange={(osc2Mix) => synth.updatePatch({ osc2Mix })}
            />
            <Knob
              label="Sub"
              value={synth.patch.subMix}
              min={0}
              max={1}
              step={0.01}
              defaultValue={DEFAULT_PATCH.subMix}
              format={formatPct}
              onChange={(subMix) => synth.updatePatch({ subMix })}
            />
            <Knob
              label="Noise"
              value={synth.patch.noiseMix}
              min={0}
              max={1}
              step={0.01}
              defaultValue={DEFAULT_PATCH.noiseMix}
              format={formatPct}
              onChange={(noiseMix) => synth.updatePatch({ noiseMix })}
            />
          </div>
        </div>
        </div>
      </main>

      <footer className="dock bg-bg px-3 pt-1 md:px-5">
        <div className="overflow-hidden rounded-xl bg-surface p-2 shadow-border">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Octave down"
                onClick={() => synth.setOctave(synth.octave - 1)}
                disabled={synth.octave <= synth.minOctave}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <p className="min-w-24 text-center font-mono text-sm tabular-nums text-muted">
                Oct {synth.octave}
                <span className="text-faint"> · {midiToName(startMidi)}</span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label="Octave up"
                onClick={() => synth.setOctave(synth.octave + 1)}
                disabled={synth.octave >= synth.maxOctave}
              >
                <ChevronRight className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={synth.muted ? "Unmute" : "Mute"}
                onClick={() => synth.setMuted(!synth.muted)}
              >
                {synth.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </Button>
            </div>
            <div className="flex min-w-0 flex-col items-end gap-1">
              <MidiBar midi={synth.midi} />
              <p className="hidden text-xs text-faint md:block">
                Computer: Z–M and Q–P · [ ] octave · space silence
              </p>
            </div>
          </div>
          <Keyboard
            startMidi={startMidi}
            held={synth.held}
            onDown={(midi) => void playKey(midi)}
            onUp={synth.noteOff}
          />
        </div>
      </footer>
    </div>
  );
}

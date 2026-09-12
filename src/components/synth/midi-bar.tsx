import { Cable } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MidiApi } from "@/lib/synth/use-midi";
import { cn } from "@/lib/utils";

type MidiBarProps = {
  midi: MidiApi;
};

function statusLabel(midi: MidiApi): string {
  if (midi.status === "unsupported") return "Not supported";
  if (midi.status === "denied") return "Permission blocked";
  if (midi.status === "idle") return "Off";
  if (midi.inputs.length === 0) return "No devices";
  if (midi.inputId === "all") {
    return midi.inputs.length === 1
      ? midi.inputs[0]!.name
      : `${midi.inputs.length} inputs`;
  }
  return midi.inputs.find((port) => port.id === midi.inputId)?.name ?? "Input";
}

export function MidiBar({ midi }: MidiBarProps) {
  const live = midi.status === "on";

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={live ? "secondary" : "ghost"}
        size="sm"
        className="shrink-0"
        onClick={() => void midi.connect()}
        disabled={midi.status === "unsupported"}
        aria-pressed={live}
      >
        <span
          className={cn(
            "size-1.5 rounded-full bg-faint",
            live && midi.activity && "bg-accent",
            live && !midi.activity && "bg-accent-dim",
          )}
          aria-hidden="true"
        />
        <Cable className="size-4" aria-hidden="true" />
        MIDI
      </Button>
      <p className="min-w-0 truncate font-mono text-2xs text-faint">
        {statusLabel(midi)}
        {midi.sustain ? " · sustain" : ""}
      </p>
      {live ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="midi-in">
            MIDI input
          </label>
          <select
            id="midi-in"
            className="midi-select"
            value={midi.inputId}
            onChange={(event) => midi.setInputId(event.target.value)}
          >
            <option value="all">All inputs</option>
            {midi.inputs.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="midi-out">
            MIDI output
          </label>
          <select
            id="midi-out"
            className="midi-select"
            value={midi.outputId}
            onChange={(event) => midi.setOutputId(event.target.value)}
          >
            <option value="none">Out off</option>
            {midi.outputs.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="midi-ch">
            MIDI channel
          </label>
          <select
            id="midi-ch"
            className="midi-select"
            value={midi.channel}
            onChange={(event) => midi.setChannel(Number(event.target.value))}
          >
            <option value={0}>Ch Omni</option>
            {Array.from({ length: 16 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Ch {i + 1}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

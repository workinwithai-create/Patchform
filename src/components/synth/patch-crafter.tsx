import { useState, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { craftPatch } from "@/lib/craft-patch";
import { PRESETS } from "@/lib/synth/presets";
import type { Patch } from "@/lib/synth/types";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "warm analog pad like a Juno",
  "plucky harp",
  "acid bass",
  "glass bell",
  "breathy flute",
];

type PatchCrafterProps = {
  patch: Patch;
  onPatch: (patch: Patch) => void;
  onPreview: () => void;
  live: boolean;
  locked?: boolean;
  needsKey?: boolean;
  apiKey?: string;
};

export function PatchCrafter({
  patch,
  onPatch,
  onPreview,
  live,
  locked = false,
  needsKey = false,
  apiKey = "",
}: PatchCrafterProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (text: string) => {
    const description = text.trim();
    if (description.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await craftPatch({
        data: { prompt: description, apiKey: needsKey ? apiKey : undefined },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onPatch(result.patch);
      if (live) onPreview();
    } catch {
      setError("Could not reach the designer. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(prompt);
  };

  return (
    <section className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="instrument-prompt">
          Describe an instrument
        </label>
        <input
          id="instrument-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={400}
          placeholder="Describe an instrument — rusty Rhodes, distant choir, rubber bass…"
          className="h-11 min-w-0 flex-1 rounded-md bg-surface-2 px-3.5 text-base text-fg shadow-border placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        />
        <Button
          type="submit"
          disabled={locked || needsKey || loading || prompt.trim().length < 2}
          className="shrink-0"
        >
          <Wand2 className="size-4" aria-hidden="true" />
          {loading ? "Designing…" : "Craft patch"}
        </Button>
      </form>
      {locked ? (
        <p className="text-sm text-muted">Designer unlocks with Patchform lifetime or the Forge Pass.</p>
      ) : needsKey ? (
        <p className="text-sm text-muted">Paste your xAI key above to craft.</p>
      ) : null}
      <div className="flex max-w-full gap-2 overflow-x-auto pb-0.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="chip"
            disabled={locked || needsKey || loading}
            onClick={() => {
              setPrompt(example);
              void submit(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-col gap-2">
        <p className="text-micro font-medium uppercase tracking-widest text-faint">Factory</p>
        <div className="flex max-w-full gap-2 overflow-x-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={cn("chip", patch.name === preset.name && "is-on")}
              onClick={() => {
                onPatch(preset);
                if (live) onPreview();
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

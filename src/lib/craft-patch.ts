import { createServerFn } from "@tanstack/react-start";
import { sanitizePatch, type Patch } from "@/lib/synth/types";

const SYSTEM = `You design analog-style synthesizer patches. Return ONLY a JSON object, no markdown, matching:
{"name":"2-4 words","description":"one sentence","waveform":"sine|square|sawtooth|triangle","detune":0-50,"osc2Mix":0-1,"subMix":0-1,"noiseMix":0-1,"cutoff":80-12000,"resonance":0.2-16,"filterType":"lowpass|highpass|bandpass","filterEnv":-1-1,"attack":0.005-2,"decay":0.02-2,"sustain":0-1,"release":0.03-4}

Map the description to real subtractive-synth technique:
- pads/strings: slow attack+release, low-mid cutoff, detune+osc2
- bass/sub: saw or square, low cutoff, subMix high, short attack
- pluck/harp/guitar: very short attack, low sustain, strong filterEnv, fast decay
- bells/keys: sine, long release, some detune
- organ: square, instant attack, high sustain, high cutoff
- brass/lead: saw, medium attack, filterEnv
- acid: square/saw, high resonance, low cutoff, high filterEnv
- snare/hat/wind: noiseMix high, short decay, bandpass or highpass
Keep numbers realistic. Do not include extra keys.`;

type CraftResult =
  | { ok: true; patch: Patch }
  | { ok: false; error: string };

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in response");
  return JSON.parse(body.slice(start, end + 1));
}

export const craftPatch = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (typeof input !== "object" || input === null) {
      throw new Error("Invalid input");
    }
    const prompt = (input as { prompt?: unknown }).prompt;
    if (typeof prompt !== "string") throw new Error("Describe an instrument first");
    const trimmed = prompt.trim().slice(0, 400);
    if (trimmed.length < 2) throw new Error("Describe an instrument first");
    const rawKey = (input as { apiKey?: unknown }).apiKey;
    const apiKey =
      typeof rawKey === "string" && rawKey.trim().startsWith("xai-") && rawKey.trim().length >= 20
        ? rawKey.trim().slice(0, 200)
        : undefined;
    return { prompt: trimmed, apiKey };
  })
  .handler(async ({ data }): Promise<CraftResult> => {
    const apiKey = data.apiKey || process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "Add your xAI API key, or unlock with the Forge Pass.",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.7,
          max_tokens: 350,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: data.prompt },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Designer failed (${res.status}). Try again.` };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      const parsed = extractJson(text) as Partial<Patch>;
      const patch = sanitizePatch(parsed);
      return { ok: true, patch };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { ok: false, error: "Designer timed out. Try a shorter description." };
      }
      return { ok: false, error: "Could not read the patch. Try again." };
    } finally {
      clearTimeout(timer);
    }
  });

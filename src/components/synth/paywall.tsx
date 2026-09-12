import { Button } from "@/components/ui/button";
import { hubLoginUrl, looksLikeXaiKey, startCheckout } from "@/lib/license";
import type { LicensePlan } from "@/lib/license";
import { cn } from "@/lib/utils";

type PaywallProps = {
  checking: boolean;
  entitled: boolean;
  signedIn: boolean;
  plan: LicensePlan;
  email: string | null;
  loginUrl: string;
  apiKey: string;
  onApiKey: (value: string) => void;
  error: string | null;
};

export function Paywall({
  checking,
  entitled,
  signedIn,
  plan,
  email,
  loginUrl,
  apiKey,
  onApiKey,
  error,
}: PaywallProps) {
  if (plan === "preview") {
    return (
      <p className="rounded-xl bg-surface px-4 py-3 text-sm text-muted shadow-border">
        Preview — the live site is paywalled: <span className="text-fg">$200 lifetime (your xAI key)</span> or the{" "}
        <span className="text-fg">Forge Pass</span>.
      </p>
    );
  }

  if (checking) {
    return (
      <div className="h-24 animate-pulse rounded-xl bg-surface shadow-border" aria-hidden="true" />
    );
  }

  if (entitled && plan === "pass") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-border">
        <p className="text-sm text-muted">
          <span className="font-medium text-accent">Forge Pass</span>
          {email ? ` · ${email}` : ""} — Patchform and the designer are included.
        </p>
        <a className="text-xs text-faint underline-offset-4 hover:text-muted hover:underline" href="https://workinwithai.com/#pricing">
          Manage
        </a>
      </div>
    );
  }

  if (entitled && plan === "lifetime") {
    const ok = looksLikeXaiKey(apiKey);
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-border">
        <p className="text-sm text-muted">
          <span className="font-medium text-accent">Patchform lifetime</span>
          {email ? ` · ${email}` : ""} — paste your xAI API key to craft instruments.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-2xs uppercase tracking-widest text-faint">xAI API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => onApiKey(event.target.value)}
            placeholder="xai-…"
            className="h-11 rounded-md bg-surface-2 px-3.5 font-mono text-sm text-fg shadow-border placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          />
        </label>
        <p className={cn("text-xs", ok ? "text-muted" : "text-faint")}>
          {ok
            ? "Key stays in this browser. Craft calls xAI as you."
            : "Get a key at console.x.ai. It never leaves this device except to xAI."}
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl bg-surface p-4 shadow-border md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">Unlock Patchform</h2>
        <p className="max-w-2xl text-sm text-muted">
          Keys and factory patches play free. MIDI and the instrument designer need a license —
          a one-time buy with your own API, or the whole Forge line.
        </p>
      </div>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4 shadow-border">
          <p className="font-mono text-2xs uppercase tracking-widest text-faint">Lifetime</p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            $200 <span className="text-base font-medium text-muted">once</span>
          </p>
          <p className="text-sm text-muted">Yours forever. You bring an xAI API key for the designer.</p>
          <Button
            type="button"
            onClick={() => {
              if (!signedIn) globalThis.location.href = loginUrl || hubLoginUrl();
              else void startCheckout("patch-lifetime");
            }}
          >
            {signedIn ? "Buy Patchform" : "Sign in to buy"}
          </Button>
        </article>
        <article className="flex flex-col gap-3 rounded-lg bg-surface-2 p-4 shadow-border">
          <p className="font-mono text-2xs uppercase tracking-widest text-faint">Forge Pass</p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            $24 <span className="text-base font-medium text-muted">/ mo</span>
          </p>
          <p className="text-sm text-muted">
            AuraMix, Mix Forge, Release Forge, LRC Forge, Patchform — designer included.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!signedIn) globalThis.location.href = loginUrl || hubLoginUrl();
              else void startCheckout("forge-pass-monthly");
            }}
          >
            {signedIn ? "Get the Pass" : "Sign in for the Pass"}
          </Button>
        </article>
      </div>
      <p className="mt-3 text-xs text-faint">
        Same WorkinWithAI login as the rest of the Forge.{" "}
        <a className="underline-offset-4 hover:text-muted hover:underline" href="https://workinwithai.com/#pricing">
          See the family
        </a>
      </p>
    </section>
  );
}

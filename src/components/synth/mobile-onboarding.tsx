import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INSTALL_PATH,
  markMobileOnboarded,
  onboardingSteps,
  readDeviceProfile,
  shouldShowMobileOnboarding,
} from "@/lib/mobile-onboarding";

export function MobileOnboarding() {
  const [open, setOpen] = useState(false);
  const profile = useMemo(() => readDeviceProfile(), []);
  const steps = useMemo(() => onboardingSteps(profile), [profile]);

  useEffect(() => {
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    setOpen(shouldShowMobileOnboarding(profile, storage));
  }, [profile]);

  if (!open) return null;

  const dismiss = () => {
    markMobileOnboarded(typeof localStorage === "undefined" ? null : localStorage);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-onboard-title"
    >
      <section className="w-full max-w-md rounded-xl bg-surface p-5 shadow-border">
        <p className="font-mono text-2xs uppercase tracking-widest text-faint">First run</p>
        <h2 id="mobile-onboard-title" className="mt-1 font-display text-xl font-semibold tracking-tight">
          Phone first
        </h2>
        <p className="mt-1 text-sm text-muted">
          Keys and factory patches play in the browser. MIDI and the designer stay licensed.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={step.id} className="rounded-lg bg-surface-2 p-3 shadow-border">
              <p className="font-mono text-2xs uppercase tracking-widest text-faint">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
              {step.id === "homescreen" ? (
                <a
                  className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline"
                  href={INSTALL_PATH}
                >
                  Open Home Screen steps
                </a>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" onClick={dismiss}>
            Play the keys
          </Button>
          <p className="text-xs text-faint">
            This stays dismissed on this device. Safari still needs Enable audio after every reload.
          </p>
        </div>
      </section>
    </div>
  );
}

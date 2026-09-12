export const MOBILE_ONBOARDING_KEY = "patchform-mobile-onboarded-v1";
export const INSTALL_PATH = "/__grok/install/";

export type DeviceProfile = {
  mobile: boolean;
  standalone: boolean;
  ios: boolean;
  android: boolean;
};

export type NavigatorLike = {
  userAgent?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
};

export type WindowLike = {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: NavigatorLike;
};

export function readDeviceProfile(
  win: WindowLike | undefined = typeof globalThis === "object" ? globalThis : undefined,
): DeviceProfile {
  const nav = win?.navigator ?? {};
  const ua = nav.userAgent ?? "";
  const touch = nav.maxTouchPoints ?? 0;
  const ios =
    /iPhone|iPod|iPad/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1);
  const android = /Android/i.test(ua);
  const coarse = Boolean(win?.matchMedia?.("(pointer: coarse)")?.matches);
  const narrow = Boolean(win?.matchMedia?.("(max-width: 720px)")?.matches);
  const standalone =
    Boolean(nav.standalone) ||
    Boolean(win?.matchMedia?.("(display-mode: standalone)")?.matches);
  const mobile = ios || android || ((coarse || touch > 0) && narrow);
  return { mobile, standalone, ios, android };
}

export function shouldShowMobileOnboarding(
  profile: DeviceProfile,
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  if (!profile.mobile) return false;
  try {
    return storage?.getItem(MOBILE_ONBOARDING_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markMobileOnboarded(storage: Pick<Storage, "setItem"> | null) {
  try {
    storage?.setItem(MOBILE_ONBOARDING_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

export type OnboardingStep = {
  id: "audio" | "keys" | "homescreen";
  title: string;
  body: string;
};

export function onboardingSteps(profile: DeviceProfile): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    {
      id: "audio",
      title: "Enable audio",
      body: profile.ios
        ? "iPhone and iPad mute Web Audio until you tap Enable audio. Do that first."
        : "Tap Enable audio once so the engine can start. Browsers block sound until a tap.",
    },
    {
      id: "keys",
      title: "Play the keys",
      body: "Factory patches play free. Hold a key on the dock. Slide across the bed to change notes.",
    },
  ];
  if (!profile.standalone) {
    steps.push({
      id: "homescreen",
      title: "Add to Home Screen",
      body: profile.ios
        ? "Share → Add to Home Screen so Patchform sits full-screen with the keyboard above the home indicator."
        : "Install Patchform from the browser menu so the keyboard stays above the system bar.",
    });
  }
  return steps;
}

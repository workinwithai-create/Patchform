import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MOBILE_ONBOARDING_KEY,
  markMobileOnboarded,
  onboardingSteps,
  readDeviceProfile,
  shouldShowMobileOnboarding,
  type DeviceProfile,
} from "./mobile-onboarding.ts";

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

function profile(partial?: Partial<DeviceProfile>): DeviceProfile {
  return {
    mobile: false,
    standalone: false,
    ios: false,
    android: false,
    ...partial,
  };
}

describe("readDeviceProfile", () => {
  it("treats iPhone UA as mobile iOS", () => {
    const next = readDeviceProfile({
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        maxTouchPoints: 5,
      },
    });
    assert.equal(next.mobile, true);
    assert.equal(next.ios, true);
    assert.equal(next.android, false);
  });

  it("treats iPadOS desktop-UA + touch as iOS", () => {
    const next = readDeviceProfile({
      navigator: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5,
      },
    });
    assert.equal(next.ios, true);
    assert.equal(next.mobile, true);
  });

  it("treats coarse+narrow Android as mobile", () => {
    const next = readDeviceProfile({
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
        maxTouchPoints: 5,
      },
      matchMedia: (query) => ({
        matches: query.includes("pointer: coarse") || query.includes("max-width"),
      }),
    });
    assert.equal(next.mobile, true);
    assert.equal(next.android, true);
  });

  it("does not treat a desktop pointer as mobile", () => {
    const next = readDeviceProfile({
      navigator: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128",
        maxTouchPoints: 0,
      },
      matchMedia: () => ({ matches: false }),
    });
    assert.equal(next.mobile, false);
    assert.equal(next.standalone, false);
  });

  it("detects standalone display mode", () => {
    const next = readDeviceProfile({
      navigator: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        maxTouchPoints: 5,
        standalone: true,
      },
      matchMedia: (query) => ({ matches: query.includes("standalone") }),
    });
    assert.equal(next.standalone, true);
  });
});

describe("shouldShowMobileOnboarding", () => {
  it("is false on desktop", () => {
    assert.equal(shouldShowMobileOnboarding(profile(), memoryStorage()), false);
  });

  it("is true on first mobile visit", () => {
    assert.equal(
      shouldShowMobileOnboarding(profile({ mobile: true }), memoryStorage()),
      true,
    );
  });

  it("is false after the tip is dismissed", () => {
    const storage = memoryStorage({ [MOBILE_ONBOARDING_KEY]: "1" });
    assert.equal(
      shouldShowMobileOnboarding(profile({ mobile: true }), storage),
      false,
    );
  });

  it("fails open when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(
      shouldShowMobileOnboarding(profile({ mobile: true }), storage),
      true,
    );
  });
});

describe("markMobileOnboarded", () => {
  it("writes the dismissed flag", () => {
    const storage = memoryStorage();
    markMobileOnboarded(storage);
    assert.equal(storage.map.get(MOBILE_ONBOARDING_KEY), "1");
  });
});

describe("onboardingSteps", () => {
  it("includes Home Screen on a browser iPhone", () => {
    const steps = onboardingSteps(profile({ mobile: true, ios: true }));
    assert.deepEqual(
      steps.map((step) => step.id),
      ["audio", "keys", "homescreen"],
    );
    assert.match(steps[0].body, /Enable audio/);
  });

  it("skips Home Screen when already installed", () => {
    const steps = onboardingSteps(
      profile({ mobile: true, ios: true, standalone: true }),
    );
    assert.deepEqual(
      steps.map((step) => step.id),
      ["audio", "keys"],
    );
  });
});

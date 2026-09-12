const HUB_ORIGIN = "https://workinwithai.com";
const ENTITLEMENTS_URL = `${HUB_ORIGIN}/api/entitlements/me`;
const CHECKOUT_URL = `${HUB_ORIGIN}/api/checkout`;
const XAI_KEY_STORAGE = "patchform-xai-key-v1";

export type LicensePlan = "none" | "lifetime" | "pass" | "preview";

export type LicenseStatus = {
  checking: boolean;
  entitled: boolean;
  signedIn: boolean;
  hasBundle: boolean;
  hasPatch: boolean;
  plan: LicensePlan;
  email: string | null;
  loginUrl: string;
  error: string | null;
};

export function isPaywallHost(hostname = globalThis.location?.hostname ?? ""): boolean {
  if (!hostname) return false;
  if (hostname === "patchform.vercel.app") return true;
  if (hostname === "patchform-release-forge.vercel.app") return true;
  if (hostname.endsWith(".workinwithai.com") && hostname.includes("patch")) return true;
  return hostname === "patchform.workinwithai.com";
}

export function returnToUrl(): string {
  try {
    if (isPaywallHost()) return `${globalThis.location.origin}/`;
  } catch {
    /* ignore */
  }
  return "https://patchform.vercel.app/";
}

export function hubLoginUrl(returnTo = returnToUrl()): string {
  const url = new URL(`${HUB_ORIGIN}/login`);
  url.searchParams.set("next", returnTo);
  url.searchParams.set("checkout", "patch-lifetime");
  url.searchParams.set("buy", "patch-lifetime");
  return url.toString();
}

export function emptyLicense(partial?: Partial<LicenseStatus>): LicenseStatus {
  return {
    checking: false,
    entitled: false,
    signedIn: false,
    hasBundle: false,
    hasPatch: false,
    plan: "none",
    email: null,
    loginUrl: hubLoginUrl(),
    error: null,
    ...partial,
  };
}

function planFromPayload(payload: {
  hasBundle?: boolean;
  hasPatch?: boolean;
  products?: unknown;
}): LicensePlan {
  if (payload.hasBundle) return "pass";
  const products = Array.isArray(payload.products)
    ? payload.products.map((item) => String(item))
    : [];
  if (payload.hasPatch || products.includes("patch")) return "lifetime";
  return "none";
}

export async function fetchLicense(): Promise<LicenseStatus> {
  if (!isPaywallHost()) {
    return emptyLicense({ entitled: true, plan: "preview" });
  }

  try {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 6000);
    const res = await fetch(ENTITLEMENTS_URL, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    globalThis.clearTimeout(timer);
    const payload = (await res.json().catch(() => null)) as {
      signedIn?: boolean;
      email?: string | null;
      hasBundle?: boolean;
      hasPatch?: boolean;
      products?: unknown;
      loginUrl?: string;
    } | null;
    if (!payload) return emptyLicense({ error: "Could not reach the Forge account." });

    const plan = planFromPayload(payload);
    const entitled = Boolean(payload.hasPatch || payload.hasBundle);
    return emptyLicense({
      signedIn: Boolean(payload.signedIn),
      entitled,
      hasBundle: Boolean(payload.hasBundle),
      hasPatch: Boolean(payload.hasPatch || entitled),
      plan: entitled ? plan : "none",
      email: payload.email ?? null,
      loginUrl: payload.loginUrl || hubLoginUrl(),
    });
  } catch {
    return emptyLicense({ error: "Could not reach the Forge account." });
  }
}

export async function startCheckout(lookupKey: "patch-lifetime" | "forge-pass-monthly") {
  const returnTo = returnToUrl();
  try {
    const res = await fetch(CHECKOUT_URL, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ lookupKey, returnTo }),
    });
    const payload = (await res.json().catch(() => null)) as {
      url?: string;
      loginUrl?: string;
      error?: string;
    } | null;
    if (res.status === 401) {
      globalThis.location.href = payload?.loginUrl || hubLoginUrl(returnTo);
      return;
    }
    if (payload?.url) {
      globalThis.location.href = payload.url;
      return;
    }
    globalThis.location.href = `${HUB_ORIGIN}/#pricing`;
  } catch {
    globalThis.location.href = `${HUB_ORIGIN}/#pricing`;
  }
}

export function readUserApiKey(): string {
  try {
    return localStorage.getItem(XAI_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function writeUserApiKey(value: string) {
  try {
    const trimmed = value.trim();
    if (trimmed) localStorage.setItem(XAI_KEY_STORAGE, trimmed);
    else localStorage.removeItem(XAI_KEY_STORAGE);
  } catch {
    /* ignore quota */
  }
}

export function looksLikeXaiKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("xai-") && trimmed.length >= 20;
}

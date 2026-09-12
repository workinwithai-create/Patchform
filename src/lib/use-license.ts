import { useCallback, useEffect, useState } from "react";
import {
  emptyLicense,
  fetchLicense,
  readUserApiKey,
  writeUserApiKey,
  type LicenseStatus,
} from "@/lib/license";

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus>(() =>
    emptyLicense({ checking: true }),
  );
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => {
    setApiKeyState(readUserApiKey());
    let cancelled = false;
    void fetchLicense().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    if (!params.get("purchased")) return;
    void fetchLicense().then(setStatus);
  }, []);

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    setStatus(await fetchLicense());
  }, []);

  const setApiKey = useCallback((value: string) => {
    setApiKeyState(value);
    writeUserApiKey(value);
  }, []);

  return { ...status, apiKey, setApiKey, refresh };
}

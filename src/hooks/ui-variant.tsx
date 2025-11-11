"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiVariant = "classic" | "terminal" | "tunnel" | "minimal";

type UiVariantContextValue = {
  variant: UiVariant;
  setVariant: (variant: UiVariant) => void;
};

const UiVariantContext = createContext<UiVariantContextValue | undefined>(undefined);

const STORAGE_KEY = "ui-variant";

export function UiVariantProvider({ children }: { children: React.ReactNode }) {
  // Always start with a stable default for SSR to avoid hydration mismatch
  const [variant, setVariant] = useState<UiVariant>("classic");

  // After mount, load the saved variant and update state
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as UiVariant | null;
      if (saved && saved !== variant) {
        setVariant(saved);
      }
    } catch {}
    // run only once at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, variant);
    } catch {}
  }, [variant]);

  const value = useMemo(() => ({ variant, setVariant }), [variant]);

  return <UiVariantContext.Provider value={value}>{children}</UiVariantContext.Provider>;
}

export function useUiVariant() {
  const ctx = useContext(UiVariantContext);
  if (!ctx) {
    throw new Error("useUiVariant must be used within a UiVariantProvider");
  }
  return ctx;
}



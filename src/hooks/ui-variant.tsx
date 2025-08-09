"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiVariant = "classic";

type UiVariantContextValue = {
  variant: UiVariant;
  setVariant: (variant: UiVariant) => void;
};

const UiVariantContext = createContext<UiVariantContextValue | undefined>(undefined);

const STORAGE_KEY = "ui-variant";

export function UiVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<UiVariant>(() => {
    if (typeof window === "undefined") return "classic";
    const saved = window.localStorage.getItem(STORAGE_KEY) as UiVariant | null;
    return saved ?? "classic";
  });

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



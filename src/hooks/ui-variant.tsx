"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type UiVariant = "classic" | "terminal" | "tunnel" | "minimal" | "tron" | "orb";

type UiVariantContextValue = {
  variant: UiVariant;
  setVariant: (variant: UiVariant) => void;
};

const UiVariantContext = createContext<UiVariantContextValue | undefined>(undefined);

const STORAGE_KEY = "ui-variant";

export function UiVariantProvider({ children, initialVariant }: { children: React.ReactNode; initialVariant?: UiVariant }) {
  const pathname = usePathname();
  // Always start with a stable default for SSR to avoid hydration mismatch
  const [variant, setVariant] = useState<UiVariant>(initialVariant || "classic");

  // After mount, sync variant from URL path
  useEffect(() => {
    try {
      // Extract variant from pathname (e.g., "/classic" -> "classic")
      const pathSegments = pathname.split("/").filter(Boolean);
      const pathVariant = pathSegments[0] as UiVariant;
      
      const validVariants: UiVariant[] = ["classic", "terminal", "tunnel", "minimal", "tron", "orb"];
      if (pathVariant && validVariants.includes(pathVariant)) {
        setVariant(pathVariant);
        // Also save to localStorage for persistence
        window.localStorage.setItem(STORAGE_KEY, pathVariant);
      }
    } catch {}
    // run only once at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

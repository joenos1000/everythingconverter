"use client";

import { useUiVariant, type UiVariant } from "@/hooks/ui-variant";

const VARIANTS: UiVariant[] = ["classic", "terminal", "tunnel", "minimal", "tron", "orb"];

export function UiVariantToggle() {
  const { variant, setVariant } = useUiVariant();

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      <div className="text-xs text-muted-foreground">UI THEME:</div>
      <select
        className="rounded-md border bg-background px-2 py-1 text-sm"
        value={variant}
        onChange={(e) => setVariant(e.target.value as UiVariant)}
      >
        {VARIANTS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}



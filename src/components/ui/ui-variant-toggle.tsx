"use client";

import { Button } from "@/components/ui/button";
import { useUiVariant, type UiVariant } from "@/hooks/ui-variant";

const VARIANTS: UiVariant[] = ["classic"]; // future: add more here

export function UiVariantToggle() {
  const { variant, setVariant } = useUiVariant();

  const nextVariant = () => {
    const idx = VARIANTS.indexOf(variant);
    const next = VARIANTS[(idx + 1) % VARIANTS.length];
    setVariant(next);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted-foreground">UI:</div>
      <Button variant="outline" size="sm" onClick={nextVariant} disabled={VARIANTS.length <= 1}>
        {variant}
      </Button>
    </div>
  );
}



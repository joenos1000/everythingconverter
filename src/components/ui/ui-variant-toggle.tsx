"use client";

import { useUiVariant, type UiVariant } from "@/hooks/ui-variant";

const VARIANTS: UiVariant[] = ["classic", "terminal", "tunnel", "minimal", "tron", "orb"];

export function UiVariantToggle() {
  const { variant, setVariant } = useUiVariant();

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-3">
      <div className="relative overflow-hidden rounded-md">
        <style jsx>{`
          @keyframes rainbow-rotate {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
          }
          @keyframes rainbow-border {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
        `}</style>
        <div
          className="text-xs px-3 py-1.5 font-medium relative"
          style={{
            background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000, #ff7f00)',
            backgroundSize: '200% 100%',
            animation: 'rainbow-border 4s linear infinite',
            color: 'white',
            textShadow: '0 0 10px rgba(0,0,0,0.5)',
            fontWeight: '600',
            border: '3px solid rgba(255,255,255,0.3)'
          }}
        >
          Try the other themes →
        </div>
      </div>
      <div className="flex items-center gap-2">
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
    </div>
  );
}



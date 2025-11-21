"use client";

import { useRouter } from "next/navigation";
import { useUiVariant, type UiVariant } from "@/hooks/ui-variant";
import { useState, useEffect } from "react";

const VARIANTS: UiVariant[] = ["classic", "terminal", "tunnel", "minimal", "tron", "orb", "raw"];

export function UiVariantToggle() {
  const { variant } = useUiVariant();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const handleVariantChange = (newVariant: UiVariant) => {
    router.push(`/${newVariant}`);
  };

  // Handle keyboard shortcut (Ctrl/Cmd + T) to toggle theme picker
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setShowPicker(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Hidden state - small indicator dot in corner */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed top-3 right-3 z-50 w-3 h-3 bg-primary/60 hover:bg-primary rounded-full transition-all duration-300 shadow-lg"
          title="Show theme picker (Ctrl/Cmd + T)"
          style={{
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        />
      )}

      {/* Visible state - full picker */}
      {isVisible && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
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
              className="rounded-md border bg-background px-2 py-1 text-sm min-w-[80px]"
              value={variant}
              onChange={(e) => handleVariantChange(e.target.value as UiVariant)}
            >
              {VARIANTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          
          {/* Hide button */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Hide theme picker"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.5 3.5L3.5 8.5M3.5 3.5L8.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Advanced toggle mode for keyboard users */}
      {showPicker && (
        <div className="fixed top-16 right-3 z-50 bg-background/90 backdrop-blur-md border rounded-lg p-4 shadow-lg animate-in zoom-in-95 duration-200">
          <div className="text-sm font-medium mb-3">Quick Theme Switch</div>
          <div className="grid grid-cols-2 gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  handleVariantChange(v);
                  setShowPicker(false);
                }}
                className={`px-3 py-2 text-xs rounded border transition-all hover:bg-accent ${
                  variant === v ? 'bg-accent border-primary' : 'bg-background'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Press Ctrl/Cmd + T to toggle
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AsciiTunnelBackgroundProps = {
  className?: string;
  src?: string;
  /**
   * Milliseconds between frames. Defaults to 80ms.
   */
  frameIntervalMs?: number;
  /**
   * Optional overlay gradient to improve foreground readability.
   * Defaults to a subtle radial gradient.
   */
  showOverlay?: boolean;
};

export function AsciiTunnelBackground({
  className,
  src = "/tunnel-anim.txt",
  frameIntervalMs = 80,
  showOverlay = true,
}: AsciiTunnelBackgroundProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [fontSizePx, setFontSizePx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLPreElement | null>(null);
  const isMounted = useRef(false);

  const effectiveFrames = frames;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const resp = await fetch(src, { cache: "force-cache" });
        const text = await resp.text();
        if (aborted || !isMounted.current) return;
        // Heuristic: frames separated by 2+ newlines
        const rawFrames = text
          .split(/\n\s*\n\s*\n+/g)
          .flatMap((chunk) => chunk.split(/\n\n/g))
          .map((f) => f.trimEnd())
          .filter((f) => f.trim().length > 0);
        // Deduplicate consecutive identical frames (some animations repeat)
        const deduped: string[] = [];
        for (const f of rawFrames) {
          if (deduped.length === 0 || deduped[deduped.length - 1] !== f) {
            deduped.push(f);
          }
        }
        setFrames(deduped);
      } catch {
        // ignore
      }
    })();
    return () => {
      aborted = true;
    };
  }, [src]);

  const intervalMs = useMemo(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return Infinity; // stop animation
    }
    return Math.max(30, frameIntervalMs);
  }, [frameIntervalMs]);

  useEffect(() => {
    if (!effectiveFrames.length || !isFinite(intervalMs)) return;
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % effectiveFrames.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [effectiveFrames.length, intervalMs]);

  const current = effectiveFrames.length ? effectiveFrames[frameIndex] : "";

  // Compute a font size so the longest line fits exactly the viewport width
  useEffect(() => {
    const el = containerRef.current;
    const meas = measureRef.current;
    if (!el || !meas) return;

    const compute = () => {
      const containerWidth = el.clientWidth;
      const containerHeight = el.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const lines = current.split("\n");
      // const rows = Math.max(1, lines.length);
      const cols = Math.max(1, ...lines.map((l) => l.length));

      // Prepare measurement with a known font size
      const testFontSize = 100; // px
      meas.style.fontSize = `${testFontSize}px`;
      meas.style.lineHeight = "1";
      meas.textContent = "0".repeat(cols);
      const measuredWidth = meas.scrollWidth;
      const charWidthAtTest = measuredWidth / cols; // px per char at 100px font-size
      const charWidthPerPx = charWidthAtTest / testFontSize;

      // Width-based fit
      const widthBasedFont = containerWidth / (charWidthPerPx * cols);
      // Height-based fit (approximate using line-height = 1)
      // const heightBasedFont = containerHeight / rows;

      // Choose width-based to guarantee edge-to-edge horizontally
      // Could also use Math.min(widthBasedFont, heightBasedFont) for aspect ratio preservation
      const target = Math.max(6, Math.min(widthBasedFont, 60));
      setFontSizePx(target);
    };

    compute();
    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Recompute when frame changes (in case max cols change)
  }, [current]);

  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-0 overflow-hidden select-none",
        className || "",
      ].join(" ")}
      aria-hidden
      ref={containerRef}
    >
      {/* Background */}
      <div className="absolute inset-0 grid place-items-center">
        <pre
          className="m-0 whitespace-pre font-mono text-primary/25 [tab-size:2]"
          style={{
            fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
            lineHeight: 1,
          }}
        >
          {current}
        </pre>
      </div>
      {/* Hidden measurer */}
      <pre
        ref={measureRef}
        className="invisible absolute top-0 left-0 whitespace-pre font-mono"
        aria-hidden
      />
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/20 to-background/60" />
      )}
    </div>
  );
}

export default AsciiTunnelBackground;



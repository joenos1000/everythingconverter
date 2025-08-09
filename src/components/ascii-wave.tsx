"use client";

import { useEffect, useMemo, useState } from "react";

export function AsciiWave() {
  const frames = useMemo(
    () => [
      // 3-line flowing wave. Keep lines same length for stable layout.
      [
        "~     ~     ~     ~",
        "  ~     ~     ~    ",
        "    ~     ~     ~  ",
      ].join("\n"),
      [
        "    ~     ~     ~  ",
        "~     ~     ~     ~",
        "  ~     ~     ~    ",
      ].join("\n"),
      [
        "  ~     ~     ~    ",
        "    ~     ~     ~  ",
        "~     ~     ~     ~",
      ].join("\n"),
      [
        " ~   ~   ~   ~   ~ ",
        "   ~   ~   ~   ~   ",
        " ~   ~   ~   ~   ~ ",
      ].join("\n"),
      [
        "    ~  ~  ~  ~     ",
        "  ~  ~  ~  ~    ~  ",
        "~  ~  ~  ~     ~   ",
      ].join("\n"),
      [
        "~  ~  ~  ~     ~   ",
        "    ~  ~  ~  ~     ",
        "  ~  ~  ~  ~    ~  ",
      ].join("\n"),
    ],
    []
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % frames.length), 100);
    return () => clearInterval(id);
  }, [frames.length]);

  return (
    <div
      aria-hidden
      className="px-2 text-primary/90 font-mono text-lg select-none leading-[0.95] whitespace-pre"
    >
      {frames[idx]}
    </div>
  );
}



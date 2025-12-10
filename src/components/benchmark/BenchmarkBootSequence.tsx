"use client";

import { useState, useEffect, useMemo } from "react";

interface BenchmarkBootSequenceProps {
  onComplete: () => void;
}

export function BenchmarkBootSequence({ onComplete }: BenchmarkBootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);

  const bootSequence = useMemo(() => [
    "AI MODEL BENCHMARK SUITE v2.99",
    "Copyright (C) 1999 Everything Converter Inc.",
    "",
    "Detecting hardware...",
    "CPU: Intel Pentium III 500MHz [OK]",
    "RAM: 128MB SDRAM [OK]",
    "GPU: 3dfx Voodoo3 3000 AGP [OK]",
    "",
    "Initializing AI model interface...",
    "Loading conversion algorithms...",
    "Calibrating benchmark suite...",
    "",
    "System ready. Press RUN BENCHMARK to begin.",
  ], []);

  useEffect(() => {
    if (currentLine < bootSequence.length) {
      const timer = setTimeout(() => {
        setLines((prev) => [...prev, bootSequence[currentLine]]);
        setCurrentLine((prev) => prev + 1);
      }, 150); // 150ms per line

      return () => clearTimeout(timer);
    } else {
      // Boot complete, wait 1 second then callback
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentLine, bootSequence, onComplete]);

  return (
    <div className="benchmark-boot min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {lines.map((line, i) => (
          <div key={i} className="benchmark-boot-line">
            {line}
            {i === lines.length - 1 && <span className="benchmark-boot-cursor" />}
          </div>
        ))}
      </div>
    </div>
  );
}

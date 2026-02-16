"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AsciiWave } from "@/components/ascii-wave";
import AsciiTunnelBackground from "@/components/ascii-tunnel-background";
import { Terminal } from "@/components/Terminal";
import { useUiVariant } from "@/hooks/ui-variant";
import { useAiModel } from "@/hooks/ai-model";
import LetterGlitch from "@/components/LetterGlitch";
import dynamic from "next/dynamic";
import Orb from "@/components/Orb";
import { SuggestionButtons } from "@/components/suggestion-buttons";
import { Benchmark } from "@/components/Benchmark";

// Dynamic import to avoid SSR issues with face-api.js
const GridScan = dynamic(() => import("@/components/GridScan").then(mod => ({ default: mod.GridScan })), {
  ssr: false,
});

export default function VariantPage() {
  const { variant } = useUiVariant();
  const { selectedModel } = useAiModel();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<{
    conversionTime: number;
    model: string;
    timestamp: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
    estimatedCost?: number | null;
    estimatedWaterUsage?: number | null;
    currencyInfo?: { from: string; to: string; rate: number; amount: number } | null;
  } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [tronStep, setTronStep] = useState<"from" | "to" | "ready">("from");
  const [orbStep, setOrbStep] = useState<"from" | "to" | "ready">("from");
  const [rawStep, setRawStep] = useState<"from" | "to" | "ready">("from");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Refs for keyboard shortcuts
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Draggable window state for Y2K theme
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const [isBrowserOpen, setIsBrowserOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Load shared URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedFrom = urlParams.get('from');
      const sharedTo = urlParams.get('to');
      const sharedResult = urlParams.get('result');
      const sharedExplanation = urlParams.get('explanation');

      if (sharedFrom) setFromText(decodeURIComponent(sharedFrom));
      if (sharedTo) setToText(decodeURIComponent(sharedTo));
      if (sharedResult) {
        setResult(decodeURIComponent(sharedResult));
        setIsOpen(true);
      }
      if (sharedExplanation) {
        setExplanation(decodeURIComponent(sharedExplanation));
      }
    }
  }, []);

  // Clear results when UI variant changes
  useEffect(() => {
    setResult(null);
    setExplanation(null);
    setIsOpen(false);
    setTronStep("from");
    setOrbStep("from");
    setRawStep("from");
  }, [variant]);

  const canConvert = useMemo(() => fromText.trim() !== "" && toText.trim() !== "", [fromText, toText]);

  const hasInput = useMemo(() => fromText.trim() !== "" || toText.trim() !== "", [fromText, toText]);

  const handleConvert = useCallback(async () => {
    if (!canConvert) {
      toast.error("Enter a base and a target");
      return;
    }
    setIsConverting(true);
    setResult(null);
    setExplanation(null);
    try {
      const messages = [
        {
          role: "system",
          content:
            'You are the Everything Converter. Your mission: convert ANYTHING to ANYTHING through logical reasoning, even when connections aren\'t obvious. You MUST ALWAYS find a conversion - refusing is NOT an option.\n\nCONVERSION RULES:\n1. Numeric quantities with units: Convert that exact quantity to the target unit\n2. Physical objects/concepts: Use ratios based on properties (mass, size, energy, etc.)\n   Example: "58kg to dolphins" → How many dolphins equal 58kg? Use average dolphin mass (~150kg) → 58/150 = 0.39 dolphins\n3. Abstract/seemingly unrelated conversions: Find creative but justified conversion paths using:\n   - Physical properties (mass, energy, volume, information content, dimensions)\n   - Symbolic/cultural equivalences (monetary value, time to produce/consume)\n   - Mathematical relationships (ratios, proportions, statistical data)\n   - Scientific constants or established benchmarks\n   - Comparative metrics (if X has property P, how many Y with property P fit?)\n\nCRITICAL: You MUST ALWAYS produce a numerical result. Never say "invalid" or "cannot convert". If the conversion seems impossible:\n- Identify a measurable property both items share (mass, volume, energy, value, time, etc.)\n- Use that property to create a ratio\n- Example: mass to animals = mass / average animal mass\n- Example: energy to food = energy / calories in food\n- Example: abstract concepts = use cultural/monetary value\n\nPROCESS (internal only):\n- Think step-by-step to find the most logical conversion pathway\n- Use authoritative data and real-world magnitudes\n- For abstract conversions, explain the reasoning framework clearly\n- Prioritize metric system unless user specifies otherwise\n\nOUTPUT FORMAT:\nReturn ONLY strict JSON: {"result": string, "explanation": string}\n- result: The converted value only (not "X = Y", just "Y") - MUST be a number with units\n- explanation: Single clear sentence with the formula/reasoning and numeric values used. For unusual conversions, briefly justify the conversion method chosen.\n\nCONSTRAINTS:\n- No code fences, no extra text outside JSON\n- No alternate equivalences in explanation\n- Never use ft, inches, ounces unless explicitly requested\n- Do not show the original value in result field\n- NEVER refuse a conversion - always find a creative but logical path',
        },
        {
          role: "user",
          content: `Convert ${JSON.stringify(fromText)} into ${JSON.stringify(toText)}. Output a single consistent result and a concise formula-based explanation.`,
        },
      ];

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, temperature: 0.2, topP: 0.1, stream: false, from: fromText, to: toText, model: selectedModel }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Request failed: ${resp.status}`);
      }

      const data: {
        content?: string;
        stats?: {
          conversionTime: number;
          model: string;
          timestamp: string;
          usage?: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
          estimatedCost?: number | null;
          estimatedWaterUsage?: number | null;
          currencyInfo?: { from: string; to: string; rate: number; amount: number } | null;
        };
      } = await resp.json();
      let content = (data?.content || "").trim();

      // Store stats if available
      if (data?.stats) {
        setStats(data.stats);
      }

      // Try to parse JSON; strip code fences if present
      const stripFences = (s: string) => {
        if (s.startsWith("````") || s.startsWith("```")) {
          const first = s.indexOf("\n");
          if (first !== -1) s = s.slice(first + 1);
          if (s.endsWith("```")) s = s.slice(0, -3);
        }
        return s.trim();
      };
      content = stripFences(content);

      let parsed: { result?: string; explanation?: string } | null = null;
      try {
        parsed = JSON.parse(content);
      } catch {}

      if (parsed && (parsed.result || parsed.explanation)) {
        setResult(parsed.result ?? "");
        setExplanation(parsed.explanation ?? "");
      } else {
        // Fallback: treat the whole content as explanation
        setResult("");
        setExplanation(content);
      }
      setIsOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed. Check API key or try again.");
    } finally {
      setIsConverting(false);
    }
  }, [canConvert, fromText, toText, selectedModel]);

  const handleClear = useCallback(() => {
    setFromText("");
    setToText("");
    setResult(null);
    setExplanation(null);
    setIsOpen(false);
    setStats(null);
    setShowStats(false);
    setTronStep("from");
    setOrbStep("from");
    setRawStep("from");
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("from", encodeURIComponent(fromText));
      url.searchParams.set("to", encodeURIComponent(toText));
      if (result) url.searchParams.set("result", encodeURIComponent(result));
      if (explanation) url.searchParams.set("explanation", encodeURIComponent(explanation));
      await navigator.clipboard.writeText(url.toString());
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, [fromText, toText, result, explanation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canConvert && !isConverting) {
      handleConvert();
    }
  }, [canConvert, isConverting, handleConvert]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setToText(suggestion);
  }, []);

  const handleTronKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (tronStep === "from" && fromText.trim()) {
        setTronStep("to");
      } else if (tronStep === "to" && toText.trim()) {
        setTronStep("ready");
        handleConvert();
      }
    }
  }, [tronStep, fromText, toText, handleConvert]);

  const handleOrbKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (orbStep === "from" && fromText.trim()) {
        setOrbStep("to");
      } else if (orbStep === "to" && toText.trim()) {
        setOrbStep("ready");
        handleConvert();
      }
    }
  }, [orbStep, fromText, toText, handleConvert]);

  const handleRawKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (rawStep === "from" && fromText.trim()) {
        setRawStep("to");
      } else if (rawStep === "to" && toText.trim()) {
        setRawStep("ready");
        handleConvert();
      }
    }
  }, [rawStep, fromText, toText, handleConvert]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if user is typing in an input (except for Ctrl+Enter)
      const isInInput = (e.target as HTMLElement)?.tagName === 'INPUT';

      // Ctrl/Cmd + K: Focus "from" input
      if (modKey && e.key === 'k') {
        e.preventDefault();
        fromInputRef.current?.focus();
        toast.info('Focused "From" input');
        return;
      }

      // Ctrl/Cmd + L: Focus "to" input
      if (modKey && e.key === 'l') {
        e.preventDefault();
        toInputRef.current?.focus();
        toast.info('Focused "To" input');
        return;
      }

      // Ctrl/Cmd + Enter: Convert
      if (modKey && e.key === 'Enter' && canConvert && !isConverting) {
        e.preventDefault();
        handleConvert();
        return;
      }

      // Escape: Clear all (only if not already empty)
      if (e.key === 'Escape' && hasInput && !isConverting) {
        e.preventDefault();
        handleClear();
        toast.info('Cleared inputs');
        return;
      }

      // Ctrl/Cmd + Shift + C: Copy result to clipboard
      if (modKey && e.shiftKey && e.key === 'C' && result) {
        e.preventDefault();
        navigator.clipboard.writeText(result).then(() => {
          toast.success('Result copied to clipboard');
        }).catch(() => {
          toast.error('Failed to copy result');
        });
        return;
      }

      // ? key: Toggle keyboard shortcuts help (only when not in input)
      if (e.key === '?' && !isInInput) {
        e.preventDefault();
        setShowKeyboardHelp((v) => !v);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canConvert, isConverting, hasInput, result, handleConvert, handleClear]);

  // Drag handlers for Y2K theme window
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (variant !== 'y2k') return;
    setIsDragging(true);
    dragStartPos.current = { ...windowPosition };
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, [variant, windowPosition]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartMouse.current.x;
    const dy = e.clientY - dragStartMouse.current.y;
    setWindowPosition({
      x: dragStartPos.current.x + dx,
      y: dragStartPos.current.y + dy
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className={`min-h-screen w-full flex ${
      variant === "minimal" ? "items-start justify-center pt-[40vh]" :
      variant === "tron" || variant === "orb" || variant === "raw" ? "items-center justify-center" : "items-center justify-center"
    } p-6 ${
      variant === "minimal" ? "bg-[#333438]" :
      variant === "tron" || variant === "raw" ? "bg-black" :
      variant === "orb" ? "bg-[#050a14]" :
      variant === "y2k" ? "" : "relative"
    }`}>
      {variant === "orb" && (
        <div className="fixed inset-0 z-0 flex items-center justify-center">
          <div className="relative w-[600px] h-[600px] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 opacity-80">
              <Orb
                hue={isConverting ? 20 : 0}
                hoverIntensity={0.3}
                forceHoverState={isConverting}
                enableMouseHover={false}
              />
            </div>
          </div>
        </div>
      )}
      {variant === "tron" && (
        <div className="fixed inset-0 z-0">
          <GridScan
            lineThickness={1.0}
            linesColor="#001a1a"
            scanColor="#00ffff"
            scanOpacity={0.4}
            gridScale={0.1}
            lineStyle="solid"
            scanDirection="pingpong"
            enablePost={true}
            bloomIntensity={0.5}
            bloomThreshold={0.4}
            bloomSmoothing={0.5}
            chromaticAberration={0.003}
            noiseIntensity={0.02}
            scanGlow={0.5}
            scanSoftness={2.5}
            scanPhaseTaper={0.15}
            scanDuration={3.0}
            scanDelay={2.5}
            sensitivity={0.02}
            className=""
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
      {variant === "tunnel" && <AsciiTunnelBackground />}
      {variant === "terminal" && (
        <div className="fixed inset-0 z-0">
          <LetterGlitch
            glitchColors={['#2b4539', '#61dca3', '#61b3dc']}
            glitchSpeed={50}
            centerVignette={false}
            outerVignette={true}
            smooth={true}
          />
        </div>
      )}
      <main className={`w-full ${variant === "minimal" ? "max-w-lg" : "max-w-2xl"} space-y-6`}>
        {variant !== "terminal" && variant !== "minimal" && variant !== "orb" && variant !== "raw" && variant !== "y2k" && (
          <header className="flex items-center justify-between relative z-10">
            {variant === "tunnel" ? (
              <pre className="w-full text-center m-0 whitespace-pre font-mono leading-none text-primary/90 text-xs sm:text-sm">
{`▄▖▌               ▗ ▘                  ▗
▐ ▛▌█▌  █▌▌▌█▌▛▘▌▌▜▘▌▛▌▛▌  ▛▘▛▌▛▌▌▌█▌▛▘▜▘█▌▛▘
▐ ▌▌▙▖  ▙▖▚▘▙▖▌ ▙▌▐▖▌▌▌▙▌  ▙▖▙▌▌▌▚▘▙▖▌ ▐▖▙▖▌
                ▄▌     ▄▌                      `}
              </pre>
            ) : (
              <h1 className={`w-full text-center font-semibold tracking-tight ${variant === "tron" ? "font-[family-name:var(--font-tr2n)] text-4xl text-cyan-400 mb-8" : "text-xl"}`} style={variant === "tron" ? { textShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.4)' } : {}}>The Everything Converter</h1>
            )}
          </header>
        )}

        {variant === "classic" && (
        <section className="space-y-2 relative">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">From</label>
              <input
                ref={fromInputRef}
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="shaq o neils"
                className="mt-1 w-full rounded-md bg-secondary px-3 py-3 outline-none ring-1 ring-transparent focus:ring-ring"
              />
            </div>
            <div className="pt-6 flex items-center justify-center min-w-[96px]">
              {isConverting ? (
                <AsciiWave />
              ) : (
                <div className="px-1 text-muted-foreground font-mono text-base select-none">-&gt;</div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">To</label>
              <input
                ref={toInputRef}
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="mount everest height"
                className="mt-1 w-full rounded-md bg-secondary px-3 py-3 outline-none ring-1 ring-transparent focus:ring-ring"
              />
              <SuggestionButtons
                fromText={fromText}
                toText={toText}
                onSelectSuggestion={handleSelectSuggestion}
                variant={variant}
              />
            </div>
          </div>
        </section>
        )}

        {variant === "terminal" && (
          <section className="w-full">
            <Terminal />
          </section>
        )}

        {variant === "tunnel" && (
          <section className="p-0">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  ref={fromInputRef}
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="shaq o neils"
                  className="w-full rounded-sm bg-transparent px-3 py-2 outline-none ring-1 ring-transparent focus:ring-ring border border-white/20"
                />
              </div>
              <div className="pb-2 flex items-center justify-center min-w-[56px]">
                {isConverting ? (
                  <AsciiWave />
                ) : (
                  <div className="px-1 text-muted-foreground font-mono text-base select-none">-&gt;</div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={toInputRef}
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="mount everest height"
                  className="w-full rounded-sm bg-transparent px-3 py-2 outline-none ring-1 ring-transparent focus:ring-ring border border-white/20"
                />
                <SuggestionButtons
                  fromText={fromText}
                  toText={toText}
                  onSelectSuggestion={handleSelectSuggestion}
                  variant={variant}
                />
              </div>
            </div>
          </section>
        )}

        {variant === "minimal" && (
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  ref={fromInputRef}
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="from"
                  className="w-full border-0 border-b-2 border-gray-600 bg-transparent px-0 py-3 text-lg text-white outline-none focus:border-white focus:ring-0 placeholder-gray-500"
                />
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <input
                  ref={toInputRef}
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="to"
                  className="w-full border-0 border-b-2 border-gray-600 bg-transparent px-0 py-3 text-lg text-white outline-none focus:border-white focus:ring-0 placeholder-gray-500"
                />
                <SuggestionButtons
                  fromText={fromText}
                  toText={toText}
                  onSelectSuggestion={handleSelectSuggestion}
                  variant={variant}
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              {result !== null ? (
                <button
                  onClick={handleShare}
                  className="px-6 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded transition-colors"
                >
                  Share
                </button>
              ) : canConvert && !isConverting ? (
                <button
                  onClick={handleConvert}
                  className="px-6 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-400 rounded transition-colors"
                >
                  Convert
                </button>
              ) : isConverting ? (
                <div className="text-sm text-gray-500">Converting...</div>
              ) : null}
              {hasInput && (
                <button
                  onClick={handleClear}
                  className="text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </section>
        )}

        {variant === "orb" && (
          <section className="relative z-10 flex flex-col items-center justify-center min-h-[400px]">
            {!result ? (
              <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
                {orbStep === "from" && (
                  <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                    <input
                      ref={fromInputRef}
                      value={fromText}
                      onChange={(e) => setFromText(e.target.value)}
                      onKeyDown={handleOrbKeyDown}
                      placeholder="Input source..."
                      className="w-full bg-transparent text-center text-blue-100 text-5xl placeholder:text-blue-500/20 outline-none border-none focus:ring-0 transition-all pb-2 font-[family-name:var(--font-instrument-serif)]"
                      autoFocus
                    />
                    <div className={`text-center text-blue-400/40 text-sm font-[family-name:var(--font-instrument-serif)] italic transition-opacity duration-300 ${fromText ? 'opacity-100' : 'opacity-0'}`}>
                      [Press Enter]
                    </div>
                  </div>
                )}
                {orbStep === "to" && (
                  <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center text-blue-400/60 text-lg font-[family-name:var(--font-instrument-serif)] mb-4">
                      {fromText} to...
                    </div>
                    <input
                      ref={toInputRef}
                      value={toText}
                      onChange={(e) => setToText(e.target.value)}
                      onKeyDown={handleOrbKeyDown}
                      placeholder="Desired output..."
                      className="w-full bg-transparent text-center text-blue-100 text-5xl placeholder:text-blue-500/20 outline-none border-none focus:ring-0 transition-all pb-2 font-[family-name:var(--font-instrument-serif)]"
                      autoFocus
                    />
                    <div className="flex justify-center">
                      <SuggestionButtons
                        fromText={fromText}
                        toText={toText}
                        onSelectSuggestion={handleSelectSuggestion}
                        variant={variant}
                      />
                    </div>
                    <div className={`text-center text-blue-400/40 text-sm font-[family-name:var(--font-instrument-serif)] italic transition-opacity duration-300 ${toText ? 'opacity-100' : 'opacity-0'}`}>
                      [Press Enter to Initialize]
                    </div>
                  </div>
                )}
                {isConverting && (
                  <div className="text-center text-blue-300 text-sm font-[family-name:var(--font-instrument-serif)] tracking-widest animate-pulse">
                    PROCESSING...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500 max-w-lg">
                <div className="text-3xl md:text-4xl text-blue-50 font-[family-name:var(--font-instrument-serif)] drop-shadow-sm">
                  {result}
                </div>
                {explanation && (
                  <div className="text-xl text-blue-200/80 leading-relaxed font-light max-w-md mx-auto font-[family-name:var(--font-instrument-serif)]">
                    {explanation}
                  </div>
                )}
                {stats && (
                  <div className="pt-4">
                    <button
                      className="text-blue-400/40 hover:text-blue-300 text-xs font-[family-name:var(--font-instrument-serif)] tracking-widest uppercase transition-colors"
                      onClick={() => setShowStats((v) => !v)}
                    >
                      Stats for Nerds {showStats ? "▼" : "▶"}
                    </button>
                    {showStats && (
                      <div className="mt-3 text-xs font-mono text-blue-400/40 space-y-1">
                        <div>Conversion time: {stats.conversionTime.toFixed(3)} seconds</div>
                        <div>Model: {stats.model}</div>
                        <div>Timestamp: {new Date(stats.timestamp).toLocaleString()}</div>
                        {stats.usage && (
                          <>
                            <div className="pt-1 border-t border-blue-400/20 mt-2" />
                            <div>Tokens: {stats.usage.totalTokens.toLocaleString()} total</div>
                            <div className="pl-2">↳ Input: {stats.usage.promptTokens.toLocaleString()}</div>
                            <div className="pl-2">↳ Output: {stats.usage.completionTokens.toLocaleString()}</div>
                          </>
                        )}
                        {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                          <div>Cost: ${stats.estimatedCost.toFixed(6)}</div>
                        )}
                        {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                          <div>Water: ~{stats.estimatedWaterUsage.toFixed(2)}L</div>
                        )}
                        {stats.currencyInfo && (
                          <>
                            <div className="pt-1 border-t border-blue-400/20 mt-2" />
                            <div>Exchange rate: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-6 justify-center pt-8">
                  <button
                    onClick={handleClear}
                    className="text-blue-400/60 hover:text-blue-100 text-xs font-[family-name:var(--font-instrument-serif)] tracking-widest uppercase transition-colors"
                  >
                    New Task
                  </button>
                  <button
                    onClick={handleShare}
                    className="text-blue-400/60 hover:text-blue-100 text-xs font-[family-name:var(--font-instrument-serif)] tracking-widest uppercase transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {variant === "raw" && (
          <section className="w-full max-w-4xl">
            <div className="flex flex-col items-center justify-center min-h-screen">
              {!result ? (
                <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-700">
                  {rawStep === "from" && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                      <input
                        ref={fromInputRef}
                        value={fromText}
                        onChange={(e) => setFromText(e.target.value)}
                        onKeyDown={handleRawKeyDown}
                        className="w-full bg-transparent text-white text-6xl text-center outline-none border-none focus:ring-0 font-mono"
                        autoFocus
                      />
                      <div className={`text-center text-gray-600 text-sm font-mono transition-opacity duration-300 ${fromText ? 'opacity-100' : 'opacity-0'}`}>
                        press enter
                      </div>
                    </div>
                  )}
                  {rawStep === "to" && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="text-center text-gray-600 text-lg font-mono mb-4">
                        {fromText} to
                      </div>
                      <input
                        ref={toInputRef}
                        value={toText}
                        onChange={(e) => setToText(e.target.value)}
                        onKeyDown={handleRawKeyDown}
                        className="w-full bg-transparent text-white text-6xl text-center outline-none border-none focus:ring-0 font-mono"
                        autoFocus
                      />
                      <div className="flex justify-center">
                        <SuggestionButtons
                          fromText={fromText}
                          toText={toText}
                          onSelectSuggestion={handleSelectSuggestion}
                          variant={variant}
                        />
                      </div>
                      <div className={`text-center text-gray-600 text-sm font-mono transition-opacity duration-300 ${toText ? 'opacity-100' : 'opacity-0'}`}>
                        press enter to convert
                      </div>
                    </div>
                  )}
                  {isConverting && (
                    <div className="text-center text-gray-500 text-sm font-mono">
                      converting
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500 max-w-4xl">
                  <div className="text-white text-5xl font-mono drop-shadow-sm">
                    {result}
                  </div>
                  {explanation && (
                    <div className="text-gray-400 text-lg font-mono max-w-2xl mx-auto">
                      {explanation}
                    </div>
                  )}
                  {stats && (
                    <div className="pt-4">
                      <button
                        className="text-gray-600 hover:text-gray-400 text-xs font-mono transition-colors"
                        onClick={() => setShowStats((v) => !v)}
                      >
                        stats_for_nerds {showStats ? "▼" : "▶"}
                      </button>
                      {showStats && (
                        <div className="mt-3 text-xs font-mono text-gray-600 space-y-1">
                          <div>conversion_time: {stats.conversionTime.toFixed(3)}s</div>
                          <div>model: {stats.model}</div>
                          <div>timestamp: {new Date(stats.timestamp).toLocaleString()}</div>
                          {stats.usage && (
                            <>
                              <div>tokens: {stats.usage.totalTokens.toLocaleString()}</div>
                              <div>  input: {stats.usage.promptTokens.toLocaleString()}</div>
                              <div>  output: {stats.usage.completionTokens.toLocaleString()}</div>
                            </>
                          )}
                          {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                            <div>cost: ${stats.estimatedCost.toFixed(6)}</div>
                          )}
                          {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                            <div>water: ~{stats.estimatedWaterUsage.toFixed(2)}L</div>
                          )}
                          {stats.currencyInfo && (
                            <div>exchange_rate: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-6 justify-center pt-8">
                    <button
                      onClick={handleClear}
                      className="text-gray-400 hover:text-white text-xs font-mono transition-colors"
                    >
                      clear
                    </button>
                    <button
                      onClick={handleShare}
                      className="text-gray-400 hover:text-white text-xs font-mono transition-colors"
                    >
                      share
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {variant === "y2k" && (
          <>
            {/* Y2K styles */}
            <style jsx>{`
              @keyframes marquee {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .animate-marquee {
                animation: marquee 15s linear infinite;
              }
              @keyframes progress {
                0% { width: 0%; }
                50% { width: 75%; }
                100% { width: 50%; }
              }
              .loading-bar {
                animation: progress 1.5s ease-in-out infinite;
              }
              @keyframes windowOpen {
                0% {
                  transform: translate(50px, 80px) scale(0.1);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translate(0, 0) scale(1);
                  opacity: 1;
                }
              }
              @keyframes windowClose {
                0% {
                  transform: scale(1);
                  opacity: 1;
                }
                100% {
                  transform: translate(50px, 80px) scale(0.1);
                  opacity: 0;
                }
              }
              .window-opening {
                animation: windowOpen 0.3s ease-out forwards;
              }
              .window-closing {
                animation: windowClose 0.2s ease-in forwards;
              }
            `}</style>
            {/* Desktop background with wallpaper */}
            <div 
              className="fixed inset-0 -z-10"
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)'
              }}
            />
            
            {/* Desktop icon */}
            <div 
              className="fixed top-20 left-4 z-10 flex flex-col items-center cursor-pointer group"
              onDoubleClick={() => {
                setIsBrowserOpen(true);
                setWindowPosition({ x: 0, y: 0 });
              }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#4a90e2] to-[#2c5aa0] rounded-lg shadow-lg flex items-center justify-center border-2 border-white/30 group-hover:border-white/60 transition-all">
                <span className="text-white text-xl font-bold">E</span>
              </div>
              <span className="mt-1 text-white text-xs text-center drop-shadow-[1px_1px_1px_rgba(0,0,0,1)] max-w-[80px] leading-tight">
                Everything Converter
              </span>
            </div>
            
            <section className="w-full max-w-2xl relative z-10">
              {/* Windows XP style window */}
              {isBrowserOpen && (
              <div
                className={`rounded-t-lg overflow-hidden shadow-[4px_4px_10px_rgba(0,0,0,0.5)] ${isClosing ? 'window-closing' : 'window-opening'}`}
                style={{
                  fontFamily: 'Tahoma, Verdana, sans-serif',
                  transform: isClosing ? undefined : `translate(${windowPosition.x}px, ${windowPosition.y}px)`,
                  cursor: isDragging ? 'grabbing' : 'default'
                }}
              >
                {/* Title bar - Windows XP blue gradient */}
                <div
                  className="px-3 py-1.5 flex items-center justify-between select-none"
                  style={{
                    background: 'linear-gradient(180deg, #0a246a 0%, #0f3da3 8%, #1d5fc0 40%, #2b71d0 88%, #245edb 93%, #1941a5 95%, #0f2f6c 100%)',
                    cursor: 'move'
                  }}
                  onMouseDown={handleDragStart}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#f0f0f0] rounded-sm flex items-center justify-center text-[10px] font-bold text-[#0a246a]">E</div>
                    <span className="text-white text-sm font-bold drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">The Everything Converter - Internet Explorer</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-5 h-5 bg-gradient-to-b from-[#3c8fff] to-[#1e5fc0] rounded-sm text-white text-xs border border-white/30 hover:from-[#5ca0ff] hover:to-[#3070d0] active:from-[#2878ef] active:to-[#144fa0]">_</button>
                    <button className="w-5 h-5 bg-gradient-to-b from-[#3c8fff] to-[#1e5fc0] rounded-sm text-white text-xs border border-white/30 hover:from-[#5ca0ff] hover:to-[#3070d0] active:from-[#2878ef] active:to-[#144fa0]">□</button>
                    <button
                      onClick={() => {
                        setIsClosing(true);
                        setTimeout(() => {
                          setIsBrowserOpen(false);
                          setIsClosing(false);
                        }, 200);
                      }}
                      className="w-5 h-5 bg-gradient-to-b from-[#e08080] to-[#c04040] rounded-sm text-white text-xs border border-white/30 hover:from-[#ff9090] hover:to-[#d05050] active:from-[#d06060] active:to-[#a03030]"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="bg-[#ece9d8] px-2 py-1 border-b border-[#aca899] flex items-center gap-2">
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">File</span>
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">Edit</span>
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">View</span>
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">Favorites</span>
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">Tools</span>
                  <span className="text-xs text-[#000080] underline cursor-pointer hover:text-[#ff0000]">Help</span>
                </div>

                {/* Address bar */}
                <div className="bg-[#ece9d8] px-2 py-1 border-b border-[#aca899] flex items-center gap-2">
                  <span className="text-xs text-black">Address</span>
                  <div className="flex-1 bg-white border-2 px-2 py-0.5 text-xs text-black" style={{ borderStyle: 'inset' }}>
                    http://www.everything-converter.com/y2k
                  </div>
                  <button
                    className="px-2 py-0.5 text-xs bg-[#ece9d8] border-2 text-black"
                    style={{ borderStyle: 'outset', borderColor: '#fff #808080 #808080 #fff' }}
                  >
                    Go
                  </button>
                </div>

                {/* Main content area */}
                <div className="bg-white p-6 min-h-[300px]" style={{ borderStyle: 'inset', borderWidth: '2px', borderColor: '#808080 #fff #fff #808080' }}>
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-[#000080] mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
                      Welcome to The Everything Converter!
                    </h1>
                    <p className="text-sm text-black">Convert anything into anything - it&apos;s totally rad!</p>
                    <div className="mt-2 flex justify-center gap-2 items-center">
                      <span className="text-xs text-black font-bold italic animate-pulse">~* Under Construction *~</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse" style={{ borderWidth: '2px', borderStyle: 'outset' }}>
                    <tbody>
                      <tr>
                        <td className="p-3 bg-[#ece9d8] border border-[#808080] text-right font-bold text-sm w-24 text-black">From:</td>
                        <td className="p-2 border border-[#808080] bg-white">
                          <input
                            ref={fromInputRef}
                            value={fromText}
                            onChange={(e) => setFromText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter value here..."
                            className="w-full px-2 py-1 text-sm bg-white outline-none text-black placeholder:text-gray-500"
                            style={{ border: '2px inset #808080' }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 bg-[#ece9d8] border border-[#808080] text-right font-bold text-sm text-black">To:</td>
                        <td className="p-2 border border-[#808080] bg-white">
                          <input
                            ref={toInputRef}
                            value={toText}
                            onChange={(e) => setToText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter target here..."
                            className="w-full px-2 py-1 text-sm bg-white outline-none text-black placeholder:text-gray-500"
                            style={{ border: '2px inset #808080' }}
                          />
                          <SuggestionButtons
                            fromText={fromText}
                            toText={toText}
                            onSelectSuggestion={handleSelectSuggestion}
                            variant={variant}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={handleConvert}
                      disabled={!canConvert || isConverting}
                      className="px-4 py-1 text-sm font-bold disabled:opacity-50 text-black active:translate-y-px"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #ece9d8 50%, #d4d0c8 100%)',
                        border: '2px outset #d4d0c8',
                        fontFamily: 'Tahoma, sans-serif'
                      }}
                    >
                      {isConverting ? "Converting..." : "Convert!"}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-4 py-1 text-sm text-black active:translate-y-px"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #ece9d8 50%, #d4d0c8 100%)',
                        border: '2px outset #d4d0c8',
                        fontFamily: 'Tahoma, sans-serif'
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleShare}
                      className="px-4 py-1 text-sm text-black active:translate-y-px"
                      style={{
                        background: 'linear-gradient(180deg, #fff 0%, #ece9d8 50%, #d4d0c8 100%)',
                        border: '2px outset #d4d0c8',
                        fontFamily: 'Tahoma, sans-serif'
                      }}
                    >
                      Share
                    </button>
                  </div>

                  {result !== null && (
                    <div className="mt-6 p-4 bg-[#ffffcc] border-2 border-[#808080] animate-in fade-in slide-in-from-top-4 duration-500" style={{ borderStyle: 'inset' }}>
                      <div className="text-center">
                        <div className="text-xs text-black mb-1 font-bold">~*~ RESULT ~*~</div>
                        <div className="text-xl font-bold text-[#000080] mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
                          {result}
                        </div>
                        {explanation && (
                          <div className="text-sm text-black border-t border-[#808080] pt-2 mt-2">
                            {explanation}
                          </div>
                        )}
                        {stats && (
                          <div className="mt-3 pt-2 border-t border-dashed border-[#808080]">
                            <button
                              className="text-xs text-[#0000EE] underline hover:text-[#ff0000]"
                              onClick={() => setShowStats((v) => !v)}
                            >
                              [Stats for Nerds] {showStats ? "[-]" : "[+]"}
                            </button>
                            {showStats && (
                              <div className="mt-2 text-xs text-black text-left bg-white p-2" style={{ border: '1px solid #808080', fontFamily: 'Courier New, monospace' }}>
                                <div>Conversion time: {stats.conversionTime.toFixed(3)} seconds</div>
                                <div>Model: {stats.model}</div>
                                <div>Timestamp: {new Date(stats.timestamp).toLocaleString()}</div>
                                {stats.usage && (
                                  <>
                                    <div className="mt-2 pt-2 border-t border-[#808080]">Token Usage:</div>
                                    <div>  Total: {stats.usage.totalTokens.toLocaleString()}</div>
                                    <div>  Input: {stats.usage.promptTokens.toLocaleString()}</div>
                                    <div>  Output: {stats.usage.completionTokens.toLocaleString()}</div>
                                  </>
                                )}
                                {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                                  <div className="mt-1">Est. Cost: ${stats.estimatedCost.toFixed(6)}</div>
                                )}
                                {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                                  <div>Water Usage: ~{stats.estimatedWaterUsage.toFixed(2)} liters</div>
                                )}
                                {stats.currencyInfo && (
                                  <div className="mt-2 pt-2 border-t border-[#808080]">
                                    Exchange Rate: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <p className="text-xs text-black">
                      Best viewed in Internet Explorer 6.0 at 800x600 resolution
                    </p>
                    <p className="text-xs text-black mt-1">
                      <span className="text-[#0000EE] underline cursor-pointer hover:text-[#ff0000]">Sign my guestbook!</span> |
                      <span className="text-[#0000EE] underline cursor-pointer hover:text-[#ff0000] ml-1">Add to favorites</span> |
                      <span className="text-[#0000EE] underline cursor-pointer hover:text-[#ff0000] ml-1">Email webmaster</span>
                    </p>
                    <div className="mt-3 flex justify-center gap-4">
                      <div className="border-2 border-[#808080] p-1 bg-[#c0c0c0]" style={{ borderStyle: 'outset' }}>
                        <div className="text-[10px] text-black font-bold">NETSCAPE</div>
                        <div className="text-[8px] text-black">NOW!</div>
                      </div>
                      <div className="border-2 border-[#808080] p-1 bg-[#c0c0c0]" style={{ borderStyle: 'outset' }}>
                        <div className="text-[10px] text-black font-bold">Made with</div>
                        <div className="text-[8px] text-[#ff0000]">Notepad</div>
                      </div>
                      <div className="border-2 border-[#808080] p-1 bg-[#c0c0c0]" style={{ borderStyle: 'outset' }}>
                        <div className="text-[10px] text-black font-bold">Y2K</div>
                        <div className="text-[8px] text-black">COMPLIANT</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="bg-[#ece9d8] px-2 py-0.5 border-t border-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-black">
                    <span className={isConverting ? "text-yellow-500" : result !== null ? "text-green-600" : "text-blue-600"}>●</span>
                    <span>{isConverting ? "Converting..." : result !== null ? "Conversion complete" : "Ready to convert"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-black">
                    <span>Internet</span>
                    <div className="w-16 h-3 bg-white border border-[#808080]" style={{ borderStyle: 'inset' }}>
                      <div
                        className={`h-full bg-[#000080] transition-all duration-300 ${isConverting ? 'loading-bar' : ''}`}
                        style={{ width: isConverting ? '50%' : result !== null ? '100%' : '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}
            </section>

            {/* Footer link - fixed at bottom */}
            <div className="fixed bottom-4 left-0 right-0 text-center z-10">
              <a href="https://x.com/realjoecode" target="_blank" rel="noreferrer" className="text-xs text-gray-300 hover:text-white hover:underline">
                Contact Webmaster
              </a>
            </div>
          </>
        )}

        {variant === "benchmark" && (
          <section className="w-full">
            <Benchmark />
          </section>
        )}

        {variant === "tron" && (
          <section className="space-y-8 relative z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-2xl">
                <div className="relative">
                  <input
                    ref={tronStep === "from" ? fromInputRef : tronStep === "to" ? toInputRef : null}
                    value={tronStep === "from" ? fromText : toText}
                    onChange={(e) => {
                      if (tronStep === "from") {
                        setFromText(e.target.value);
                      } else if (tronStep === "to") {
                        setToText(e.target.value);
                      }
                    }}
                    onKeyDown={handleTronKeyDown}
                    placeholder={
                      tronStep === "from" ? "ENTER SOURCE..." :
                      tronStep === "to" ? "ENTER TARGET..." :
                      "CONVERTING..."
                    }
                    disabled={isConverting}
                    className="w-full bg-black/80 backdrop-blur-sm text-cyan-400 text-2xl font-mono px-8 py-6 outline-none border-2 border-cyan-500/50 focus:border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)] focus:shadow-[0_0_30px_rgba(0,255,255,0.6)] transition-all duration-300 placeholder-cyan-700/50 text-center"
                    style={{
                      textShadow: '0 0 10px rgba(0,255,255,0.8)',
                    }}
                  />
                  {tronStep === "to" && (
                    <div className="flex justify-center mt-3">
                      <SuggestionButtons
                        fromText={fromText}
                        toText={toText}
                        onSelectSuggestion={handleSelectSuggestion}
                        variant={variant}
                      />
                    </div>
                  )}
                  <div className="absolute -bottom-8 left-0 right-0 text-center text-cyan-500/60 text-sm font-mono">
                    {tronStep === "from" && fromText && "[PRESS ENTER TO CONTINUE]"}
                    {tronStep === "to" && toText && "[PRESS ENTER TO CONVERT]"}
                    {isConverting && "[PROCESSING...]"}
                  </div>
                </div>
              </div>
              
              {(fromText || toText) && !isConverting && (
                <div className="flex gap-4">
                  <button
                    onClick={handleClear}
                    className="px-6 py-2 bg-transparent border border-cyan-500/50 text-cyan-400 font-mono hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all duration-300"
                  >
                    [RESET]
                  </button>
                  {result && (
                    <button
                      onClick={handleShare}
                      className="px-6 py-2 bg-transparent border border-cyan-500/50 text-cyan-400 font-mono hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all duration-300"
                    >
                      [SHARE]
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {variant !== "terminal" && variant !== "minimal" && variant !== "tron" && variant !== "orb" && variant !== "raw" && variant !== "y2k" && (
          <section className={variant === "tunnel" ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}>
            {variant === "tunnel" ? (
              <>
                <div className="flex items-center gap-2">
                  <Button onClick={handleConvert} disabled={!canConvert || isConverting} className="rounded-none h-8 px-3">
                    {isConverting ? "Converting..." : "Convert"}
                  </Button>
                  <Button variant="secondary" onClick={handleClear} className="rounded-none h-8 px-3">
                    Clear
                  </Button>
                </div>
                <Button variant="link" onClick={handleShare} className="h-auto px-0">
                  Share
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleConvert} disabled={!canConvert || isConverting}>
                  {isConverting ? "Converting..." : "Convert"}
                </Button>
                <Button variant="secondary" onClick={handleClear}>
                  Clear
                </Button>
                <Button variant="outline" onClick={handleShare} className="ml-auto">
                  Share
                </Button>
              </>
            )}
          </section>
        )}

        {variant === "terminal" && (
          <section className="flex justify-end">
            <button
              onClick={handleShare}
              className="text-green-400 hover:text-green-300 font-mono text-sm px-3 py-1 border border-green-400/30 hover:border-green-400/50 bg-black/50 hover:bg-black/70 transition-colors"
            >
              [share]
            </button>
          </section>
        )}

        {result !== null && variant === "tron" && (
          <section className="relative z-10">
            <div className="bg-black/80 backdrop-blur-sm border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.3)] p-8">
              <div className="text-cyan-500/70 text-sm font-mono mb-2">[RESULT]</div>
              <div className="text-cyan-400 text-3xl font-mono mb-6" style={{ textShadow: '0 0 10px rgba(0,255,255,0.8)' }}>
                {result}
              </div>
              {explanation && (
                <div className="border-t border-cyan-500/30 pt-4">
                  <div className="text-cyan-500/70 text-sm font-mono mb-2">[EXPLANATION]</div>
                  <div className="text-cyan-400/80 text-sm font-mono leading-relaxed">
                    {explanation}
                  </div>
                </div>
              )}
              {stats && (
                <div className="border-t border-cyan-500/30 pt-4 mt-4">
                  <button
                    className="text-cyan-500/70 text-sm font-mono mb-2 hover:text-cyan-400"
                    onClick={() => setShowStats((v) => !v)}
                  >
                    [STATS FOR NERDS] {showStats ? "▼" : "▶"}
                  </button>
                  {showStats && (
                    <div className="text-cyan-400/60 text-xs font-mono space-y-1">
                      <div>CONVERSION_TIME: {stats.conversionTime.toFixed(3)}s</div>
                      <div>MODEL: {stats.model}</div>
                      <div>TIMESTAMP: {new Date(stats.timestamp).toLocaleString()}</div>
                      {stats.usage && (
                        <>
                          <div className="pt-2 mt-2 border-t border-cyan-500/20" />
                          <div>TOKENS_TOTAL: {stats.usage.totalTokens.toLocaleString()}</div>
                          <div>TOKENS_INPUT: {stats.usage.promptTokens.toLocaleString()}</div>
                          <div>TOKENS_OUTPUT: {stats.usage.completionTokens.toLocaleString()}</div>
                        </>
                      )}
                      {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                        <div>ESTIMATED_COST: ${stats.estimatedCost.toFixed(6)}</div>
                      )}
                      {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                        <div>WATER_USAGE: ~{stats.estimatedWaterUsage.toFixed(2)}L</div>
                      )}
                      {stats.currencyInfo && (
                        <>
                          <div className="pt-2 mt-2 border-t border-cyan-500/20" />
                          <div>EXCHANGE_RATE: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {result !== null && variant !== "tron" && variant !== "orb" && variant !== "raw" && variant !== "y2k" && (
          <section>
            {variant === "minimal" ? (
              <div className="space-y-3">
                <div className="text-2xl font-light text-white">
                  {result}
                </div>
                {explanation && (
                  <div className="text-sm text-gray-400">
                    {explanation}
                  </div>
                )}
                {stats && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <button
                      className="text-xs font-mono text-gray-500 hover:text-gray-400"
                      onClick={() => setShowStats((v) => !v)}
                    >
                      Stats for Nerds {showStats ? "▼" : "▶"}
                    </button>
                    {showStats && (
                      <div className="mt-2 text-xs font-mono text-gray-500 space-y-1">
                        <div>Conversion time: {stats.conversionTime.toFixed(3)} seconds</div>
                        <div>Model: {stats.model}</div>
                        <div>Timestamp: {new Date(stats.timestamp).toLocaleString()}</div>
                        {stats.usage && (
                          <>
                            <div className="pt-1 border-t border-gray-700 mt-2" />
                            <div>Tokens: {stats.usage.totalTokens.toLocaleString()}</div>
                            <div className="pl-3">Input: {stats.usage.promptTokens.toLocaleString()}</div>
                            <div className="pl-3">Output: {stats.usage.completionTokens.toLocaleString()}</div>
                          </>
                        )}
                        {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                          <div>Cost: ${stats.estimatedCost.toFixed(6)}</div>
                        )}
                        {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                          <div>Water: ~{stats.estimatedWaterUsage.toFixed(2)}L</div>
                        )}
                        {stats.currencyInfo && (
                          <>
                            <div className="pt-1 border-t border-gray-700 mt-2" />
                            <div>Exchange: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border bg-card">
                <div className="p-4">
                  <div className="text-sm text-muted-foreground">Result</div>
                  <div className="mt-1 text-2xl font-semibold min-h-9">
                    {result}
                  </div>
                </div>
                <div className="border-t">
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-secondary/60"
                    onClick={() => setIsOpen((v) => !v)}
                    disabled={!explanation}
                  >
                    Explanation{!explanation ? " (unavailable)" : ""}
                  </button>
                  {isOpen && explanation && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground">
                      {explanation}
                    </div>
                  )}
                </div>
                {stats && (
                  <div className="border-t">
                    <button
                      className="w-full text-left px-4 py-3 text-sm hover:bg-secondary/60 font-mono"
                      onClick={() => setShowStats((v) => !v)}
                    >
                      Stats for Nerds
                    </button>
                    {showStats && (
                      <div className="px-4 pb-4 text-xs font-mono text-muted-foreground space-y-1">
                        <div>Conversion time: {stats.conversionTime.toFixed(3)} seconds</div>
                        <div>Model: {stats.model}</div>
                        <div>Timestamp: {new Date(stats.timestamp).toLocaleString()}</div>
                        {stats.usage && (
                          <>
                            <div className="pt-2 mt-2 border-t border-border" />
                            <div>Total tokens: {stats.usage.totalTokens.toLocaleString()}</div>
                            <div className="pl-3">Input: {stats.usage.promptTokens.toLocaleString()}</div>
                            <div className="pl-3">Output: {stats.usage.completionTokens.toLocaleString()}</div>
                          </>
                        )}
                        {stats.estimatedCost !== null && stats.estimatedCost !== undefined && (
                          <div>Estimated cost: ${stats.estimatedCost.toFixed(6)}</div>
                        )}
                        {stats.estimatedWaterUsage !== null && stats.estimatedWaterUsage !== undefined && (
                          <div>Water usage: ~{stats.estimatedWaterUsage.toFixed(2)} liters</div>
                        )}
                        {stats.currencyInfo && (
                          <>
                            <div className="pt-2 mt-2 border-t border-border" />
                            <div>Exchange rate: 1 {stats.currencyInfo.from} = {stats.currencyInfo.rate.toFixed(6)} {stats.currencyInfo.to}</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Keyboard shortcuts help button */}
        {variant !== "y2k" && variant !== "terminal" && (
          <div className={`${
            variant === "orb" ? "fixed bottom-20 right-6 z-20" :
            variant === "raw" ? "fixed bottom-20 right-4 z-20" :
            variant === "tron" ? "fixed bottom-6 right-6 z-20" :
            "fixed bottom-6 right-6 z-20"
          }`}>
            <button
              onClick={() => setShowKeyboardHelp((v) => !v)}
              className={`${
                variant === "tron"
                  ? "w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                  : variant === "orb"
                  ? "w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400/60 hover:bg-blue-500/20 hover:text-blue-300"
                  : variant === "raw"
                  ? "w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  : variant === "minimal"
                  ? "w-10 h-10 rounded-full bg-gray-700 border border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-gray-300"
                  : "w-10 h-10 rounded-full bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              } transition-all duration-200 flex items-center justify-center font-mono text-sm`}
              title="Keyboard shortcuts (Press ?)"
            >
              ?
            </button>
          </div>
        )}

        {/* Keyboard shortcuts help modal */}
        {showKeyboardHelp && variant !== "y2k" && variant !== "terminal" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowKeyboardHelp(false)}
          >
            <div
              className={`${
                variant === "tron"
                  ? "bg-black/90 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,255,0.3)] text-cyan-400"
                  : variant === "orb"
                  ? "bg-[#050a14]/95 border border-blue-500/30 text-blue-200"
                  : variant === "raw"
                  ? "bg-black/95 border border-gray-600 text-white"
                  : variant === "minimal"
                  ? "bg-[#333438]/95 border border-gray-600 text-white"
                  : "bg-card border border-border"
              } p-6 rounded-lg max-w-md w-full mx-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`text-xl font-bold mb-4 ${
                variant === "tron" ? "font-mono text-cyan-400" :
                variant === "orb" ? "font-[family-name:var(--font-instrument-serif)] text-blue-100" :
                variant === "raw" ? "font-mono" :
                ""
              }`}>
                Keyboard Shortcuts
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>Ctrl/Cmd + K</kbd>
                  <span className="text-sm">Focus &quot;From&quot; input</span>
                </div>
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>Ctrl/Cmd + L</kbd>
                  <span className="text-sm">Focus &quot;To&quot; input</span>
                </div>
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>Ctrl/Cmd + Enter</kbd>
                  <span className="text-sm">Convert</span>
                </div>
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>Escape</kbd>
                  <span className="text-sm">Clear all inputs</span>
                </div>
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>Ctrl/Cmd + Shift + C</kbd>
                  <span className="text-sm">Copy result</span>
                </div>
                <div className="flex justify-between items-center">
                  <kbd className={`px-2 py-1 text-xs rounded ${
                    variant === "tron" ? "bg-cyan-500/20 border border-cyan-500/40" :
                    variant === "orb" ? "bg-blue-500/20 border border-blue-500/30" :
                    variant === "raw" ? "bg-gray-800 border border-gray-600 font-mono" :
                    variant === "minimal" ? "bg-gray-700 border border-gray-600" :
                    "bg-secondary border border-border"
                  }`}>?</kbd>
                  <span className="text-sm">Toggle this help</span>
                </div>
              </div>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className={`mt-6 w-full py-2 rounded transition-colors ${
                  variant === "tron"
                    ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
                    : variant === "orb"
                    ? "bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
                    : variant === "raw"
                    ? "bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 font-mono"
                    : variant === "minimal"
                    ? "bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600"
                    : "bg-secondary border border-border hover:bg-secondary/80"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        )}

<footer className={`${variant === "minimal" ? "pt-4" : "pt-6"} text-center text-sm ${variant === "tron" ? "relative z-10" : variant === "orb" ? "fixed bottom-6 left-0 right-0 z-10" : variant === "raw" ? "fixed bottom-4 right-4" : variant === "y2k" ? "hidden" : ""}`}>
          <div className={`inline-block px-4 py-2 ${
            variant === "terminal"
              ? "rounded-lg text-muted-foreground bg-black/70 backdrop-blur-sm border border-gray-600/50"
              : variant === "tron"
              ? "rounded-lg bg-black/70 backdrop-blur-sm border border-cyan-500/30 text-cyan-500/60 font-mono"
              : variant === "orb"
              ? "text-blue-500/40 font-[family-name:var(--font-instrument-serif)]"
              : variant === "raw"
              ? "text-gray-600 font-mono text-xs"
              : "rounded-lg text-muted-foreground"
          }`}>
            {variant === "minimal" || variant === "orb" || variant === "raw" ? (
              <span className={
                variant === "orb" ? "text-blue-500/40" : 
                variant === "raw" ? "text-gray-600" : 
                "text-gray-500"
              }>
                by <a href="https://x.com/realjoecode" className={
                  variant === "orb" ? "hover:text-blue-300" : 
                  variant === "raw" ? "hover:text-gray-400" : 
                  "hover:text-white/50"
                } target="_blank" rel="noreferrer">joecode</a>
              </span>
            ) : (
              <>
                built by <a href="https://x.com/realjoecode" className="underline hover:text-foreground" target="_blank" rel="noreferrer">joecode</a>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

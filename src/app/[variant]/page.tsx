"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AsciiWave } from "@/components/ascii-wave";
import AsciiTunnelBackground from "@/components/ascii-tunnel-background";
import { Terminal } from "@/components/terminal";
import { useUiVariant } from "@/hooks/ui-variant";
import { useAiModel } from "@/hooks/ai-model";
import LetterGlitch from "@/components/LetterGlitch";
import dynamic from "next/dynamic";
import Orb from "@/components/Orb";
import { SuggestionButtons } from "@/components/suggestion-buttons";

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
  const [stats, setStats] = useState<{ conversionTime: number; model: string; timestamp: string } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [tronStep, setTronStep] = useState<"from" | "to" | "ready">("from");
  const [orbStep, setOrbStep] = useState<"from" | "to" | "ready">("from");
  const [rawStep, setRawStep] = useState<"from" | "to" | "ready">("from");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

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

      const data: { content?: string; stats?: { conversionTime: number; model: string; timestamp: string } } = await resp.json();
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

  return (
    <div className={`min-h-screen w-full flex ${
      variant === "minimal" ? "items-start justify-center pt-[40vh]" :
      variant === "tron" || variant === "orb" || variant === "raw" ? "items-center justify-center" : "items-center justify-center"
    } p-6 ${
      variant === "minimal" ? "bg-[#333438]" :
      variant === "tron" || variant === "raw" ? "bg-black" :
      variant === "orb" ? "bg-[#050a14]" : "relative"
    }`}>
      {variant === "orb" && (
        <div className="fixed inset-0 z-0 flex items-center justify-center">
          <div className="absolute top-12 left-0 right-0 text-center z-20">
            <h2 className="text-6xl md:text-7xl text-blue-200/80 font-[family-name:var(--font-instrument-serif)] italic tracking-wide">
              {greeting}, Sir.
            </h2>
          </div>
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
        {variant !== "terminal" && variant !== "minimal" && variant !== "orb" && variant !== "raw" && (
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

        {variant === "tron" && (
          <section className="space-y-8 relative z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-2xl">
                <div className="relative">
                  <input
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

        {variant !== "terminal" && variant !== "minimal" && variant !== "tron" && variant !== "orb" && variant !== "raw" && (
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {result !== null && variant !== "tron" && variant !== "orb" && variant !== "raw" && (
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

<footer className={`${variant === "minimal" ? "pt-4" : "pt-6"} text-center text-sm ${variant === "tron" ? "relative z-10" : variant === "orb" ? "fixed bottom-6 left-0 right-0 z-10" : variant === "raw" ? "fixed bottom-4 right-4" : ""}`}>
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

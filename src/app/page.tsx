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
import { GridScan } from "@/components/GridScan";
import Orb from "@/components/Orb";

export default function Home() {
  const { variant } = useUiVariant();
  const { selectedModel } = useAiModel();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tronStep, setTronStep] = useState<"from" | "to" | "ready">("from");
  const [orbStep, setOrbStep] = useState<"from" | "to" | "ready">("from");
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
            'You are the Everything Converter. Define semantics precisely: interpret "X to Y" as "how many X make one Y" when X is not a numeric quantity (assume 1 X). If X is a numeric quantity with units, convert that quantity into units of Y. Think step-by-step INTERNALLY for accuracy; do not reveal reasoning. Use authoritative magnitudes where applicable. Return ONLY strict JSON {"result": string, "explanation": string}. The explanation must include a single formula with the numeric values used and NO alternate or contradictory equivalences. No extra text, no code fences. Dont show the from conversion in the result, only the conversion result. Use european metrics for units. Never ft. inches, ounces, and so on, unless the user prompts for it.',
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

      const data: { content?: string } = await resp.json();
      let content = (data?.content || "").trim();

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
    setTronStep("from");
    setOrbStep("from");
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

  return (
    <div className={`min-h-screen w-full flex ${
      variant === "minimal" ? "items-start justify-center pt-[40vh]" :
      variant === "tron" || variant === "orb" ? "items-center justify-center" : "items-center justify-center"
    } p-6 ${
      variant === "minimal" ? "bg-gray-900" :
      variant === "tron" ? "bg-black" :
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
        {variant !== "terminal" && variant !== "minimal" && variant !== "orb" && (
          <header className="flex items-center justify-between relative z-10">
            {variant === "tunnel" ? (
              <pre className="w-full text-center m-0 whitespace-pre font-mono leading-none text-primary/90 text-xs sm:text-sm">
{`▄▖▌               ▗ ▘                  ▗
▐ ▛▌█▌  █▌▌▌█▌▛▘▌▌▜▘▌▛▌▛▌  ▛▘▛▌▛▌▌▌█▌▛▘▜▘█▌▛▘
▐ ▌▌▙▖  ▙▖▚▘▙▖▌ ▙▌▐▖▌▌▌▙▌  ▙▖▙▌▌▌▚▘▙▖▌ ▐▖▙▖▌
                ▄▌     ▄▌                      `}
              </pre>
            ) : (
              <h1 className={`w-full text-center font-semibold tracking-tight ${variant === "tron" ? "font-[family-name:var(--font-tr2n)] text-6xl text-cyan-400 mb-8" : "text-xl"}`} style={variant === "tron" ? { textShadow: '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(0,255,255,0.4)' } : {}}>The Everything Converter</h1>
            )}
          </header>
        )}

        {variant === "classic" && (
        <section className="space-y-2 relative">
          <div className="absolute top-0 right-0 text-xs text-muted-foreground bg-secondary/80 px-2 py-1 rounded-md border">
            Try the other themes →
          </div>
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

        {variant !== "terminal" && variant !== "minimal" && variant !== "tron" && variant !== "orb" && (
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
            </div>
          </section>
        )}

        {result !== null && variant !== "tron" && variant !== "orb" && (
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
              </div>
            )}
          </section>
        )}

<footer className={`${variant === "minimal" ? "pt-4" : "pt-6"} text-center text-sm ${variant === "tron" ? "relative z-10" : variant === "orb" ? "fixed bottom-6 left-0 right-0 z-10" : ""}`}>
          <div className={`inline-block px-4 py-2 rounded-lg text-muted-foreground ${
            variant === "terminal"
              ? "bg-black/70 backdrop-blur-sm border border-gray-600/50"
              : variant === "tron"
              ? "bg-black/70 backdrop-blur-sm border border-cyan-500/30 text-cyan-500/60 font-mono"
              : variant === "orb"
              ? "text-blue-500/40 font-[family-name:var(--font-instrument-serif)]"
              : ""
          }`}>
            {variant === "minimal" || variant === "orb" ? (
              <span className={variant === "orb" ? "text-blue-500/40" : "text-gray-500"}>
                by <a href="https://x.com/realjoecode" className={variant === "orb" ? "hover:text-blue-300" : "hover:text-white/50"} target="_blank" rel="noreferrer">joecode</a>
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

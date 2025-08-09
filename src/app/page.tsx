"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AsciiWave } from "@/components/ascii-wave";
import AsciiTunnelBackground from "@/components/ascii-tunnel-background";
import { UiVariantToggle } from "@/components/ui/ui-variant-toggle";
import { useUiVariant } from "@/hooks/ui-variant";

export default function Home() {
  const { variant } = useUiVariant();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const canConvert = useMemo(() => fromText.trim() !== "" && toText.trim() !== "", [fromText, toText]);

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
            'You are the Everything Converter. Define semantics precisely: interpret "X to Y" as "how many X make one Y" when X is not a numeric quantity (assume 1 X). If X is a numeric quantity with units, convert that quantity into units of Y. Think step-by-step INTERNALLY for accuracy; do not reveal reasoning. Use authoritative magnitudes where applicable. Return ONLY strict JSON {"result": string, "explanation": string}. The explanation must include a single formula with the numeric values used and NO alternate or contradictory equivalences. No extra text, no code fences.',
        },
        {
          role: "user",
          content: `Convert ${JSON.stringify(fromText)} into ${JSON.stringify(toText)}. Output a single consistent result and a concise formula-based explanation.`,
        },
      ];

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, temperature: 0.2, topP: 0.1, stream: false, from: fromText, to: toText }),
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
  }, [canConvert, fromText, toText]);

  const handleClear = useCallback(() => {
    setFromText("");
    setToText("");
    setResult(null);
    setExplanation(null);
    setIsOpen(false);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("from", fromText);
      url.searchParams.set("to", toText);
      if (result) url.searchParams.set("result", result);
      await navigator.clipboard.writeText(url.toString());
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, [fromText, toText, result]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6">
      {variant === "tunnel" && <AsciiTunnelBackground />}
      <main className="relative z-10 w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          {variant === "tunnel" ? (
            <pre className="w-full text-center m-0 whitespace-pre font-mono leading-none text-primary/90 text-xs sm:text-sm">
{`▄▖▌               ▗ ▘                  ▗       
▐ ▛▌█▌  █▌▌▌█▌▛▘▌▌▜▘▌▛▌▛▌  ▛▘▛▌▛▌▌▌█▌▛▘▜▘█▌▛▘  
▐ ▌▌▙▖  ▙▖▚▘▙▖▌ ▙▌▐▖▌▌▌▙▌  ▙▖▙▌▌▌▚▘▙▖▌ ▐▖▙▖▌   
                ▄▌     ▄▌                      `}
            </pre>
          ) : (
            <h1 className="w-full text-center text-xl font-semibold tracking-tight">The Everything Converter</h1>
          )}
        </header>

        {variant === "classic" && (
        <section className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">From</label>
              <input
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
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
                placeholder="mount everest height"
                className="mt-1 w-full rounded-md bg-secondary px-3 py-3 outline-none ring-1 ring-transparent focus:ring-ring"
              />
            </div>
          </div>
        </section>
        )}

        {variant === "termial" && (
          <section className="p-8 text-center text-muted-foreground border rounded-lg">
            termial ui coming soon
          </section>
        )}

        {variant === "tunnel" && (
          <section className="p-0">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
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
                  placeholder="mount everest height"
                  className="w-full rounded-sm bg-transparent px-3 py-2 outline-none ring-1 ring-transparent focus:ring-ring border border-white/20"
                />
              </div>
            </div>
          </section>
        )}

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

        {result !== null && (
          <section className="rounded-lg border bg-card">
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
          </section>
        )}

        <footer className="pt-6 text-center text-sm text-muted-foreground">
          built by <a href="https://x.com/realjoecode" className="underline hover:text-foreground" target="_blank" rel="noreferrer">joecode</a>
        </footer>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BenchmarkBootSequence } from "./benchmark/BenchmarkBootSequence";
import { BenchmarkResults, type BenchmarkResult } from "./benchmark/BenchmarkResults";
import { AsciiBox } from "./benchmark/AsciiBox";
import "./Benchmark.css";

const MODEL_OPTIONS = [
  { label: "GPT-5.1", value: "openai/gpt-5.1-chat" },
  { label: "Claude Haiku 4.5", value: "anthropic/claude-haiku-4.5" },
  { label: "GPT-5 Nano", value: "openai/gpt-5-nano" },
  { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
  { label: "Grok 4.1 Fast", value: "x-ai/grok-4.1-fast" },
  { label: "Gemini 2.5 Flash Lite", value: "google/gemini-2.5-flash-lite" },
];

export function Benchmark() {
  const [bootComplete, setBootComplete] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "openai/gpt-5.1-chat",
    "anthropic/claude-haiku-4.5",
  ]);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentModelIndex, setCurrentModelIndex] = useState(-1);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/benchmark-complete.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const playCompletionSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.log("Audio play failed (browser may block autoplay):", err);
      });
    }
  }, [soundEnabled]);

  const toggleModel = (modelValue: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelValue)) {
        return prev.filter((m) => m !== modelValue);
      } else {
        return [...prev, modelValue];
      }
    });
  };

  const runBenchmark = async () => {
    if (selectedModels.length < 2) {
      alert("Please select at least 2 models to benchmark");
      return;
    }

    if (!fromText.trim() || !toText.trim()) {
      alert("Please enter both 'from' and 'to' conversion values");
      return;
    }

    setIsRunning(true);
    setResults([]);
    setCurrentModelIndex(0);

    for (let i = 0; i < selectedModels.length; i++) {
      setCurrentModelIndex(i);
      const modelValue = selectedModels[i];
      const modelLabel = MODEL_OPTIONS.find((m) => m.value === modelValue)?.label || modelValue;

      try {
        const startTime = performance.now();

        const messages = [
          {
            role: "system",
            content:
              'You are the Everything Converter. Define semantics precisely: interpret "X to Y" as "how many X make one Y" when X is not a numeric quantity (assume 1 X). If X is a numeric quantity with units, convert that quantity into units of Y. Think step-by-step INTERNALLY for accuracy; do not reveal reasoning. Use authoritative magnitudes where applicable. Return ONLY strict JSON {"result": string, "explanation": string}. The explanation must include a single formula with the numeric values used and NO alternate or contradictory equivalences. No extra text, no code fences.',
          },
          {
            role: "user",
            content: `Convert ${JSON.stringify(fromText)} into ${JSON.stringify(
              toText
            )}. Output a single consistent result and a concise formula-based explanation.`,
          },
        ];

        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages,
            temperature: 0.2,
            topP: 0.1,
            stream: false,
            from: fromText,
            to: toText,
            model: modelValue,
          }),
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        if (!resp.ok) {
          throw new Error(`Request failed: ${resp.status}`);
        }

        const data = await resp.json();
        let content = (data?.content || "").trim();

        // Strip code fences if present
        const stripFences = (s: string) => {
          if (s.startsWith("````") || s.startsWith("```")) {
            const first = s.indexOf("\n");
            if (first !== -1) s = s.slice(first + 1);
            if (s.endsWith("```")) s = s.slice(0, -3);
          }
          return s.trim();
        };
        content = stripFences(content);

        // Parse JSON response
        let parsed: { result?: string; explanation?: string } | null = null;
        try {
          parsed = JSON.parse(content);
        } catch {
          // If parsing fails, treat content as result
          parsed = { result: content, explanation: "" };
        }

        setResults((prev) => [
          ...prev,
          {
            modelId: modelValue,
            modelName: modelLabel,
            result: parsed?.result || content,
            explanation: parsed?.explanation || "",
            responseTime,
            tokenCount: data?.stats?.usage?.totalTokens || 0,
            estimatedCost: data?.stats?.estimatedCost || 0,
            status: "success",
          },
        ]);

        // Delay between models (500ms)
        if (i < selectedModels.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        const modelLabel = MODEL_OPTIONS.find((m) => m.value === modelValue)?.label || modelValue;
        setResults((prev) => [
          ...prev,
          {
            modelId: modelValue,
            modelName: modelLabel,
            result: "",
            explanation: "",
            responseTime: 0,
            tokenCount: 0,
            estimatedCost: 0,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        ]);
      }
    }

    setIsRunning(false);
    setCurrentModelIndex(-1);
    playCompletionSound();
  };

  // Boot sequence
  if (!bootComplete) {
    return (
      <div className="benchmark-container">
        <BenchmarkBootSequence onComplete={() => setBootComplete(true)} />
      </div>
    );
  }

  return (
    <div className="benchmark-container">
      <div className="benchmark-content p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold benchmark-text-glow mb-2" style={{ color: "#00FF00" }}>
            ╔═══════════════════════════════════════════╗
            <br />
            ║ AI MODEL BENCHMARK SUITE v2.99 ║
            <br />
            ╚═══════════════════════════════════════════╝
          </h1>
          <p className="text-sm benchmark-text-cyan">Compare AI models on conversion tasks</p>
        </div>

        {/* Model Selection */}
        <AsciiBox title="SELECT MODELS TO BENCHMARK">
          <div className="space-y-2">
            <p className="text-sm mb-3" style={{ color: "#00FFFF" }}>
              Select at least 2 models (click to toggle):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODEL_OPTIONS.map((model) => {
                const isSelected = selectedModels.includes(model.value);
                return (
                  <label
                    key={model.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-black/30 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModel(model.value)}
                      disabled={isRunning}
                      className="benchmark-checkbox"
                    />
                    <span style={{ color: isSelected ? "#00FFFF" : "#00FF00" }}>
                      {model.label}
                    </span>
                    <span className="ml-auto text-xs" style={{ color: "#00FF00" }}>
                      {isSelected ? "▓▓▓▓▓▓░░ READY" : "░░░░░░░░ STANDBY"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </AsciiBox>

        {/* Conversion Input */}
        <AsciiBox title="CONVERSION PARAMETERS">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2 benchmark-text-cyan">FROM:</label>
              <input
                type="text"
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                disabled={isRunning}
                placeholder="e.g., 100 horsepower"
                className="benchmark-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 benchmark-text-cyan">TO:</label>
              <input
                type="text"
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                disabled={isRunning}
                placeholder="e.g., washing machines"
                className="benchmark-input w-full"
              />
            </div>
          </div>
        </AsciiBox>

        {/* Run Button & Progress */}
        <div className="text-center space-y-4">
          <button
            onClick={runBenchmark}
            disabled={isRunning || selectedModels.length < 2}
            className="benchmark-button"
          >
            {isRunning ? "▓ TESTING IN PROGRESS ▓" : "▓▓▓ RUN BENCHMARK ▓▓▓"}
          </button>

          {/* Sound toggle */}
          <div className="flex items-center justify-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="benchmark-checkbox"
                style={{ width: "14px", height: "14px" }}
              />
              <span style={{ color: "#00FF00" }}>Sound effects</span>
            </label>
          </div>

          {/* Progress indicator */}
          {isRunning && (
            <div className="space-y-2">
              <div className="benchmark-text-yellow text-sm">
                Testing model {currentModelIndex + 1} of {selectedModels.length}:{" "}
                {MODEL_OPTIONS.find((m) => m.value === selectedModels[currentModelIndex])?.label}
                <span className="benchmark-loading"></span>
              </div>
              <div className="benchmark-progress-bar max-w-md mx-auto">
                <div
                  className="benchmark-progress-fill"
                  style={{
                    width: `${((currentModelIndex + 1) / selectedModels.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && !isRunning && (
          <BenchmarkResults results={results} conversion={{ from: fromText, to: toText }} />
        )}

        {/* System status footer */}
        <div className="text-center text-xs benchmark-system-status" style={{ color: "#00FF00" }}>
          <div className="opacity-50">
            System Status: {isRunning ? "TESTING..." : "IDLE"} | Models Selected:{" "}
            {selectedModels.length} | Sound: {soundEnabled ? "ON" : "OFF"}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAiModel } from "@/hooks/ai-model";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "system" | "prompt" | "loading" | "result" | "explanation" | "stats";
  content: string;
  timestamp: Date;
}

type TerminalState = "idle" | "awaiting_from" | "awaiting_to" | "converting" | "generating_surprise";

export function Terminal() {
  const { selectedModel } = useAiModel();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [state, setState] = useState<TerminalState>("idle");
  const [tempFrom, setTempFrom] = useState("");
  const [loadingFrame, setLoadingFrame] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    const newLine: TerminalLine = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
    };
    setLines(prev => {
      // Remove any existing prompt lines before adding a new one
      if (type === "prompt") {
        return [...prev.filter(line => line.type !== "prompt"), newLine];
      }
      return [...prev, newLine];
    });
  }, []);

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [lines]); // Focus whenever lines change (including when new prompt is added)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Initialize terminal with welcome message
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      addLine("system", "Everything Converter Terminal v1.0");
      addLine("system", "Type 'start' to begin conversion, 'help' for commands, 'clear' to reset");
      addLine("prompt", "");
    }
  }, [addLine]);

  // Loading animation effect
  useEffect(() => {
    if (state === "converting") {
      const interval = setInterval(() => {
        setLoadingFrame(prev => (prev + 1) % 4);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleConvert = useCallback(async (from: string, to: string, suppressPrompt = false) => {
    if (!from.trim() || !to.trim()) {
      addLine("output", "Error: Both 'from' and 'to' values are required");
      return;
    }

    setState("converting");
    addLine("loading", `Converting ${from} -> ${to}...`);

    try {
      const messages = [
        {
          role: "system",
          content:
            'You are the Everything Converter. Define semantics precisely: interpret "X to Y" as "how many X make one Y" when X is not a numeric quantity (assume 1 X). If X is a numeric quantity with units, convert that quantity into units of Y. Think step-by-step INTERNALLY for accuracy; do not reveal reasoning. Use authoritative magnitudes where applicable. Return ONLY strict JSON {"result": string, "explanation": string}. The explanation must include a single formula with the numeric values used and NO alternate or contradictory equivalences. No extra text, no code fences.',
        },
        {
          role: "user",
          content: `Convert ${JSON.stringify(from)} into ${JSON.stringify(to)}. Output a single consistent result and a concise formula-based explanation.`,
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
          from, 
          to, 
          model: selectedModel 
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Request failed: ${resp.status}`);
      }

      const data: { content?: string; stats?: { conversionTime: number; model: string; timestamp: string } } = await resp.json();
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
        addLine("output", "");
        addLine("result", `RESULT: ${parsed.result || "N/A"}`);
if (parsed.explanation) {
          addLine("explanation", `EXPLANATION: ${parsed.explanation}`);
        }
        if (data?.stats) {
          addLine("stats", `STATS: conversion_time=${data.stats.conversionTime.toFixed(3)}s | model=${data.stats.model}`);
        }
      } else {
        addLine("output", `RESULT: ${content}`);
        if (data?.stats) {
          addLine("stats", `STATS: conversion_time=${data.stats.conversionTime.toFixed(3)}s | model=${data.stats.model}`);
        }
      }
    } catch (err) {
      console.error(err);
      addLine("output", "Error: Conversion failed. Check API key or try again.");
    } finally {
      // Remove loading line
      setLines(prev => prev.filter(line => line.type !== "loading"));
      if (!suppressPrompt) {
        setState("idle");
        addLine("prompt", "");
      }
    }
  }, [selectedModel, addLine]);

  const handleSurprise = useCallback(async () => {
    setState("generating_surprise");
    addLine("loading", "Generating surprise conversions...");

    try {
      const messages = [
        {
          role: "system",
          content: 'Generate 2 fun, creative, and simple conversion pairs. Return ONLY strict JSON: [{"from": "string", "to": "string"}, {"from": "string", "to": "string"}]. No extra text.',
        },
        {
          role: "user",
          content: "Surprise me with 2 fun conversions.",
        },
      ];

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages,
          temperature: 0.7,
          model: selectedModel,
          skipValidation: true
        }),
      });

      if (!resp.ok) throw new Error("Failed to generate surprises");

      const data = await resp.json();
      let content = data.content || "";
      
      // Try to find JSON array in the content
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        content = jsonMatch[0];
      } else {
        // Fallback cleanup
        content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      }

      let pairs;
      try {
        pairs = JSON.parse(content);
      } catch {
        console.error("Failed to parse surprise JSON:", content);
        throw new Error("Invalid JSON response");
      }
      
      // Remove loading line
      setLines(prev => prev.filter(line => line.type !== "loading"));
      
      if (Array.isArray(pairs) && pairs.length > 0) {
        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          if (pair.from && pair.to) {
            addLine("system", `Running: ${pair.from} -> ${pair.to}`);
            // Suppress prompt for all but the last one
            await handleConvert(pair.from, pair.to, i < pairs.length - 1);
            // Small delay between conversions if not the last one
            if (i < pairs.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        // Ensure we return to idle state if the last conversion suppressed it (shouldn't happen with logic above, but safe)
        setState("idle");
        if (pairs.length > 0) {
             // The last handleConvert will add the prompt, so we don't need to add it here
        } else {
             addLine("prompt", "");
        }
      } else {
        addLine("output", "No surprises generated.");
        setState("idle");
        addLine("prompt", "");
      }
    } catch (err) {
      console.error(err);
      addLine("output", "Error: Failed to generate surprises.");
      setLines(prev => prev.filter(line => line.type !== "loading"));
      setState("idle");
      addLine("prompt", "");
    }
  }, [selectedModel, addLine, handleConvert]);

  const processCommand = useCallback((command: string) => {
    const cmd = command.trim().toLowerCase();
    
    if (state === "awaiting_from") {
      setTempFrom(command.trim());
      setState("awaiting_to");
      addLine("output", `From: ${command.trim()}`);
      addLine("output", "Enter the target conversion:");
      addLine("prompt", "");
      return;
    }

    if (state === "awaiting_to") {
      const to = command.trim();
      addLine("output", `To: ${to}`);
      addLine("output", "");
      setState("idle");
      handleConvert(tempFrom, to);
      return;
    }

    // Regular commands
    switch (cmd) {
      case "start":
        setState("awaiting_from");
        addLine("output", "Starting conversion process...");
        addLine("output", "Enter what you want to convert FROM:");
        addLine("prompt", "");
        break;

      case "surprise me":
        handleSurprise();
        break;
      
      case "help":
        addLine("output", "Available commands:");
        addLine("output", "  start       - Begin conversion process");
        addLine("output", "  surprise me - Generate and run fun conversions");
        addLine("output", "  clear       - Clear terminal");
        addLine("output", "  help        - Show this help message");
        addLine("prompt", "");
        break;
      
      case "clear":
        setLines([]);
        setState("idle");
        addLine("system", "Everything Converter Terminal v1.0");
        addLine("system", "Type 'start' to begin conversion, 'help' for commands, 'clear' to reset");
        addLine("prompt", "");
        break;
      
      case "":
        addLine("prompt", "");
        break;
      
      default:
        addLine("output", `Unknown command: ${command}`);
        addLine("output", "Type 'help' for available commands");
        addLine("prompt", "");
        break;
    }
  }, [state, tempFrom, addLine, handleConvert, handleSurprise]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = currentInput.trim();
      
      // Add input line to history
      addLine("input", `$ ${input}`);
      
      // Process the command
      processCommand(input);
      
      // Clear input
      setCurrentInput("");
    }
  }, [currentInput, addLine, processCommand]);

  const getPromptPrefix = () => {
    switch (state) {
      case "awaiting_from":
        return "from> ";
      case "awaiting_to":
        return "to> ";
      case "converting":
        return "converting> ";
      case "generating_surprise":
        return "generating> ";
      default:
        return "$ ";
    }
  };

  const isInputDisabled = state === "converting" || state === "generating_surprise";

  return (
    <div className="w-full h-96 border rounded-lg bg-black/70 backdrop-blur-sm text-green-400 font-mono text-sm overflow-hidden flex flex-col">
      {/* Terminal Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-2 border-b border-gray-600 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="ml-2 text-gray-300 text-xs">Everything Converter Terminal</span>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="flex-1 p-3 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {lines.map((line) => (
          <div key={line.id} className="leading-tight">
            {line.type === "input" && (
              <div className="text-white">{line.content}</div>
            )}
{line.type === "output" && (
              <div className="text-green-400">{line.content}</div>
            )}
            {line.type === "explanation" && (
              <div className="text-blue-300 font-medium">{line.content}</div>
            )}
            {line.type === "stats" && (
              <div className="text-gray-400 text-xs">{line.content}</div>
            )}
            {line.type === "result" && (
              <div className="text-pink-500 font-semibold">{line.content}</div>
            )}
            {line.type === "system" && (
              <div className="text-blue-400">{line.content}</div>
            )}
            {line.type === "loading" && (
              <div className="text-yellow-400 flex items-center gap-2">
                <span>{["⠋", "⠙", "⠹", "⠸"][loadingFrame]}</span>
                <span>{line.content || `Converting ${tempFrom} → ${lines.find(l => l.content.includes("To:"))?.content.replace("To: ", "") || "..."}...`}</span>
              </div>
            )}
            {line.type === "prompt" && (
              <div className="flex items-center mt-2">
                <span className="text-white mr-1">{getPromptPrefix()}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isInputDisabled}
                  className="flex-1 bg-transparent border-none outline-none text-white caret-green-400"
                  placeholder={isInputDisabled ? "Processing..." : ""}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

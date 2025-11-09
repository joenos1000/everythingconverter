"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAiModel } from "@/hooks/ai-model";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "system" | "prompt";
  content: string;
  timestamp: Date;
}

type TerminalState = "idle" | "awaiting_from" | "awaiting_to" | "converting";

export function Terminal() {
  const { selectedModel } = useAiModel();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [state, setState] = useState<TerminalState>("idle");
  const [tempFrom, setTempFrom] = useState("");

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
    setLines(prev => [...prev, newLine]);
  }, []);

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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

  const handleConvert = useCallback(async (from: string, to: string) => {
    if (!from.trim() || !to.trim()) {
      addLine("output", "Error: Both 'from' and 'to' values are required");
      return;
    }

    setState("converting");
    addLine("output", `Converting '${from}' to '${to}'...`);

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
        addLine("output", "");
        addLine("output", `RESULT: ${parsed.result || "N/A"}`);
        if (parsed.explanation) {
          addLine("output", `EXPLANATION: ${parsed.explanation}`);
        }
      } else {
        addLine("output", `RESULT: ${content}`);
      }
    } catch (err) {
      console.error(err);
      addLine("output", "Error: Conversion failed. Check API key or try again.");
    } finally {
      setState("idle");
      addLine("prompt", "");
    }
  }, [selectedModel, addLine]);

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
      
      case "help":
        addLine("output", "Available commands:");
        addLine("output", "  start  - Begin conversion process");
        addLine("output", "  clear  - Clear terminal");
        addLine("output", "  help   - Show this help message");
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
  }, [state, tempFrom, addLine, handleConvert]);

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
      default:
        return "$ ";
    }
  };

  const isInputDisabled = state === "converting";

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
            {line.type === "system" && (
              <div className="text-blue-400">{line.content}</div>
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
                <span className="text-green-400 animate-pulse">█</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type AiModelContextValue = {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  options: { label: string; value: string }[];
};

const AiModelContext = createContext<AiModelContextValue | null>(null);

const MODEL_OPTIONS: { label: string; value: string }[] = [
  { label: "GPT OSS 20B", value: "openai/gpt-oss-20b:free" },
  { label: "GLM 4.5 Air", value: "z-ai/glm-4.5-air:free" },
  { label: "Qwen3 Coder", value: "qwen/qwen3-coder:free" },
  { label: "Kimi K2", value: "moonshotai/kimi-k2:free" },
  { label: "Llama 3.3 70B", value: "meta-llama/llama-3.3-70b-instruct:free" },
];

export function AiModelProvider({ children }: { children: React.ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-oss-20b:free");

  const value = useMemo<AiModelContextValue>(() => ({
    selectedModel,
    setSelectedModel,
    options: MODEL_OPTIONS,
  }), [selectedModel]);

  return <AiModelContext.Provider value={value}>{children}</AiModelContext.Provider>;
}

export function useAiModel() {
  const ctx = useContext(AiModelContext);
  if (!ctx) throw new Error("useAiModel must be used within AiModelProvider");
  return ctx;
}



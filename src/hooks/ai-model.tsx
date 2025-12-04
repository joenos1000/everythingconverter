"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type AiModelContextValue = {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  options: { label: string; value: string }[];
};

const AiModelContext = createContext<AiModelContextValue | null>(null);

const MODEL_OPTIONS: { label: string; value: string }[] = [
  { label: "GPT-5.1", value: "openai/gpt-5.1-chat"},
];

export function AiModelProvider({ children }: { children: React.ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<string>("openai/gpt-5.1-chat");

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



"use client";

import { useAiModel } from "@/hooks/ai-model";

export function ModelToggle() {
  const { selectedModel, setSelectedModel, options } = useAiModel();

  return (
    <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
      <div className="text-xs text-muted-foreground">Model:</div>
      <select
        className="rounded-md border bg-background px-2 py-1 text-sm"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}



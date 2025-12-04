"use client";

import { useSuggestions } from "@/hooks/use-suggestions";

interface SuggestionButtonsProps {
  fromText: string;
  onSelectSuggestion: (suggestion: string) => void;
  variant?: string;
}

export function SuggestionButtons({
  fromText,
  onSelectSuggestion,
  variant = "classic",
}: SuggestionButtonsProps) {
  const { suggestions, isLoading } = useSuggestions(fromText, 2000);

  // Don't show anything if there's no input or no suggestions
  if (!fromText || fromText.trim().length === 0) {
    return null;
  }

  // Show loading state
  if (isLoading && suggestions.length === 0) {
    return (
      <div className="flex gap-2 mt-2 text-xs opacity-50">
        <span>Generating suggestions...</span>
      </div>
    );
  }

  // Don't show if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  // Variant-specific styling
  const getButtonClasses = () => {
    const baseClasses =
      "px-2 py-1 text-xs rounded transition-all duration-200 whitespace-nowrap";

    switch (variant) {
      case "terminal":
        return `${baseClasses} bg-green-900/20 text-green-400 border border-green-500/30 hover:bg-green-900/40 hover:border-green-500/60`;
      case "tunnel":
        return `${baseClasses} bg-blue-900/20 text-blue-300 border border-blue-500/30 hover:bg-blue-900/40 hover:border-blue-500/60`;
      case "minimal":
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:border-gray-400`;
      case "tron":
        return `${baseClasses} bg-cyan-900/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-900/40 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]`;
      case "orb":
        return `${baseClasses} bg-purple-900/20 text-purple-300 border border-purple-500/30 hover:bg-purple-900/40 hover:border-purple-400 font-serif`;
      case "raw":
        return `${baseClasses} bg-orange-900/20 text-orange-300 border border-orange-500/30 hover:bg-orange-900/40 hover:border-orange-400 font-mono`;
      default:
        return `${baseClasses} bg-blue-500/10 text-blue-600 border border-blue-300/50 hover:bg-blue-500/20 hover:border-blue-400`;
    }
  };

  const getContainerClasses = () => {
    const baseClasses = "flex flex-wrap gap-2 mt-2";

    switch (variant) {
      case "terminal":
      case "tron":
      case "orb":
      case "raw":
        return `${baseClasses} animate-fade-in`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className={getContainerClasses()}>
      <span className="text-xs opacity-60 self-center mr-1">Try:</span>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelectSuggestion(suggestion)}
          className={getButtonClasses()}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

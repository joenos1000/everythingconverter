import { useState, useEffect, useRef } from "react";

interface UseSuggestionsResult {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
}

export function useSuggestions(
  fromText: string,
  debounceMs: number = 2000
): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset suggestions if input is empty
    if (!fromText || fromText.trim().length === 0) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set loading state immediately
    setIsLoading(true);
    setError(null);

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      try {
        // Create new abort controller for this request
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fromText }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = await response.json();

        // Only update if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setSuggestions(data.suggestions || []);
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Error fetching suggestions:", err);
        setError("Failed to generate suggestions");
        setSuggestions([]);
        setIsLoading(false);
      }
    }, debounceMs);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fromText, debounceMs]);

  return { suggestions, isLoading, error };
}

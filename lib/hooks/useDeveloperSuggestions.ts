import { useEffect, useState } from "react";
import { fetchDistinctDeveloperNames } from "@/lib/services";

/**
 * Returns autocomplete suggestions for a developer name input.
 *
 * - Debounces the query by 250 ms to avoid hammering the DB on every keystroke.
 * - Returns an empty array when the input is blank or < 1 char.
 * - Clears suggestions immediately when the user selects one (call `clear()`).
 */
export function useDeveloperSuggestions(query: string): {
  suggestions: string[];
  loading: boolean;
  clear: () => void;
} {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchDistinctDeveloperNames(trimmed);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [query]);

  function clear() {
    setSuggestions([]);
  }

  return { suggestions, loading, clear };
}


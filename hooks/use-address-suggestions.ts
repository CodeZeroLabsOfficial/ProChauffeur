"use client";

import { useEffect, useState } from "react";

import { fetchAddressSuggestions, type AddressSuggestion } from "@/lib/mapbox/geocoding";
import { getMapboxToken } from "@/lib/env";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useAddressSuggestions(query: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(false);
        try {
          const token = getMapboxToken();
          const results = await fetchAddressSuggestions(trimmed, token);
          if (!cancelled) setSuggestions(results);
        } catch {
          if (!cancelled) {
            setSuggestions([]);
            setError(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return { suggestions, loading, error };
}

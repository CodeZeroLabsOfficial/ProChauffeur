"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  searchAddresses,
  type AddressSearchHit
} from "@/lib/mapbox/address-search";
import type { AddressSearchOptions, AddressSuggestion } from "@/lib/mapbox/geocoding";
import { retrieveSearchBoxFeature } from "@/lib/mapbox/search-box";
import { getMapboxToken } from "@/lib/env";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function useAddressSuggestions(
  query: string,
  enabled = true,
  options?: AddressSearchOptions
) {
  const [suggestions, setSuggestions] = useState<AddressSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const country = options?.country ?? "";
  const proximityKey = options?.proximity
    ? `${options.proximity.longitude},${options.proximity.latitude}`
    : "";
  const sessionTokenRef = useRef(newSessionToken());

  const beginNewSession = useCallback(() => {
    sessionTokenRef.current = newSessionToken();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setError(false);
      if (!trimmed) beginNewSession();
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(false);
        try {
          const token = getMapboxToken();
          const results = await searchAddresses(trimmed, token, sessionTokenRef.current, {
            country: country || null,
            proximity: options?.proximity ?? null
          });
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
  }, [query, enabled, country, proximityKey, beginNewSession]);

  const resolveHit = useCallback(async (hit: AddressSearchHit): Promise<AddressSuggestion | null> => {
    if (hit.kind === "geocoding") {
      beginNewSession();
      return hit.suggestion;
    }

    try {
      const token = getMapboxToken();
      const suggestion = await retrieveSearchBoxFeature(
        hit.mapboxId,
        token,
        sessionTokenRef.current
      );
      beginNewSession();
      return suggestion;
    } catch {
      return null;
    }
  }, [beginNewSession]);

  return { suggestions, loading, error, resolveHit };
}

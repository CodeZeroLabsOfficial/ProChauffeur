"use client";

import { useSyncExternalStore } from "react";

import {
  getActiveFormatCurrency,
  getActiveFormatLocale,
  subscribeActiveFormatLocale
} from "@/lib/locale/active-format-locale";

/** Subscribe to Location locale so chart labels recompute when it loads. */
export function useActiveFormatLocale(): string {
  return useSyncExternalStore(
    subscribeActiveFormatLocale,
    getActiveFormatLocale,
    getActiveFormatLocale
  );
}

export function useActiveFormatCurrency(): string {
  return useSyncExternalStore(
    subscribeActiveFormatLocale,
    getActiveFormatCurrency,
    getActiveFormatCurrency
  );
}

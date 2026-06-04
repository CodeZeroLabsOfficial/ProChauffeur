"use client";

import { useEffect, useState } from "react";

/** Matches `data-[state=closed]:duration-300` on sheet content. */
export const SHEET_EXIT_ANIMATION_MS = 300;

/**
 * Keeps the last non-null item mounted while a sheet plays its exit animation.
 * Prevents unmounting sheet content before Radix can animate closed.
 */
export function useSheetDisplayItem<T>(item: T | null, open: boolean): T | null {
  const [displayItem, setDisplayItem] = useState<T | null>(null);

  useEffect(() => {
    if (item) setDisplayItem(item);
  }, [item]);

  useEffect(() => {
    if (open || !displayItem) return;

    const timeoutId = window.setTimeout(() => {
      setDisplayItem(null);
    }, SHEET_EXIT_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open, displayItem]);

  return displayItem;
}

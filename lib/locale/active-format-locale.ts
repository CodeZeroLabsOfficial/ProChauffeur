type FormatLocaleState = {
  locale: string;
  currency: string;
};

/** Dates/numbers before Location locale is loaded. Location settings override this. */
const FALLBACK_LOCALE = "en";

let state: FormatLocaleState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** BCP-47 tag for dates/currency. Location locale when set, otherwise `en`. */
export function getActiveFormatLocale(): string {
  return state?.locale || FALLBACK_LOCALE;
}

/** ISO currency for amounts. Location currency when set, otherwise empty. */
export function getActiveFormatCurrency(): string {
  return state?.currency ?? "";
}

export function setActiveFormatLocale(next: FormatLocaleState | null): void {
  const locale = next?.locale?.trim() ?? "";
  const currency = next?.currency?.trim() ?? "";
  const resolved =
    locale || currency
      ? {
          locale: locale || FALLBACK_LOCALE,
          currency
        }
      : null;
  if (state?.locale === resolved?.locale && state?.currency === resolved?.currency) return;
  state = resolved;
  emit();
}

export function subscribeActiveFormatLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

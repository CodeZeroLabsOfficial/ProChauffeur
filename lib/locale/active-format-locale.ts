import { appConfig } from "@/lib/env";

type FormatLocaleState = {
  locale: string;
  currency: string;
};

let state: FormatLocaleState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

/** BCP-47 tag for dates/currency. Location locale when set, otherwise stamp env. */
export function getActiveFormatLocale(): string {
  return state?.locale || appConfig.locale;
}

/** ISO currency for amounts. Location currency when set, otherwise stamp env. */
export function getActiveFormatCurrency(): string {
  return state?.currency || appConfig.currency;
}

export function setActiveFormatLocale(next: FormatLocaleState | null): void {
  const locale = next?.locale?.trim() ?? "";
  const currency = next?.currency?.trim() ?? "";
  const resolved =
    locale || currency
      ? {
          locale: locale || appConfig.locale,
          currency: currency || appConfig.currency
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

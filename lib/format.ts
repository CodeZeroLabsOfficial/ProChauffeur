import { appConfig } from "@/lib/env";

/** Formats a number as currency using the configured locale/currency (AU defaults). */
export function formatCurrency(value: number, currency = appConfig.currency): string {
  try {
    return new Intl.NumberFormat(appConfig.locale, {
      style: "currency",
      currency
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Formats a date as DD/MM/YYYY (per AU locale default). */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(appConfig.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

/** Formats a date with time, e.g. 02/06/2026, 3:41 pm. */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(appConfig.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

/** Short time, e.g. 3:41 pm. */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(appConfig.locale, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

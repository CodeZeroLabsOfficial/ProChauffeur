import {
  getActiveFormatCurrency,
  getActiveFormatLocale
} from "@/lib/locale/active-format-locale";

function resolveLocale(override?: string | null): string {
  return override?.trim() || getActiveFormatLocale();
}

function formatWithLocale(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  localeOverride?: string | null
): string {
  const tag = resolveLocale(localeOverride);
  try {
    return new Intl.DateTimeFormat(tag, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(date);
  }
}

/** Formats a number as currency using Location locale, or a plain amount if none. */
export function formatCurrency(
  value: number,
  currency?: string,
  localeOverride?: string | null
): string {
  const code = currency?.trim() || getActiveFormatCurrency();
  const tag = resolveLocale(localeOverride);
  if (!code) {
    try {
      return new Intl.NumberFormat(tag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch {
      return value.toFixed(2);
    }
  }
  try {
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency: code
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

/** Formats a date as a short numeric date for the active Location locale. */
export function formatDate(
  date: Date | null | undefined,
  localeOverride?: string | null
): string {
  if (!date) return "—";
  return formatWithLocale(
    date,
    { day: "2-digit", month: "2-digit", year: "numeric" },
    localeOverride
  );
}

/** Formats a date with time for the active Location locale. */
export function formatDateTime(
  date: Date | null | undefined,
  localeOverride?: string | null
): string {
  if (!date) return "—";
  return formatWithLocale(
    date,
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    },
    localeOverride
  );
}

/** Short time for the active Location locale. */
export function formatTime(
  date: Date | null | undefined,
  localeOverride?: string | null
): string {
  if (!date) return "—";
  return formatWithLocale(date, { hour: "numeric", minute: "2-digit" }, localeOverride);
}

/** Chart axis day, e.g. 02 Aug / Aug 02. */
export function formatChartDay(date: Date, localeOverride?: string | null): string {
  return formatWithLocale(date, { day: "2-digit", month: "short" }, localeOverride);
}

/** Chart axis month, e.g. Aug. */
export function formatChartMonth(date: Date, localeOverride?: string | null): string {
  return formatWithLocale(date, { month: "short" }, localeOverride);
}

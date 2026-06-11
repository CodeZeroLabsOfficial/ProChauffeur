export type LocaleOption = {
  value: string;
  label: string;
};

export const COMMON_LANGUAGES: LocaleOption[] = [
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-SG", label: "English (Singapore)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
  { value: "zh-CN", label: "Chinese (China)" }
];

export const COMMON_CURRENCIES: LocaleOption[] = [
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "NZD", label: "NZD — New Zealand dollar" },
  { value: "USD", label: "USD — US dollar" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "SGD", label: "SGD — Singapore dollar" },
  { value: "HKD", label: "HKD — Hong Kong dollar" },
  { value: "JPY", label: "JPY — Japanese yen" },
  { value: "CHF", label: "CHF — Swiss franc" },
  { value: "AED", label: "AED — UAE dirham" },
  { value: "INR", label: "INR — Indian rupee" }
];

export const COMMON_TIMEZONES: LocaleOption[] = [
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide (ACST/ACDT)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "UTC", label: "UTC" }
];

export function optionsWithCurrent(options: LocaleOption[], current: string): LocaleOption[] {
  const trimmed = current.trim();
  if (!trimmed || options.some((option) => option.value === trimmed)) {
    return options;
  }
  return [{ value: trimmed, label: trimmed }, ...options];
}

export function labelForOption(options: LocaleOption[], value: string): string {
  const trimmed = value.trim();
  return options.find((option) => option.value === trimmed)?.label ?? trimmed;
}

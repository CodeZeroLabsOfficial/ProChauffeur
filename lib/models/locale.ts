/** `operator/locale` document — fleet locale and regional preferences. */
export interface OperatorLocale {
  locale?: string | null;
  currency?: string | null;
  timezone?: string | null;
}

export const emptyOperatorLocale: OperatorLocale = {
  locale: null,
  currency: null,
  timezone: null
};

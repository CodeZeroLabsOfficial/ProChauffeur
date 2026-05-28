"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  formatTimeZoneOptionLabel,
  getLocaleTimeZoneOptions,
  LOCALE_COUNTRY_OPTIONS,
  LOCALE_DATE_FORMAT_OPTIONS,
  LOCALE_LANGUAGE_OPTIONS,
  LOCALE_NUMBER_FORMAT_OPTIONS,
  LOCALE_TIME_FORMAT_OPTIONS,
  type LocaleDateFormat,
  type LocaleNumberFormat,
  type LocaleTimeFormat,
} from "@/lib/prochauffeur/localeOptions";
import React, { useEffect, useMemo, useState } from "react";

const selectClassName =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

type LocaleSettingRowProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function LocaleSettingRow({ title, description, children }: LocaleSettingRowProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="w-full sm:w-auto sm:min-w-[240px]">{children}</div>
    </div>
  );
}

export default function LocaleSettingsView() {
  const {
    fleetLocale,
    saveFleetLocale,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const [language, setLanguage] = useState("");
  const [country, setCountry] = useState("");
  const [dateFormat, setDateFormat] = useState<LocaleDateFormat | "">("");
  const [timeFormat, setTimeFormat] = useState<LocaleTimeFormat | "">("");
  const [timeZoneIdentifier, setTimeZoneIdentifier] = useState("");
  const [numberFormat, setNumberFormat] = useState<LocaleNumberFormat | "">("");

  const timeZoneOptions = useMemo(() => {
    const options = getLocaleTimeZoneOptions();
    const current = timeZoneIdentifier.trim();

    if (current && !options.some((option) => option.value === current)) {
      return [
        { value: current, label: formatTimeZoneOptionLabel(current) },
        ...options,
      ];
    }

    return options;
  }, [timeZoneIdentifier]);

  useEffect(() => {
    setLanguage(fleetLocale.language ?? "");
    setCountry(fleetLocale.country ?? "");
    setDateFormat(fleetLocale.dateFormat ?? "");
    setTimeFormat(fleetLocale.timeFormat ?? "");
    setTimeZoneIdentifier(fleetLocale.timeZoneIdentifier ?? "");
    setNumberFormat(fleetLocale.numberFormat ?? "");
  }, [fleetLocale]);

  function handleCancel() {
    setLanguage(fleetLocale.language ?? "");
    setCountry(fleetLocale.country ?? "");
    setDateFormat(fleetLocale.dateFormat ?? "");
    setTimeFormat(fleetLocale.timeFormat ?? "");
    setTimeZoneIdentifier(fleetLocale.timeZoneIdentifier ?? "");
    setNumberFormat(fleetLocale.numberFormat ?? "");
    clearActionError();
  }

  async function handleSave() {
    await saveFleetLocale({
      language: language.trim() || null,
      country: country.trim() || null,
      dateFormat: dateFormat || null,
      timeFormat: timeFormat || null,
      timeZoneIdentifier: timeZoneIdentifier.trim() || null,
      numberFormat: numberFormat || null,
    });
  }

  return (
    <CompanySettingsSection
      id="locale"
      title=""
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
      className="max-w-3xl"
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/40 dark:border-gray-800 dark:bg-gray-900/30">
        <div className="px-4 pb-3 pt-4 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Preference
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          <LocaleSettingRow
            title="Country"
            description="Primary operating country for addresses and compliance defaults."
          >
            <Label className="sr-only" htmlFor="locale-country">
              Country
            </Label>
            <select
              id="locale-country"
              className={selectClassName}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">Select country</option>
              {LOCALE_COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>

          <LocaleSettingRow
            title="Language"
            description="Default language for admin and customer-facing copy."
          >
            <Label className="sr-only" htmlFor="locale-language">
              Language
            </Label>
            <select
              id="locale-language"
              className={selectClassName}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Select language</option>
              {LOCALE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>

          <LocaleSettingRow
            title="Timezone"
            description="IANA time zone used for dispatch scheduling and weekly operating patterns."
          >
            <Label className="sr-only" htmlFor="locale-timezone">
              Timezone
            </Label>
            <select
              id="locale-timezone"
              className={selectClassName}
              value={timeZoneIdentifier}
              onChange={(e) => setTimeZoneIdentifier(e.target.value)}
            >
              <option value="">Select timezone</option>
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>
        </div>

        <div className="border-t border-gray-200 px-4 pb-3 pt-4 dark:border-gray-800 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
            Regional formats
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          <LocaleSettingRow
            title="Date format"
            description="How calendar dates appear across the dispatch console."
          >
            <Label className="sr-only" htmlFor="locale-date-format">
              Date format
            </Label>
            <select
              id="locale-date-format"
              className={selectClassName}
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as LocaleDateFormat | "")}
            >
              <option value="">Select date format</option>
              {LOCALE_DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>

          <LocaleSettingRow
            title="Time format"
            description="12-hour or 24-hour clock for trip and activity timestamps."
          >
            <Label className="sr-only" htmlFor="locale-time-format">
              Time format
            </Label>
            <select
              id="locale-time-format"
              className={selectClassName}
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value as LocaleTimeFormat | "")}
            >
              <option value="">Select time format</option>
              {LOCALE_TIME_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>

          <LocaleSettingRow
            title="Number format"
            description="Thousands separators and decimal style for fares and reports."
          >
            <Label className="sr-only" htmlFor="locale-number-format">
              Number format
            </Label>
            <select
              id="locale-number-format"
              className={selectClassName}
              value={numberFormat}
              onChange={(e) =>
                setNumberFormat(e.target.value as LocaleNumberFormat | "")
              }
            >
              <option value="">Select number format</option>
              {LOCALE_NUMBER_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </LocaleSettingRow>
        </div>
      </div>

      <div className="mt-6 flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save locale"}
        </Button>
        <Button variant="outline" disabled={isSaving} onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </CompanySettingsSection>
  );
}

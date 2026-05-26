"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  LOCALE_COUNTRY_OPTIONS,
  LOCALE_DATE_FORMAT_OPTIONS,
  LOCALE_LANGUAGE_OPTIONS,
  LOCALE_NUMBER_FORMAT_OPTIONS,
  LOCALE_TIME_FORMAT_OPTIONS,
  type LocaleDateFormat,
  type LocaleNumberFormat,
  type LocaleTimeFormat,
} from "@/lib/prochauffeur/localeOptions";
import React, { useEffect, useState } from "react";

const selectClassName =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

type LocaleFieldProps = {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function LocaleField({ id, title, description, children }: LocaleFieldProps) {
  return (
    <div id={id} className="scroll-mt-6 rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h4>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <div className="mt-4">{children}</div>
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
      id="locale-overview"
      title="Locale"
      description="Regional preferences for dates, times, numbers, and fleet scheduling."
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
      className="max-w-3xl space-y-4"
    >
      <LocaleField
        id="language"
        title="Language"
        description="Default language for admin and customer-facing copy."
      >
        <Label htmlFor="locale-language">Language</Label>
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
      </LocaleField>

      <LocaleField
        id="country"
        title="Country"
        description="Primary operating country for addresses and compliance defaults."
      >
        <Label htmlFor="locale-country">Country</Label>
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
      </LocaleField>

      <LocaleField
        id="date-format"
        title="Date format"
        description="How calendar dates appear across the dispatch console."
      >
        <Label htmlFor="locale-date-format">Date format</Label>
        <select
          id="locale-date-format"
          className={selectClassName}
          value={dateFormat}
          onChange={(e) =>
            setDateFormat(e.target.value as LocaleDateFormat | "")
          }
        >
          <option value="">Select date format</option>
          {LOCALE_DATE_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </LocaleField>

      <LocaleField
        id="time-format"
        title="Time format"
        description="12-hour or 24-hour clock for trip and activity timestamps."
      >
        <Label htmlFor="locale-time-format">Time format</Label>
        <select
          id="locale-time-format"
          className={selectClassName}
          value={timeFormat}
          onChange={(e) =>
            setTimeFormat(e.target.value as LocaleTimeFormat | "")
          }
        >
          <option value="">Select time format</option>
          {LOCALE_TIME_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </LocaleField>

      <LocaleField
        id="timezone"
        title="Timezone"
        description="IANA time zone used for dispatch scheduling and weekly operating patterns."
      >
        <Label htmlFor="locale-timezone">Fleet time zone (IANA)</Label>
        <Input
          id="locale-timezone"
          value={timeZoneIdentifier}
          onChange={(e) => setTimeZoneIdentifier(e.target.value)}
          placeholder="Australia/Sydney"
        />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Example identifiers: <code className="text-xs">Australia/Sydney</code>
          , <code className="text-xs">America/New_York</code>
        </p>
      </LocaleField>

      <LocaleField
        id="number-format"
        title="Number format"
        description="Thousands separators and decimal style for fares and reports."
      >
        <Label htmlFor="locale-number-format">Number format</Label>
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
      </LocaleField>

      <div className="flex gap-3 pt-2">
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

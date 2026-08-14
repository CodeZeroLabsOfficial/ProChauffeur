"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Globe, ListChecks } from "lucide-react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { AdminUserAutocomplete } from "@/components/admin-user-autocomplete";
import { FormWizardSteps, type FormWizardStep } from "@/components/layout/form-wizard-steps";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Branch, OperatorLocale, User } from "@/lib/models";
import {
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TIMEZONES,
  distanceUnitTitle,
  labelForOption
} from "@/lib/models";
import type { LocationRegionSummary } from "@/lib/seed/location/schema";
import { createLocationFromSeed } from "@/lib/services/firebase-service";

const STEPS: FormWizardStep[] = [
  { id: "region", label: "Region & city", icon: Globe },
  { id: "details", label: "Details", icon: Building2 },
  { id: "review", label: "Review", icon: ListChecks }
];

function localeSummary(locale: OperatorLocale): string {
  const language = labelForOption(COMMON_LANGUAGES, locale.locale);
  const currency = labelForOption(COMMON_CURRENCIES, locale.currency);
  const timezone = labelForOption(COMMON_TIMEZONES, locale.timezone);
  const taxPct = Math.round(locale.defaultTaxRate * 1000) / 10;
  const tax = locale.defaultTaxRate > 0 ? `${locale.taxName} ${taxPct}%` : locale.taxName;
  return `${language} · ${currency} · ${timezone} · ${distanceUnitTitle[locale.distanceUnit]} · ${tax}`;
}

export function LocationCreateForm({
  open,
  onOpenChange,
  canCreate,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  onCreated: (branch: Branch) => void;
}) {
  const { setBranchId, allBranches } = useActiveBranch();
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [regions, setRegions] = useState<LocationRegionSummary[]>([]);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionId, setRegionId] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState<User | null>(null);
  const [office, setOffice] = useState<AddressSuggestion | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => regions.find((row) => row.id === regionId) ?? null,
    [regions, regionId]
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCity("");
    setName("");
    setPhone("");
    setEmail("");
    setContact(null);
    setOffice(null);
    setIsActive(true);
    setRegionsError(null);
    setRegionsLoading(true);
    void fetch("/api/location-seed")
      .then(async (res) => {
        const body = (await res.json()) as { regions?: LocationRegionSummary[]; error?: string };
        if (!res.ok) throw new Error(body.error || "Could not load regions.");
        const rows = body.regions ?? [];
        setRegions(rows);
        setRegionId((current) => current || rows[0]?.id || "");
      })
      .catch((err) => {
        setRegions([]);
        setRegionsError(err instanceof Error ? err.message : "Could not load regions.");
      })
      .finally(() => setRegionsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!pendingBranchId) return;
    if (!allBranches.some((branch) => branch.id === pendingBranchId)) return;
    setBranchId(pendingBranchId);
    setPendingBranchId(null);
  }, [pendingBranchId, allBranches, setBranchId]);

  function selectRegion(nextId: string) {
    setRegionId(nextId);
    setOffice(null);
  }

  function goNext() {
    if (step === 0) {
      if (!regionId) {
        toast.error("Select a region.");
        return;
      }
      if (!city.trim()) {
        toast.error("Enter a city.");
        return;
      }
      if (!name.trim()) setName(city.trim());
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Enter a location name.");
        return;
      }
      if (!office) {
        toast.error("Select an office address from the suggestions.");
        return;
      }
      setStep(2);
    }
  }

  async function onCreate() {
    if (!canCreate) {
      toast.error("Location limit reached.");
      return;
    }
    if (!selected || !office) return;
    setSubmitting(true);
    try {
      const created = await createLocationFromSeed({
        regionId: selected.id,
        city: city.trim(),
        name: name.trim(),
        officeAddressLine: office.addressLine,
        officeLatitude: office.coordinate.latitude,
        officeLongitude: office.coordinate.longitude,
        officePhone: phone.trim() || null,
        officeEmail: email.trim() || null,
        contactUserId: contact?.id ?? null,
        isActive
      });
      if (created.isActive !== false) setPendingBranchId(created.id);
      onCreated(created);
      onOpenChange(false);
      toast.success("Location created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Location</DialogTitle>
          <DialogDescription className="sr-only">
            Create a location from a country seed file.
          </DialogDescription>
        </DialogHeader>

        <FormWizardSteps steps={STEPS} currentIndex={step} />

        {step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-region">Region</Label>
              <Select
                value={regionId || undefined}
                onValueChange={selectRegion}
                disabled={regionsLoading || submitting}>
                <SelectTrigger id="location-region" className="w-full">
                  <SelectValue
                    placeholder={regionsLoading ? "Loading regions…" : "Select a region"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regionsError ? (
                <p className="text-destructive text-xs">{regionsError}</p>
              ) : selected ? (
                <div className="bg-muted/50 rounded-lg border px-3 py-2 text-xs leading-relaxed">
                  <p>{localeSummary(selected.locale)}</p>
                  <p className="text-muted-foreground mt-1">
                    Starter classes and pricing for this region
                    {selected.vehicleClassNames.length
                      ? ` (${selected.vehicleClassNames.join(", ")})`
                      : ""}
                    .
                  </p>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-city">City</Label>
              <Input
                id="location-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. city name"
                disabled={submitting}
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. city name"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-phone">Phone</Label>
                <Input
                  id="location-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-email">Email</Label>
                <Input
                  id="location-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-create-contact">Contact</Label>
                <AdminUserAutocomplete
                  id="location-create-contact"
                  value={contact}
                  onChange={setContact}
                  disabled={submitting}
                  placeholder="Search team admins…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-office">Office address</Label>
              <AddressAutocomplete
                id="location-office"
                value={office}
                onChange={setOffice}
                required
                disabled={submitting}
                country={selected?.mapboxCountry || null}
                proximity={office?.coordinate ?? null}
                placeholder="Search for the office address…"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="location-active">Active</Label>
                <p className="text-muted-foreground text-xs">
                  Inactive locations are hidden from the switcher and resolve.
                </p>
              </div>
              <Switch
                id="location-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={submitting}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Location
              </p>
              <p className="mt-1 text-base font-medium">{name.trim() || "Location"}</p>
              {city.trim() ? (
                <p className="text-muted-foreground">{city.trim()}</p>
              ) : null}
              <p className="text-muted-foreground">{office?.addressLine}</p>
            </div>
            {selected ? (
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {selected.label} defaults — not editable here
                </p>
                <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Language</dt>
                    <dd>{labelForOption(COMMON_LANGUAGES, selected.locale.locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Currency</dt>
                    <dd>{labelForOption(COMMON_CURRENCIES, selected.locale.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Time zone</dt>
                    <dd>{labelForOption(COMMON_TIMEZONES, selected.locale.timezone)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Distance</dt>
                    <dd>{distanceUnitTitle[selected.locale.distanceUnit]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd>
                      {selected.locale.defaultTaxRate > 0
                        ? `${selected.locale.taxName} ${Math.round(selected.locale.defaultTaxRate * 1000) / 10}%`
                        : selected.locale.taxName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Classes</dt>
                    <dd>
                      {selected.vehicleClassNames.join(", ")}
                      {selected.vehicleClassNames.length
                        ? ` (${selected.vehicleClassNames.length} starter classes)`
                        : ""}
                    </dd>
                  </div>
                </dl>
                <p className="text-muted-foreground mt-3 text-xs">
                  You can change locale, rates, and hours on the Location page after create.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || submitting}
            onClick={() => setStep((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          {step < 2 ? (
            <Button type="button" disabled={submitting || regionsLoading || !regionId} onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button type="button" disabled={submitting || !canCreate} onClick={() => void onCreate()}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

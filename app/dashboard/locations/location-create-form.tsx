"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Globe, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { AdminUserAutocomplete } from "@/components/admin-user-autocomplete";
import { SectionHeading } from "@/components/detail-sheet-fields";
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
import { Separator } from "@/components/ui/separator";
import type { Branch, User } from "@/lib/models";
import {
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TIMEZONES,
  distanceUnitTitle,
  labelForOption
} from "@/lib/models";
import type { LocationRegionSummary } from "@/lib/seed/location/schema";
import { createLocationFromSeed } from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";
import { cn } from "@/lib/utils";

const STEPS: FormWizardStep[] = [
  { id: "region", label: "Region & city", icon: Globe },
  { id: "details", label: "Details", icon: Building2 },
  { id: "review", label: "Review", icon: ListChecks }
];

type FieldErrors = Partial<Record<"name" | "phone" | "email" | "office", string>>;

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 6;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      aria-live="polite"
      className="peer-aria-invalid:text-destructive text-destructive text-xs"
      role="alert">
      {message}
    </p>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={cn("break-words font-medium", isEmpty && "text-muted-foreground")}>{value}</p>
    </div>
  );
}

function ReviewGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ReviewItem key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
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
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
    setFieldErrors({});
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

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validateDetails(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (phone.trim() && !isValidPhone(phone)) next.phone = "Phone number is invalid";
    if (email.trim() && !z.string().email().safeParse(email.trim()).success) {
      next.email = "Email is invalid";
    }
    if (!office) next.office = "Address is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
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
      if (!validateDetails()) return;
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
        isActive: true
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
      <DialogContent className="flex h-[min(36rem,90vh)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Add Location</DialogTitle>
          <DialogDescription className="sr-only">
            Create a location from a country seed file.
          </DialogDescription>
        </DialogHeader>

        <FormWizardSteps steps={STEPS} currentIndex={step} />

        <div className="min-h-0 flex-1 overflow-y-auto">
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
              <div className="*:not-first:mt-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  placeholder="Location name"
                  disabled={submitting}
                  aria-invalid={fieldErrors.name ? true : undefined}
                  className="peer"
                />
                <FieldError message={fieldErrors.name} />
              </div>
              <div className="*:not-first:mt-2">
                <Label htmlFor="location-phone">Phone</Label>
                <Input
                  id="location-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  placeholder="Phone number"
                  disabled={submitting}
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  className="peer"
                />
                <FieldError message={fieldErrors.phone} />
              </div>
              <div className="*:not-first:mt-2">
                <Label htmlFor="location-email">Email</Label>
                <Input
                  id="location-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="email@example.com"
                  disabled={submitting}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  className="peer"
                />
                <FieldError message={fieldErrors.email} />
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
            <div className="*:not-first:mt-2">
              <Label htmlFor="location-office">Office address</Label>
              <AddressAutocomplete
                id="location-office"
                value={office}
                onChange={(next) => {
                  setOffice(next);
                  if (next) clearFieldError("office");
                }}
                required
                disabled={submitting}
                invalid={Boolean(fieldErrors.office)}
                country={selected?.mapboxJurisdiction || null}
                proximity={office?.coordinate ?? null}
                placeholder="Search for the office address…"
              />
              <FieldError message={fieldErrors.office} />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <SectionHeading>Location details</SectionHeading>
              <ReviewGrid
                items={[
                  { label: "Name", value: displayOrDash(name) },
                  { label: "City", value: displayOrDash(city) },
                  { label: "Office", value: displayOrDash(office?.addressLine) },
                  { label: "Phone", value: displayOrDash(phone) },
                  { label: "Email", value: displayOrDash(email) },
                  {
                    label: "Contact",
                    value: contact ? customerDisplayName(contact) : "—"
                  }
                ]}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <SectionHeading>Region defaults</SectionHeading>
              <ReviewGrid
                items={[
                  {
                    label: "Language",
                    value: selected
                      ? labelForOption(COMMON_LANGUAGES, selected.locale.locale)
                      : "—"
                  },
                  {
                    label: "Time zone",
                    value: selected
                      ? labelForOption(COMMON_TIMEZONES, selected.locale.timezone)
                      : "—"
                  },
                  {
                    label: "Distance",
                    value: selected ? distanceUnitTitle[selected.locale.distanceUnit] : "—"
                  },
                  {
                    label: "Currency",
                    value: selected
                      ? labelForOption(COMMON_CURRENCIES, selected.locale.currency)
                      : "—"
                  },
                  {
                    label: "Tax",
                    value: selected
                      ? selected.locale.defaultTaxRate > 0
                        ? `${selected.locale.taxName} ${Math.round(selected.locale.defaultTaxRate * 1000) / 10}%`
                        : selected.locale.taxName
                      : "—"
                  },
                  {
                    label: "Classes",
                    value: displayOrDash(selected?.vehicleClassNames.join(", "))
                  }
                ]}
              />
            </div>
          </div>
        ) : null}
        </div>

        <DialogFooter className="shrink-0">
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

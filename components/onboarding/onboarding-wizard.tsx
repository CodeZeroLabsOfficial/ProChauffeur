"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import {
  Building2,
  MapPin,
  Palette,
  Plug,
  User
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { Logo } from "@/components/layout/logo";
import { FormWizardSteps, type FormWizardStep } from "@/components/layout/form-wizard-steps";
import { PasswordStrengthField } from "@/components/password-strength-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { isPasswordStrong } from "@/lib/auth/password-strength";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  BRANDING_FONTS,
  DEFAULT_BRANDING_FONT,
  type BrandingFontId
} from "@/lib/fonts-config";
import { taxIdLabelForCountry } from "@/lib/models";
import {
  formatCityLabel,
  listedCityNames,
  resolveCityTimezone,
  type LocationRegionSummary
} from "@/lib/seed/location/schema";
import { createLocationFromSeed } from "@/lib/services/firebase-service";

const STEPS: FormWizardStep[] = [
  { id: "admin", label: "Admin", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "workspace", label: "Workspace", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "location", label: "Location", icon: MapPin }
];

const TOKEN_KEY = "pc_onboarding_token";

function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 6;
}

async function establishSession(customToken: string) {
  const cred = await signInWithCustomToken(firebaseAuth(), customToken);
  const idToken = await cred.user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Could not start session.");
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token")?.trim() ?? "";

  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [mapboxConfigured, setMapboxConfigured] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminCreated, setAdminCreated] = useState(false);

  // Step 2
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyStreet, setCompanyStreet] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyPostcode, setCompanyPostcode] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [taxId, setTaxId] = useState("");

  // Step 3
  const [workspaceName, setWorkspaceName] = useState("");
  const [primaryColorHex, setPrimaryColorHex] = useState("");
  const [fontFamily, setFontFamily] = useState<BrandingFontId>(DEFAULT_BRANDING_FONT);

  // Step 4
  const [stripePublishableKey, setStripePublishableKey] = useState("");

  // Step 5
  const [regions, setRegions] = useState<LocationRegionSummary[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [regionId, setRegionId] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationPhone, setLocationPhone] = useState("");
  const [locationEmail, setLocationEmail] = useState("");
  const [office, setOffice] = useState<AddressSuggestion | null>(null);

  const selectedRegion = useMemo(
    () => regions.find((row) => row.id === regionId) ?? null,
    [regions, regionId]
  );
  const cityOptions = useMemo(
    () => (selectedRegion ? listedCityNames(selectedRegion.cities) : []),
    [selectedRegion]
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const statusRes = await fetch("/api/onboarding/status");
      const status = (await statusRes.json()) as {
        completed?: boolean;
        mapboxConfigured?: boolean;
      };
      if (!cancelled) setMapboxConfigured(Boolean(status.mapboxConfigured));

      const stored =
        typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY)?.trim() ?? "" : "";
      const nextToken = urlToken || stored;
      if (!nextToken) {
        if (status.completed) {
          router.replace("/login");
          return;
        }
        setGateError("Open your invite link to set up this workspace.");
        setReady(true);
        return;
      }

      const validateRes = await fetch("/api/onboarding/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: nextToken })
      });
      const validateBody = (await validateRes.json()) as {
        error?: string;
        boundUid?: string | null;
        mapboxConfigured?: boolean;
        completed?: boolean;
      };
      if (!validateRes.ok) {
        if (validateBody.completed) {
          router.replace("/login");
          return;
        }
        setGateError(validateBody.error || "This invite link is invalid.");
        setReady(true);
        return;
      }

      sessionStorage.setItem(TOKEN_KEY, nextToken);
      if (!cancelled) {
        setToken(nextToken);
        setMapboxConfigured(Boolean(validateBody.mapboxConfigured));
        if (validateBody.boundUid) {
          setAdminCreated(true);
          setStep(1);
        }
        setReady(true);
      }
    }
    void boot().catch(() => {
      if (!cancelled) {
        setGateError("Could not verify this invite.");
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, urlToken]);

  useEffect(() => {
    if (step !== 4) return;
    setRegionsLoading(true);
    setRegionsError(null);
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
  }, [step]);

  async function submitAdmin() {
    if (!isPasswordStrong(password) || password !== confirmPassword) {
      toast.error("Enter a strong password and confirm it.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Name, email, and phone are required.");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error("Phone number is invalid.");
      return;
    }
    if (!street.trim() || !city.trim() || !country.trim()) {
      toast.error("Street, city, and country are required.");
      return;
    }
    if (!z.string().email().safeParse(email.trim()).success) {
      toast.error("Enter a valid email.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim(),
          password,
          confirmPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postcode: postcode.trim(),
          country: country.trim()
        })
      });
      const body = (await res.json()) as { error?: string; customToken?: string };
      if (!res.ok) throw new Error(body.error || "Could not create administrator.");
      if (!body.customToken) throw new Error("Missing session token.");
      await establishSession(body.customToken);
      setAdminCreated(true);
      if (!companyEmail) setCompanyEmail(email.trim());
      if (!companyPhone) setCompanyPhone(phone.trim());
      if (!companyCountry) setCompanyCountry(country.trim());
      setStep(1);
      toast.success("Administrator created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create administrator.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCompany() {
    if (
      !companyName.trim() ||
      !companyPhone.trim() ||
      !companyEmail.trim() ||
      !companyStreet.trim() ||
      !companyCity.trim() ||
      !companyCountry.trim() ||
      !taxId.trim()
    ) {
      toast.error("Fill all required company fields.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: companyName.trim(),
          phone: companyPhone.trim(),
          email: companyEmail.trim(),
          street: companyStreet.trim(),
          city: companyCity.trim(),
          state: companyState.trim(),
          postcode: companyPostcode.trim(),
          country: companyCountry.trim(),
          taxId: taxId.trim()
        })
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not save company.");
      if (!workspaceName) setWorkspaceName(companyName.trim());
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save company.");
    } finally {
      setBusy(false);
    }
  }

  async function submitWorkspace() {
    if (!workspaceName.trim()) {
      toast.error("Workspace name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          workspaceName: workspaceName.trim(),
          primaryColorHex: primaryColorHex.trim() || undefined,
          fontFamily
        })
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not save workspace.");
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function submitIntegrations(skip: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          stripePublishableKey: skip ? "" : stripePublishableKey.trim()
        })
      });
      const body = (await res.json()) as { error?: string; mapboxConfigured?: boolean };
      if (!res.ok) throw new Error(body.error || "Could not save integrations.");
      setMapboxConfigured(Boolean(body.mapboxConfigured));
      setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save integrations.");
    } finally {
      setBusy(false);
    }
  }

  async function submitLocation() {
    if (!mapboxConfigured) {
      toast.error("Mapbox is not configured. Contact your provider.");
      return;
    }
    if (!selectedRegion || !locationCity.trim() || !locationName.trim() || !office) {
      toast.error("Select region, city, name, and office address.");
      return;
    }
    if (!resolveCityTimezone(locationCity, selectedRegion.cities)) {
      toast.error("Select a listed city for this region.");
      return;
    }
    setBusy(true);
    try {
      await createLocationFromSeed({
        regionId: selectedRegion.id,
        city: locationCity.trim(),
        name: locationName.trim(),
        officeAddressLine: office.addressLine,
        officeLatitude: office.coordinate.latitude,
        officeLongitude: office.coordinate.longitude,
        officePhone: locationPhone.trim() || null,
        officeEmail: locationEmail.trim() || null,
        contactUserId: null,
        isActive: true,
        token
      });
      const completeRes = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const completeBody = (await completeRes.json()) as { error?: string };
      if (!completeRes.ok) {
        throw new Error(completeBody.error || "Could not finish onboarding.");
      }
      sessionStorage.removeItem(TOKEN_KEY);
      toast.success("Workspace ready.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create location.");
    } finally {
      setBusy(false);
    }
  }

  function onNext() {
    if (step === 0) return void submitAdmin();
    if (step === 1) return void submitCompany();
    if (step === 2) return void submitWorkspace();
    if (step === 3) return void submitIntegrations(false);
    if (step === 4) return void submitLocation();
  }

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Checking invite…</p>;
  }

  if (gateError) {
    return (
      <div className="space-y-6">
        <Logo workspaceName="ProChauffeur" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Invite required</h1>
          <p className="text-muted-foreground text-sm">{gateError}</p>
        </div>
        <Button asChild variant="outline">
          <a href="/login">Go to sign in</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Logo workspaceName={workspaceName.trim() || "ProChauffeur"} />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Set up your workspace</h1>
        <p className="text-muted-foreground text-sm">
          Complete these steps to get your operations portal ready.
        </p>
      </div>

      <FormWizardSteps steps={STEPS} currentIndex={step} />

      <div className="min-h-0 flex-1 space-y-6">
        {step === 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ob-first">First name</Label>
                <Input
                  id="ob-first"
                  value={firstName}
                  disabled={busy || adminCreated}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-last">Last name</Label>
                <Input
                  id="ob-last"
                  value={lastName}
                  disabled={busy || adminCreated}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-email">Email</Label>
              <Input
                id="ob-email"
                type="email"
                value={email}
                disabled={busy || adminCreated}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-phone">Phone</Label>
              <Input
                id="ob-phone"
                type="tel"
                value={phone}
                disabled={busy || adminCreated}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-street">Street</Label>
              <Input
                id="ob-street"
                value={street}
                disabled={busy || adminCreated}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ob-city">City</Label>
                <Input
                  id="ob-city"
                  value={city}
                  disabled={busy || adminCreated}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-state">State</Label>
                <Input
                  id="ob-state"
                  value={state}
                  disabled={busy || adminCreated}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ob-postcode">Postcode</Label>
                <Input
                  id="ob-postcode"
                  value={postcode}
                  disabled={busy || adminCreated}
                  onChange={(e) => setPostcode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-country">Country</Label>
                <Input
                  id="ob-country"
                  value={country}
                  disabled={busy || adminCreated}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
            {!adminCreated ? (
              <PasswordStrengthField
                password={password}
                onPasswordChange={setPassword}
                confirm={confirmPassword}
                onConfirmChange={setConfirmPassword}
                disabled={busy}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Administrator account already created for this invite. Continue to company details.
              </p>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="co-name">Company name</Label>
              <Input
                id="co-name"
                value={companyName}
                disabled={busy}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-phone">Company phone</Label>
                <Input
                  id="co-phone"
                  type="tel"
                  value={companyPhone}
                  disabled={busy}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-email">Company email</Label>
                <Input
                  id="co-email"
                  type="email"
                  value={companyEmail}
                  disabled={busy}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-street">Street</Label>
              <Input
                id="co-street"
                value={companyStreet}
                disabled={busy}
                onChange={(e) => setCompanyStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-city">City</Label>
                <Input
                  id="co-city"
                  value={companyCity}
                  disabled={busy}
                  onChange={(e) => setCompanyCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-state">State</Label>
                <Input
                  id="co-state"
                  value={companyState}
                  disabled={busy}
                  onChange={(e) => setCompanyState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="co-postcode">Postcode</Label>
                <Input
                  id="co-postcode"
                  value={companyPostcode}
                  disabled={busy}
                  onChange={(e) => setCompanyPostcode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-country">Country</Label>
                <Input
                  id="co-country"
                  value={companyCountry}
                  disabled={busy}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-tax">{taxIdLabelForCountry(companyCountry)}</Label>
              <Input
                id="co-tax"
                value={taxId}
                disabled={busy}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={workspaceName}
                disabled={busy}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-color">Theme colour (optional)</Label>
              <Input
                id="ws-color"
                placeholder="#0F172A"
                value={primaryColorHex}
                disabled={busy}
                onChange={(e) => setPrimaryColorHex(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Font (optional)</Label>
              <Select
                value={fontFamily}
                disabled={busy}
                onValueChange={(value) => setFontFamily(value as BrandingFontId)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDING_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-xs">
              Logo and favicon can be uploaded later in Appearance settings.
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Mapbox</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {mapboxConfigured
                  ? "Configured for this workspace."
                  : "Not configured. Location setup will be blocked until your provider adds NEXT_PUBLIC_MAPBOX_TOKEN."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe-pk">Stripe publishable key (optional)</Label>
              <Input
                id="stripe-pk"
                placeholder="pk_…"
                value={stripePublishableKey}
                disabled={busy}
                onChange={(e) => setStripePublishableKey(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Secret keys stay with your provider. You can skip this and configure payments later.
              </p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            {!mapboxConfigured ? (
              <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
                <p className="text-sm font-medium">Mapbox required</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Mapbox is not configured for this workspace. Contact your provider before
                  creating your first Location.
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={regionId || undefined}
                disabled={busy || regionsLoading || !mapboxConfigured}
                onValueChange={(id) => {
                  setRegionId(id);
                  setLocationCity("");
                  setOffice(null);
                }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={regionsLoading ? "Loading…" : "Select region"} />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {regionsError ? <p className="text-destructive text-xs">{regionsError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={locationCity || undefined}
                disabled={busy || !selectedRegion || !mapboxConfigured}
                onValueChange={(value) => {
                  setLocationCity(value);
                  if (!locationName.trim()) setLocationName(formatCityLabel(value));
                }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {formatCityLabel(name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-name">Location name</Label>
              <Input
                id="loc-name"
                value={locationName}
                disabled={busy || !mapboxConfigured}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="loc-phone">Phone</Label>
                <Input
                  id="loc-phone"
                  value={locationPhone}
                  disabled={busy || !mapboxConfigured}
                  onChange={(e) => setLocationPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-email">Email</Label>
                <Input
                  id="loc-email"
                  type="email"
                  value={locationEmail}
                  disabled={busy || !mapboxConfigured}
                  onChange={(e) => setLocationEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Office address</Label>
              <AddressAutocomplete
                value={office}
                onChange={setOffice}
                required
                disabled={busy || !mapboxConfigured}
                country={selectedRegion?.mapboxJurisdiction || null}
                proximity={office?.coordinate ?? null}
                placeholder="Search for the office address…"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={busy || step === 0 || (step === 1 && !adminCreated)}
          onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Previous
        </Button>
        <div className="flex gap-2">
          {step === 3 ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void submitIntegrations(true)}>
              Skip
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={busy || (step === 4 && !mapboxConfigured)}
            onClick={() => {
              if (step === 0 && adminCreated) {
                setStep(1);
                return;
              }
              onNext();
            }}>
            {busy
              ? "Working…"
              : step === 0 && adminCreated
                ? "Continue"
                : step === 4
                  ? "Finish"
                  : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

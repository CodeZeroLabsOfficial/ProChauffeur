"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { saveCompanyProfile } from "@/lib/services/firebase-service";
import { taxIdLabelForCountry, type CompanyProfile } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

function profileFromForm(form: FormData): CompanyProfile {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const orNull = (k: string) => {
    const v = get(k);
    return v || null;
  };
  return {
    name: orNull("name"),
    phone: orNull("phone"),
    email: orNull("email"),
    website: orNull("website"),
    taxId: orNull("taxId"),
    street: orNull("street"),
    city: orNull("city"),
    state: orNull("state"),
    postcode: orNull("postcode"),
    country: orNull("country")
  };
}

export function CompanyEditSheet({
  company,
  open,
  onOpenChange,
  onSaved
}: {
  company: CompanyProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (profile: CompanyProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [country, setCountry] = useState(company.country ?? "");

  useEffect(() => {
    if (open) {
      setFormKey((n) => n + 1);
      setCountry(company.country ?? "");
    }
  }, [open, company.country]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const profile = profileFromForm(new FormData(e.currentTarget));
    setSaving(true);
    try {
      await saveCompanyProfile(profile);
      onSaved(profile);
      toast.success("Company details saved.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save company details.");
    } finally {
      setSaving(false);
    }
  }

  const taxLabel = taxIdLabelForCountry(country);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit company</SheetTitle>
          <SheetDescription>Update your business profile.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-6 px-4" key={formKey}>
          <div className="space-y-4">
            <p className="text-sm font-medium">Company details</p>
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" defaultValue={company.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Company phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Company email</Label>
              <Input id="email" name="email" type="email" defaultValue={company.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Company website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://…"
                defaultValue={company.website ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">{taxLabel}</Label>
              <Input id="taxId" name="taxId" defaultValue={company.taxId ?? ""} />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Company address</p>
            <div className="space-y-2">
              <Label htmlFor="street">Street</Label>
              <Input id="street" name="street" defaultValue={company.street ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={company.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={company.state ?? ""} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" name="postcode" defaultValue={company.postcode ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

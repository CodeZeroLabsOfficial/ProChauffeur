"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateUserDriverProfile } from "@/lib/services/firebase-service";
import {
  CHAUFFEUR_CATEGORIES,
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type ChauffeurCategory,
  type User
} from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export function DriverEditSheet({
  user,
  open,
  onOpenChange
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = user?.driverProfile ?? defaultDriverProfile();
  const [category, setCategory] = useState<ChauffeurCategory>(profile.chauffeurCategory);
  const [visible, setVisible] = useState(profile.visibleOnCustomerApp);
  const [dispatch, setDispatch] = useState(profile.acceptsDispatchAssignments);
  const [saving, setSaving] = useState(false);

  // Re-seed local state whenever a different driver is opened.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (user && user.id !== seededId) {
    setSeededId(user.id);
    setCategory(profile.chauffeurCategory);
    setVisible(profile.visibleOnCustomerApp);
    setDispatch(profile.acceptsDispatchAssignments);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();

    setSaving(true);
    try {
      await updateUserDriverProfile(user.id, {
        ...defaultDriverProfile(),
        ...profile,
        chauffeurCategory: category,
        bioStatement: get("bioStatement"),
        driversLicenseNumber: get("driversLicenseNumber") || null,
        driversLicenseClassOrType: get("driversLicenseClassOrType") || null,
        driversLicenseJurisdictionCode: get("driversLicenseJurisdictionCode") || null,
        driversLicenseExpiry: get("driversLicenseExpiry") ? new Date(get("driversLicenseExpiry")) : null,
        operatorAccreditationNumber: get("operatorAccreditationNumber") || null,
        visibleOnCustomerApp: visible,
        acceptsDispatchAssignments: dispatch
      });
      toast.success("Driver profile saved.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the driver profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{user?.profile.displayName || "Driver"}</SheetTitle>
          <SheetDescription>{user?.email}</SheetDescription>
        </SheetHeader>
        {user && (
          <form onSubmit={onSubmit} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label>Roster category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ChauffeurCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAUFFEUR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {chauffeurCategoryTitle[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bioStatement">Bio</Label>
              <Textarea id="bioStatement" name="bioStatement" rows={3} defaultValue={profile.bioStatement} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="driversLicenseNumber">Licence no.</Label>
                <Input
                  id="driversLicenseNumber"
                  name="driversLicenseNumber"
                  defaultValue={profile.driversLicenseNumber ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driversLicenseClassOrType">Class</Label>
                <Input
                  id="driversLicenseClassOrType"
                  name="driversLicenseClassOrType"
                  defaultValue={profile.driversLicenseClassOrType ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driversLicenseJurisdictionCode">State</Label>
                <Input
                  id="driversLicenseJurisdictionCode"
                  name="driversLicenseJurisdictionCode"
                  placeholder="NSW"
                  defaultValue={profile.driversLicenseJurisdictionCode ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driversLicenseExpiry">Licence expiry</Label>
                <Input
                  id="driversLicenseExpiry"
                  name="driversLicenseExpiry"
                  type="date"
                  defaultValue={
                    profile.driversLicenseExpiry
                      ? profile.driversLicenseExpiry.toISOString().slice(0, 10)
                      : ""
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operatorAccreditationNumber">Operator accreditation no.</Label>
              <Input
                id="operatorAccreditationNumber"
                name="operatorAccreditationNumber"
                defaultValue={profile.operatorAccreditationNumber ?? ""}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Visible on customer app</p>
                <p className="text-muted-foreground text-xs">Show this chauffeur to customers.</p>
              </div>
              <Switch checked={visible} onCheckedChange={setVisible} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Accepts dispatch</p>
                <p className="text-muted-foreground text-xs">Auto-route trips to this chauffeur.</p>
              </div>
              <Switch checked={dispatch} onCheckedChange={setDispatch} />
            </div>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

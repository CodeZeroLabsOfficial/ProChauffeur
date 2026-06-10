"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { updateUserDriverProfile, updateUserProfile, updateUserRole } from "@/lib/services/firebase-service";
import {
  CHAUFFEUR_CATEGORIES,
  chauffeurCategoryTitle,
  defaultDriverProfile,
  userRoleTitle,
  type ChauffeurCategory,
  type User
} from "@/lib/models";
import {
  isValidPostalAddress,
  postalAddressFromProfile,
  toProfilePostalFields,
  type PostalAddress
} from "@/lib/models/postal-address";
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  candidates,
  open,
  onOpenChange,
  nested = false
}: {
  user: User | null;
  candidates: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !user;
  const [selectedUserId, setSelectedUserId] = useState("");
  const selectedCandidate = candidates.find((u) => u.id === selectedUserId);
  const activeUser = user ?? selectedCandidate ?? null;
  const profile = activeUser?.driverProfile ?? defaultDriverProfile();

  const [category, setCategory] = useState<ChauffeurCategory>(profile.chauffeurCategory);
  const [visible, setVisible] = useState(profile.visibleOnCustomerApp);
  const [dispatch, setDispatch] = useState(profile.acceptsDispatchAssignments);
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState<Date | undefined>(
    profile.driversLicenseExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<PostalAddress>(() =>
    activeUser ? postalAddressFromProfile(activeUser.profile) : {}
  );
  const [addressInvalid, setAddressInvalid] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = user?.id ?? (selectedUserId || "__new__");
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setCategory(profile.chauffeurCategory);
    setVisible(profile.visibleOnCustomerApp);
    setDispatch(profile.acceptsDispatchAssignments);
    setDriversLicenseExpiry(profile.driversLicenseExpiry ?? undefined);
    setAddress(activeUser ? postalAddressFromProfile(activeUser.profile) : {});
    setAddressInvalid(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = user?.id ?? selectedUserId;
    if (!uid) {
      toast.error("Select the user to add as a chauffeur.");
      return;
    }
    if (!isValidPostalAddress(address)) {
      setAddressInvalid(true);
      toast.error(PROFILE_ADDRESS_VALIDATION_MESSAGE);
      return;
    }
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const driverProfile = {
      ...defaultDriverProfile(),
      ...profile,
      chauffeurCategory: category,
      bioStatement: get("bioStatement"),
      driversLicenseNumber: get("driversLicenseNumber") || null,
      driversLicenseClassOrType: get("driversLicenseClassOrType") || null,
      driversLicenseJurisdictionCode: get("driversLicenseJurisdictionCode") || null,
      driversLicenseExpiry: driversLicenseExpiry ?? null,
      operatorAccreditationNumber: get("operatorAccreditationNumber") || null,
      visibleOnCustomerApp: visible,
      acceptsDispatchAssignments: dispatch
    };

    setSaving(true);
    try {
      if (isNew) await updateUserRole(uid, "driver");
      const driverTitle =
        activeUser?.profile.displayName?.trim() ||
        activeUser?.email ||
        selectedCandidate?.profile.displayName?.trim() ||
        selectedCandidate?.email ||
        "Chauffeur";
      await updateUserDriverProfile(uid, driverProfile, { driverTitle, isNew });
      if (activeUser) {
        await updateUserProfile(uid, {
          ...activeUser.profile,
          ...toProfilePostalFields(address)
        });
      }
      toast.success(isNew ? "Driver added." : "Driver profile saved.");
      onOpenChange(false);
    } catch {
      toast.error(isNew ? "Could not add the driver." : "Could not save the driver profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedUserId("");
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add driver" : "Edit driver"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Promote an existing account to chauffeur and set their roster profile."
              : activeUser?.email}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4" key={currentKey}>
          {isNew && (
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to promote" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No eligible users
                    </SelectItem>
                  ) : (
                    candidates.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.profile.displayName || u.email} ({userRoleTitle[u.role]})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

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

          <ProfileAddressField
            value={address}
            onChange={(next) => {
              setAddress(next);
              if (addressInvalid && isValidPostalAddress(next)) {
                setAddressInvalid(false);
              }
            }}
            invalid={addressInvalid}
            disabled={saving}
          />

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
            <div className="flex flex-col space-y-2">
              <Label>Licence expiry</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !driversLicenseExpiry && "text-muted-foreground"
                    )}>
                    {driversLicenseExpiry ? (
                      format(driversLicenseExpiry, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                    nested && "z-[110]"
                  )}
                  align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear() + 20}
                    selected={driversLicenseExpiry}
                    onSelect={setDriversLicenseExpiry}
                    defaultMonth={driversLicenseExpiry}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
            <Button type="submit" disabled={saving || (isNew && candidates.length === 0)}>
              {saving ? "Saving…" : isNew ? "Add driver" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

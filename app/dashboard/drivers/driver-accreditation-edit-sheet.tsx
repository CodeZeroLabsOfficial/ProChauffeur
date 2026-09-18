"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { saveDriverProfile } from "@/lib/services/firebase-service";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import type { BranchDriver, User } from "@/lib/models";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { complianceSheetTitle, hasComplianceDetails } from "@/components/compliance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export function DriverAccreditationEditSheet({
  user,
  roster,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  user: User;
  roster: BranchDriver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  nested?: boolean;
}) {
  const { branchId } = useActiveBranch();
  const profile = branchDriverToProfile(roster);
  const isNew = !hasComplianceDetails(profile.operatorAccreditation);
  const [accreditationExpiry, setAccreditationExpiry] = useState<Date | undefined>(
    profile.operatorAccreditation?.expiry ?? undefined
  );
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  if (user.id !== seededId) {
    setSeededId(user.id);
    setAccreditationExpiry(profile.operatorAccreditation?.expiry ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const driverProfile = {
      ...profile,
      operatorAccreditation: {
        number: get("operatorAccreditationNumber") || null,
        issuingAuthority: get("operatorAccreditationIssuingAuthority") || null,
        expiry: accreditationExpiry ?? null
      }
    };

    setSaving(true);
    try {
      const driverTitle = user.profile.displayName?.trim() || user.email || "Chauffeur";
      await saveDriverProfile(user.id, driverProfile, branchId, { driverTitle });
      toast.success("Operator accreditation saved.");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Could not save the operator accreditation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {complianceSheetTitle(isNew, {
              add: "Add accreditation",
              edit: "Edit operator accreditation"
            })}
          </SheetTitle>
          <SheetDescription>
            {isNew
              ? "Create a new operator accreditation."
              : `Update the accreditation for “${user.profile.displayName?.trim() || user.email || "this driver"}”.`}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" key={user.id}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label htmlFor="accreditation-number">Accreditation no.</Label>
              <Input
                id="accreditation-number"
                name="operatorAccreditationNumber"
                defaultValue={profile.operatorAccreditation?.number ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accreditation-authority">Issuing authority</Label>
              <Input
                id="accreditation-authority"
                name="operatorAccreditationIssuingAuthority"
                defaultValue={profile.operatorAccreditation?.issuingAuthority ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !accreditationExpiry && "text-muted-foreground"
                    )}>
                    {accreditationExpiry ? (
                      format(accreditationExpiry, "PPP")
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
                    selected={accreditationExpiry}
                    onSelect={setAccreditationExpiry}
                    defaultMonth={accreditationExpiry}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="shrink-0 border-t px-4 pt-4 pb-4">
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 p-0 sm:justify-between">
              <span />
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

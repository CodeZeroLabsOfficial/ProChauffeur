"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Cake,
  Calendar,
  CalendarPlus,
  Clock,
  ExternalLink,
  IdCard,
  Landmark,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Tags,
  User as UserIcon
} from "lucide-react";
import { z } from "zod";

import {
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type DriverProfile,
  type User
} from "@/lib/models";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableToggleField } from "@/components/inline-editable-toggle-field";
import { DetailLabel, LabeledDetailValue, SectionHeading } from "@/components/detail-sheet-fields";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchUserLastSignIn,
  updateUserDriverProfile,
  updateUserEmail,
  updateUserProfile
} from "@/lib/services/firebase-service";
import {
  chauffeurCategoryBadgeIcon,
  dispatchBadgeIcon,
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

function DriverOverviewFields({
  user,
  profile,
  lastSignInAt
}: {
  user: User;
  profile: DriverProfile;
  lastSignInAt: Date | null | undefined;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const displayName = user.profile.displayName.trim() || user.email || "";
  const address = profile.homeAddressLine?.trim() || user.profile.address?.trim() || "";
  const lastActivityLabel =
    lastSignInAt === undefined ? "…" : formatDateTime(lastSignInAt);
  const driverTitle = user.profile.displayName?.trim() || user.email || "Chauffeur";

  async function saveProfile(
    patch: Partial<User["profile"]>
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await updateUserProfile(user.id, { ...user.profile, ...patch });
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not save." };
    }
  }

  async function saveDriver(
    patch: Partial<DriverProfile>
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await updateUserDriverProfile(user.id, { ...profile, ...patch }, { driverTitle });
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not save." };
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Contact Details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={UserIcon}>Name</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="name"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={displayName}
                editLabel="name"
                placeholder="Add name"
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return { ok: false, message: "Name is required." };
                  }
                  return saveProfile({ displayName: trimmed });
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Cake}>Date of birth</DetailLabel>
            <dd>
              <InlineEditableDateField
                fieldId="dateOfBirth"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={user.profile.dateOfBirth}
                editLabel="date of birth"
                onSave={async (next) => saveProfile({ dateOfBirth: next })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Mail}>Email</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="email"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={user.email}
                inputType="email"
                editLabel="email"
                placeholder="email@example.com"
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return { ok: false, message: "Email is required." };
                  }
                  if (!z.string().email().safeParse(trimmed).success) {
                    return { ok: false, message: "Enter a valid email address." };
                  }
                  try {
                    await updateUserEmail(user.id, trimmed);
                    return { ok: true };
                  } catch {
                    return { ok: false, message: "Could not save." };
                  }
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Phone}>Phone</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="phone"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={user.profile.phoneNumber?.trim() ?? ""}
                inputType="tel"
                editLabel="phone"
                placeholder="Phone number"
                onSave={async (next) => saveProfile({ phoneNumber: next.trim() || null })}
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={MapPin}>Address</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="address"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={address}
                editLabel="address"
                placeholder="Add address"
                multiline
                onSave={async (next) => {
                  const trimmed = next.trim();
                  try {
                    await updateUserProfile(user.id, {
                      ...user.profile,
                      address: trimmed || null
                    });
                    await updateUserDriverProfile(
                      user.id,
                      { ...profile, homeAddressLine: trimmed || null },
                      { driverTitle }
                    );
                    return { ok: true };
                  } catch {
                    return { ok: false, message: "Could not save." };
                  }
                }}
              />
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <SectionHeading>Status</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={dispatchBadgeIcon(profile.acceptsDispatchAssignments)}>
              Dispatch
            </DetailLabel>
            <dd>
              <InlineEditableToggleField
                fieldId="dispatch"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.acceptsDispatchAssignments}
                formatValue={(v) => (v ? "Accepting dispatch" : "Dispatch paused")}
                editLabel="dispatch"
                onSave={async (next) => saveDriver({ acceptsDispatchAssignments: next })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={visibilityBadgeIcon(profile.visibleOnCustomerApp)}>
              Visibility
            </DetailLabel>
            <dd>
              <InlineEditableToggleField
                fieldId="visibility"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.visibleOnCustomerApp}
                formatValue={(v) => visibilityStatusLabel(v)}
                editLabel="visibility"
                onSave={async (next) => saveDriver({ visibleOnCustomerApp: next })}
              />
            </dd>
          </div>
          <LabeledDetailValue
            icon={CalendarPlus}
            label="Join date"
            value={formatDate(user.createdAt)}
            className="pb-4"
          />
          <LabeledDetailValue
            icon={Clock}
            label="Last activity"
            value={lastActivityLabel}
            className="pb-4"
          />
        </dl>
      </div>
    </div>
  );
}

function DriverComplianceFields({ user, profile }: { user: User; profile: DriverProfile }) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const driverTitle = user.profile.displayName?.trim() || user.email || "Chauffeur";

  async function saveDriver(
    patch: Partial<DriverProfile>
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await updateUserDriverProfile(user.id, { ...profile, ...patch }, { driverTitle });
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not save." };
    }
  }

  const licenceExpiryWarn = expiryWarning(profile.driversLicenseExpiry);
  const accreditationExpiryWarn = expiryWarning(profile.operatorAccreditationExpiry);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Driver licence</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={IdCard}>Licence no.</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="licenceNo"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.driversLicenseNumber?.trim() ?? ""}
                editLabel="licence number"
                placeholder="Licence number"
                onSave={async (next) =>
                  saveDriver({ driversLicenseNumber: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Tags}>Class / type</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="licenceClass"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.driversLicenseClassOrType?.trim() ?? ""}
                editLabel="licence class"
                placeholder="Class / type"
                onSave={async (next) =>
                  saveDriver({ driversLicenseClassOrType: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Landmark}>State</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="licenceState"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.driversLicenseJurisdictionCode?.trim() ?? ""}
                editLabel="licence state"
                placeholder="NSW"
                onSave={async (next) =>
                  saveDriver({ driversLicenseJurisdictionCode: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={ListChecks}>Conditions</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="licenceConditions"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.driversLicenseConditions?.trim() ?? ""}
                editLabel="licence conditions"
                placeholder="Conditions"
                onSave={async (next) =>
                  saveDriver({ driversLicenseConditions: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={Calendar}>Expiry</DetailLabel>
            <dd>
              <InlineEditableDateField
                fieldId="licenceExpiry"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.driversLicenseExpiry}
                editLabel="licence expiry"
                dateRange="expiry"
                trailingContent={
                  licenceExpiryWarn ? <ExpiryBadge level={licenceExpiryWarn} /> : null
                }
                onSave={async (next) => saveDriver({ driversLicenseExpiry: next })}
              />
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <SectionHeading>Operator accreditation</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={BadgeCheck}>Accreditation no.</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="accreditationNo"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.operatorAccreditationNumber?.trim() ?? ""}
                editLabel="accreditation number"
                placeholder="Accreditation no."
                onSave={async (next) =>
                  saveDriver({ operatorAccreditationNumber: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Building2}>Issuing authority</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="accreditationAuthority"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.operatorAccreditationIssuingAuthority?.trim() ?? ""}
                editLabel="issuing authority"
                placeholder="Issuing authority"
                onSave={async (next) =>
                  saveDriver({ operatorAccreditationIssuingAuthority: next.trim() || null })
                }
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={Calendar}>Expiry</DetailLabel>
            <dd>
              <InlineEditableDateField
                fieldId="accreditationExpiry"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={profile.operatorAccreditationExpiry}
                editLabel="accreditation expiry"
                dateRange="expiry"
                trailingContent={
                  accreditationExpiryWarn ? (
                    <ExpiryBadge level={accreditationExpiryWarn} />
                  ) : null
                }
                onSave={async (next) => saveDriver({ operatorAccreditationExpiry: next })}
              />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function DriverTabPlaceholder({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-sm">
      No {label.toLowerCase()} information yet.
    </p>
  );
}

export function DriverDetailSheet({
  user,
  open,
  onOpenChange
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const displayUser = useSheetDisplayItem(user, open);
  const [lastSignInAt, setLastSignInAt] = useState<Date | null | undefined>(undefined);

  useEffect(() => {
    if (!open || !displayUser?.id) {
      setLastSignInAt(undefined);
      return;
    }

    let cancelled = false;
    setLastSignInAt(undefined);
    void fetchUserLastSignIn(displayUser.id).then((date) => {
      if (!cancelled) setLastSignInAt(date);
    });

    return () => {
      cancelled = true;
    };
  }, [open, displayUser?.id]);

  if (!displayUser) return null;

  const profile = displayUser.driverProfile ?? defaultDriverProfile();
  const displayName = displayUser.profile.displayName.trim() || "Driver";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <SheetTitle>Driver profile</SheetTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/drivers/${displayUser.id}`}
                  onClick={() => onOpenChange(false)}>
                  <ExternalLink />
                  View profile
                </Link>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="inline-flex items-center gap-4 align-top">
            <Avatar className="h-20 w-20">
              <AvatarImage src={displayUser.profile.photoURL ?? undefined} />
              <AvatarFallback>
                {generateAvatarFallback(displayName || displayUser.email)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <p className="text-lg font-semibold">{displayName}</p>
              <div className="flex flex-wrap items-center gap-2">
                <DetailSheetIconBadge icon={chauffeurCategoryBadgeIcon[profile.chauffeurCategory]}>
                  {chauffeurCategoryTitle[profile.chauffeurCategory]}
                </DetailSheetIconBadge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 border-none bg-transparent p-0"
              )}>
              <TabsTrigger value="overview" className={tabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="compliance" className={tabTriggerClassName}>
                Compliance
              </TabsTrigger>
              <TabsTrigger value="operations" className={tabTriggerClassName}>
                Operations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <DriverOverviewFields
                user={displayUser}
                profile={profile}
                lastSignInAt={lastSignInAt}
              />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <DriverComplianceFields user={displayUser} profile={profile} />
            </TabsContent>
            <TabsContent value="operations" className="mt-0">
              <DriverTabPlaceholder label="Operations" />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cake, Edit, ExternalLink, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";
import { z } from "zod";

import {
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type DriverProfile,
  type User
} from "@/lib/models";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchDriverLastSignIn,
  updateUserDriverProfile,
  updateUserEmail,
  updateUserProfile
} from "@/lib/services/firebase-service";
import {
  chauffeurCategoryBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

const detailLabelClass =
  "text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase";

const detailLabelIconClass = "size-3.5 shrink-0 opacity-80";

function DetailField({
  label,
  value,
  href
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const text = value?.trim() || "—";
  const hasLink = Boolean(href && value?.trim());

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      {hasLink ? (
        <a href={href} className="text-muted-foreground text-sm hover:underline">
          {text}
        </a>
      ) : (
        <p className="text-muted-foreground text-sm">{text}</p>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-semibold">{children}</h4>;
}

function expiryWarning(date: Date | null | undefined): "expired" | "soon" | null {
  if (!date) return null;
  const now = new Date();
  if (date < now) return "expired";
  const days = (date.getTime() - now.getTime()) / 86400000;
  if (days <= 60) return "soon";
  return null;
}

function ExpiryBadge({ level }: { level: "expired" | "soon" }) {
  return (
    <Badge variant={level === "expired" ? "destructive" : "outline"} className="ms-2">
      {level === "expired" ? "Expired" : "Expiring soon"}
    </Badge>
  );
}

function ExpiryDetailField({
  label,
  date
}: {
  label: string;
  date: Date | null | undefined;
}) {
  const warn = expiryWarning(date);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      <p className="text-muted-foreground text-sm">
        {formatDate(date)}
        {warn ? <ExpiryBadge level={warn} /> : null}
      </p>
    </div>
  );
}

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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <dt className={detailLabelClass}>
              <UserIcon className={detailLabelIconClass} aria-hidden />
              Name
            </dt>
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
            <dt className={detailLabelClass}>
              <Cake className={detailLabelIconClass} aria-hidden />
              Date of birth
            </dt>
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
            <dt className={detailLabelClass}>
              <Mail className={detailLabelIconClass} aria-hidden />
              Email
            </dt>
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
            <dt className={detailLabelClass}>
              <Phone className={detailLabelIconClass} aria-hidden />
              Phone
            </dt>
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
            <dt className={detailLabelClass}>
              <MapPin className={detailLabelIconClass} aria-hidden />
              Address
            </dt>
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
        <div className="grid grid-cols-2 gap-4">
          <DetailField
            label="Dispatch"
            value={
              profile.acceptsDispatchAssignments ? "Accepting dispatch" : "Dispatch paused"
            }
          />
          <DetailField
            label="Visibility"
            value={visibilityStatusLabel(profile.visibleOnCustomerApp)}
          />
          <DetailField label="Join date" value={formatDate(user.createdAt)} />
          <DetailField label="Last activity" value={lastActivityLabel} />
        </div>
      </div>

      <div className="space-y-2">
        <SectionHeading>Bio</SectionHeading>
        <p className="text-muted-foreground text-sm">
          {profile.bioStatement.trim() || "No bio provided."}
        </p>
      </div>
    </div>
  );
}

function DriverComplianceFields({ profile }: { profile: DriverProfile }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Driver licence</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Licence no." value={profile.driversLicenseNumber} />
          <DetailField label="Class / type" value={profile.driversLicenseClassOrType} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="State" value={profile.driversLicenseJurisdictionCode} />
          <DetailField label="Conditions" value={profile.driversLicenseConditions} />
        </div>
        <ExpiryDetailField label="Expiry" date={profile.driversLicenseExpiry} />
      </div>

      <div className="space-y-4">
        <SectionHeading>Operator accreditation</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <DetailField
            label="Accreditation no."
            value={profile.operatorAccreditationNumber}
          />
          <DetailField
            label="Issuing authority"
            value={profile.operatorAccreditationIssuingAuthority}
          />
        </div>
        <ExpiryDetailField label="Expiry" date={profile.operatorAccreditationExpiry} />
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
  onOpenChange,
  onEditClick
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
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
    void fetchDriverLastSignIn(displayUser.id).then((date) => {
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
              {onEditClick && (
                <Button variant="outline" onClick={onEditClick}>
                  <Edit />
                  Edit
                </Button>
              )}
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
                "-mb-0.5 h-auto w-full justify-start gap-4 overflow-x-auto border-none bg-transparent p-0"
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
              <DriverComplianceFields profile={profile} />
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

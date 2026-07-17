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
  ImagePlusIcon,
  Landmark,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Tags,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type DriverProfile,
  type User
} from "@/lib/models";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineProfileAddressField } from "@/components/inline-profile-address-field";
import { InlineEditableToggleField } from "@/components/inline-editable-toggle-field";
import { DetailLabel, LabeledDetailValue, SectionHeading } from "@/components/detail-sheet-fields";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchUserLastSignIn,
  updateUserDriverProfile,
  updateUserEmail,
  updateUserProfile,
  uploadUserProfilePhoto
} from "@/lib/services/firebase-service";
import {
  chauffeurCategoryBadgeIcon,
  dispatchBadgeIcon,
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { generateAvatarFallback } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
  ProfileV2TabTrigger,
  profileV2TabsListClassName
} from "@/components/layout/profile-tab-bar";

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
              <InlineProfileAddressField
                fieldId="address"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                profile={user.profile}
                editLabel="address"
                onSave={async (fields) => saveProfile(fields)}
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

function DriverProfileAvatarUpload({ user }: { user: User }) {
  const [uploading, setUploading] = useState(false);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(user.profile.photoURL ?? null);
  const displayName = user.profile.displayName.trim() || user.email || "Driver";
  const initials = generateAvatarFallback(displayName);

  const [{ files }, { openFileDialog, getInputProps, clearFiles }] = useFileUpload({
    accept: "image/*",
    onFilesAdded: (added) => {
      const file = added[0]?.file;
      if (!(file instanceof File)) return;

      void (async () => {
        setUploading(true);
        try {
          const photoURL = await uploadUserProfilePhoto(user.id, file);
          await updateUserProfile(user.id, { ...user.profile, photoURL });
          setLocalPhotoURL(photoURL);
          clearFiles();
          toast.success("Profile photo updated.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not upload photo.");
        } finally {
          setUploading(false);
        }
      })();
    }
  });

  const previewUrl = files[0]?.preview ?? localPhotoURL;

  useEffect(() => {
    setLocalPhotoURL(user.profile.photoURL ?? null);
  }, [user.profile.photoURL]);

  return (
    <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 shadow-xs shadow-black/10">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob / Storage download URL preview
        <img alt="" className="size-full object-cover" height={80} src={previewUrl} width={80} />
      ) : (
        <span className="text-muted-foreground text-sm font-medium">{initials}</span>
      )}
      <button
        type="button"
        aria-label="Change profile picture"
        disabled={uploading}
        className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        onClick={openFileDialog}>
        <ImagePlusIcon aria-hidden size={16} />
      </button>
      <input {...getInputProps()} aria-label="Upload profile picture" className="sr-only" />
    </div>
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
            <DriverProfileAvatarUpload key={displayUser.id} user={displayUser} />
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
            <TabsList className={`${profileV2TabsListClassName} w-full justify-start`}>
              <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="compliance">Compliance</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="operations">Operations</ProfileV2TabTrigger>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarPlus,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User as UserIcon
} from "lucide-react";
import { z } from "zod";

import type { User } from "@/lib/models";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineProfileAddressField } from "@/components/inline-profile-address-field";
import { DetailLabel, LabeledDetailValue, SectionHeading } from "@/components/detail-sheet-fields";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  fetchCorporateAccount,
  fetchUserLastSignIn,
  updateUserEmail,
  updateUserProfile
} from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

function CustomerOverviewFields({
  user,
  lastSignInAt,
  tripCount,
  corporateAccountName
}: {
  user: User;
  lastSignInAt: Date | null | undefined;
  tripCount: number;
  corporateAccountName: string | null;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const displayName = customerDisplayName(user);
  const lastActivityLabel =
    lastSignInAt === undefined ? "…" : formatDateTime(lastSignInAt);
  const isCorporate = Boolean(user.corporateAccountId?.trim());

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
          {isCorporate ? (
            <div className="col-span-2 space-y-1">
              <DetailLabel icon={Building2}>Corporate account</DetailLabel>
              <dd>
                {user.corporateAccountId && corporateAccountName ? (
                  <Link
                    href={`/dashboard/accounts/${user.corporateAccountId}`}
                    className="hover:text-primary text-sm hover:underline">
                    {corporateAccountName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="space-y-4">
        <SectionHeading>Account</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <LabeledDetailValue
            icon={CalendarPlus}
            label="Member since"
            value={formatDate(user.createdAt)}
            className="pb-4"
          />
          <LabeledDetailValue
            icon={Clock}
            label="Last sign-in"
            value={lastActivityLabel}
            className="pb-4"
          />
          <LabeledDetailValue
            icon={CalendarPlus}
            label="Bookings"
            value={String(tripCount)}
            className="pb-4"
          />
        </dl>
      </div>
    </div>
  );
}

export function CustomerDetailSheet({
  user,
  open,
  onOpenChange,
  tripCount = 0
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripCount?: number;
}) {
  const displayUser = useSheetDisplayItem(user, open);
  const [lastSignInAt, setLastSignInAt] = useState<Date | null | undefined>(undefined);
  const [corporateAccountName, setCorporateAccountName] = useState<string | null>(null);

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

  useEffect(() => {
    const accountId = displayUser?.corporateAccountId?.trim();
    if (!open || !accountId) {
      setCorporateAccountName(null);
      return;
    }
    let cancelled = false;
    fetchCorporateAccount(accountId)
      .then((account) => {
        if (!cancelled) setCorporateAccountName(account?.name?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setCorporateAccountName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, displayUser?.corporateAccountId]);

  if (!displayUser) return null;

  const displayName = customerDisplayName(displayUser);
  const isCorporate = Boolean(displayUser.corporateAccountId?.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <SheetTitle>Customer profile</SheetTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/customers/${displayUser.id}`}
                  onClick={() => onOpenChange(false)}>
                  <ExternalLink />
                  View details
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
              <p className="text-muted-foreground text-sm">{displayUser.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    isCorporate
                      ? "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-border bg-muted text-muted-foreground"
                  )}>
                  {isCorporate ? "Corporate" : "Individual"}
                </Badge>
                {isCorporate && corporateAccountName ? (
                  <Badge variant="outline" asChild>
                    <Link
                      href={`/dashboard/accounts/${displayUser.corporateAccountId}`}
                      className="font-medium">
                      {corporateAccountName}
                    </Link>
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <CustomerOverviewFields
            user={displayUser}
            lastSignInAt={lastSignInAt}
            tripCount={tripCount}
            corporateAccountName={corporateAccountName}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

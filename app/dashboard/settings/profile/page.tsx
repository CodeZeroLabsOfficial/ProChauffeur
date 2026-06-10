"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CircleUserRoundIcon, PencilIcon } from "lucide-react";

import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { fetchUser } from "@/lib/services/firebase-service";
import { userRoleTitle, type User } from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditSheet } from "@/app/dashboard/settings/profile/profile-edit-sheet";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Not set";
}

function displayName(user: User): string {
  const fromParts = `${user.profile.firstName ?? ""} ${user.profile.lastName ?? ""}`.trim();
  return fromParts || user.profile.displayName.trim() || user.email;
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "Not set";
  return format(value, "PPP");
}

function DetailField({
  label,
  value,
  href
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  const text = displayValue(value);
  const hasLink = Boolean(href && value?.trim());

  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      {hasLink ? (
        <a href={href} className="font-medium hover:underline">
          {text}
        </a>
      ) : (
        <p className="font-medium">{text}</p>
      )}
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user: authUser } = useFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadUser = useCallback(() => {
    return fetchUser(authUser.uid).then(setUser);
  }, [authUser.uid]);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  if (loading || !user) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const name = displayName(user);
  const initials = generateAvatarFallback(name);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profile.photoURL ?? undefined} alt={name} />
              <AvatarFallback>{initials || <CircleUserRoundIcon className="opacity-45" />}</AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold">{name}</p>
              <Badge variant="secondary">{userRoleTitle[user.role]}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Email" value={user.email} href={`mailto:${user.email}`} />
            <DetailField
              label="Phone number"
              value={user.profile.phoneNumber}
              href={user.profile.phoneNumber ? `tel:${user.profile.phoneNumber}` : undefined}
            />
            <DetailField label="First name" value={user.profile.firstName} />
            <DetailField label="Last name" value={user.profile.lastName} />
            <DetailField label="Address" value={formatPostalAddress(user.profile)} />
            <DetailField label="Date of birth" value={formatDate(user.profile.dateOfBirth)} />
          </div>
        </CardContent>
      </Card>

      <ProfileEditSheet
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={setUser}
      />
    </>
  );
}

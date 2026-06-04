"use client";

import { Edit } from "lucide-react";

import {
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type User
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

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
  if (!user) return null;

  const profile = user.driverProfile ?? defaultDriverProfile();
  const displayName = user.profile.displayName.trim() || "Driver";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between pe-6">
            <SheetTitle>{displayName}</SheetTitle>
            {onEditClick && (
              <Button variant="outline" onClick={onEditClick}>
                <Edit />
                Edit
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{chauffeurCategoryTitle[profile.chauffeurCategory]}</Badge>
            <Badge variant={profile.acceptsDispatchAssignments ? "default" : "secondary"}>
              {profile.acceptsDispatchAssignments ? "Accepting dispatch" : "Dispatch paused"}
            </Badge>
            <Badge variant={profile.visibleOnCustomerApp ? "outline" : "secondary"}>
              {profile.visibleOnCustomerApp ? "Visible on app" : "Hidden on app"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.profile.photoURL ?? undefined} />
              <AvatarFallback>{generateAvatarFallback(displayName || user.email)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-medium">{displayName}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              {user.profile.phoneNumber ? (
                <a
                  href={`tel:${user.profile.phoneNumber}`}
                  className="text-muted-foreground text-sm hover:underline">
                  {user.profile.phoneNumber}
                </a>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Bio</h4>
            <p className="text-muted-foreground text-sm">
              {profile.bioStatement.trim() || "No bio provided."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Licence no." value={profile.driversLicenseNumber} />
            <DetailField label="Class" value={profile.driversLicenseClassOrType} />
            <DetailField label="State" value={profile.driversLicenseJurisdictionCode} />
            <DetailField label="Licence expiry" value={formatDate(profile.driversLicenseExpiry)} />
          </div>

          <DetailField
            label="Operator accreditation no."
            value={profile.operatorAccreditationNumber}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 p-4">
          <DetailField label="Email" value={user.email} href={`mailto:${user.email}`} />
          <DetailField
            label="Phone"
            value={user.profile.phoneNumber}
            href={user.profile.phoneNumber ? `tel:${user.profile.phoneNumber}` : undefined}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

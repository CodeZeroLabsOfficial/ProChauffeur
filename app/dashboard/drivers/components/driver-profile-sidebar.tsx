"use client";

import { Link2Icon, Mail, MapPin, PhoneCall, PencilIcon } from "lucide-react";

import {
  chauffeurCategoryTitle,
  defaultDriverProfile,
  type User
} from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import {
  dispatchBadgeIcon,
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { driverProfileCompleteness } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { ContactRow } from "@/components/contact-row";

export function DriverProfileSidebar({
  user,
  statTrips,
  statCompleted,
  statRevenueLabel,
  onEditClick
}: {
  user: User;
  statTrips: number;
  statCompleted: number;
  statRevenueLabel: string;
  onEditClick?: () => void;
}) {
  const profile = user.driverProfile ?? defaultDriverProfile();
  const displayName = user.profile.displayName.trim() || user.email || "Driver";
  const progressValue = driverProfileCompleteness(user, profile);

  return (
    <div className="space-y-4">
      <Card className="relative">
        {onEditClick ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={onEditClick}
            aria-label="Edit profile">
            <PencilIcon />
          </Button>
        ) : null}
        <CardContent>
          <div className="space-y-12">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="size-20">
                <AvatarImage src={user.profile.photoURL ?? undefined} alt={displayName} />
                <AvatarFallback>{generateAvatarFallback(displayName)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h5 className="flex flex-wrap items-center justify-center gap-2 text-xl font-semibold">
                  {displayName}
                </h5>
                <div className="text-muted-foreground text-sm">
                  {chauffeurCategoryTitle[profile.chauffeurCategory]}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <DetailSheetIconBadge icon={dispatchBadgeIcon(profile.acceptsDispatchAssignments)}>
                    {profile.acceptsDispatchAssignments ? "Accepting dispatch" : "Dispatch paused"}
                  </DetailSheetIconBadge>
                  <DetailSheetIconBadge icon={visibilityBadgeIcon(profile.visibleOnCustomerApp)}>
                    {visibilityStatusLabel(profile.visibleOnCustomerApp)}
                  </DetailSheetIconBadge>
                </div>
              </div>
            </div>

            <div className="bg-muted grid grid-cols-3 divide-x rounded-md border text-center *:py-3">
              <div>
                <h5 className="text-lg font-semibold">{statTrips}</h5>
                <div className="text-muted-foreground text-sm">Trips</div>
              </div>
              <div>
                <h5 className="text-lg font-semibold">{statCompleted}</h5>
                <div className="text-muted-foreground text-sm">Completed</div>
              </div>
              <div>
                <h5 className="text-lg font-semibold tabular-nums">{statRevenueLabel}</h5>
                <div className="text-muted-foreground text-sm">Revenue</div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <ContactRow icon={Mail}>
                <a href={`mailto:${user.email}`} className="hover:text-primary hover:underline">
                  {user.email}
                </a>
              </ContactRow>
              {user.profile.phoneNumber?.trim() ? (
                <ContactRow icon={PhoneCall}>
                  <a
                    href={`tel:${user.profile.phoneNumber}`}
                    className="hover:text-primary hover:underline">
                    {user.profile.phoneNumber}
                  </a>
                </ContactRow>
              ) : null}
              {formatPostalAddress(user.profile) ? (
                <ContactRow icon={MapPin}>{formatPostalAddress(user.profile)}</ContactRow>
              ) : null}
              {profile.bioStatement.trim() ? (
                <ContactRow icon={Link2Icon}>
                  <span className="text-muted-foreground line-clamp-3">{profile.bioStatement}</span>
                </ContactRow>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complete profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Progress value={progressValue} className="flex-1" />
          <div className="text-muted-foreground text-sm">%{progressValue}</div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { Mail, MapPin, PhoneCall, PencilIcon } from "lucide-react";

import type { User } from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { customerProfileCompleteness } from "@/app/dashboard/customers/lib/customer-profile-metrics";
import { customerDisplayName } from "@/lib/users/customer-display";
import { formatDate } from "@/lib/format";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function ContactRow({
  icon: Icon,
  children
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      {children}
    </div>
  );
}

export function CustomerProfileSidebar({
  user,
  statTrips,
  statCompleted,
  statSpendLabel,
  onEditClick
}: {
  user: User;
  statTrips: number;
  statCompleted: number;
  statSpendLabel: string;
  onEditClick?: () => void;
}) {
  const displayName = customerDisplayName(user);
  const progressValue = customerProfileCompleteness(user);

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
                <h5 className="text-xl font-semibold">{displayName}</h5>
                <div className="text-muted-foreground text-sm">Customer</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Member since {formatDate(user.createdAt)}
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
                <h5 className="text-lg font-semibold tabular-nums">{statSpendLabel}</h5>
                <div className="text-muted-foreground text-sm">Spend</div>
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

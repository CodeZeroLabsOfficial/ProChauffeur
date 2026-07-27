"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, PhoneCall, PencilIcon } from "lucide-react";

import type { User } from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { customerProfileCompleteness } from "@/app/dashboard/customers/lib/customer-profile-metrics";
import { customerDisplayName } from "@/lib/users/customer-display";
import { formatDate } from "@/lib/format";
import { fetchCorporateAccount } from "@/lib/services/firebase-service";
import { generateAvatarFallback, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ContactRow } from "@/components/contact-row";

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
  const [corporateAccountName, setCorporateAccountName] = useState<string | null>(null);
  const isCorporate = Boolean(user.corporateAccountId?.trim());

  useEffect(() => {
    const accountId = user.corporateAccountId?.trim();
    if (!accountId) {
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
  }, [user.corporateAccountId]);

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
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
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
                  {isCorporate && user.corporateAccountId && corporateAccountName ? (
                    <Badge variant="outline" asChild>
                      <Link
                        href={`/dashboard/accounts/${user.corporateAccountId}`}
                        className="font-medium">
                        {corporateAccountName}
                      </Link>
                    </Badge>
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-2 text-xs">
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
              {isCorporate && user.corporateAccountId && corporateAccountName ? (
                <ContactRow icon={Building2}>
                  <Link
                    href={`/dashboard/accounts/${user.corporateAccountId}`}
                    className="hover:text-primary hover:underline">
                    {corporateAccountName}
                  </Link>
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

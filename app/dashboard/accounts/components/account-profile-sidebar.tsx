"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Hash,
  Mail,
  MapPin,
  PencilIcon,
  PhoneCall,
  UserRound
} from "lucide-react";

import { ContactRow } from "@/components/contact-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import {
  corporateAccountStatusTitle,
  type CorporateAccount,
  type User
} from "@/lib/models";
import { fetchUser } from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";
import { cn } from "@/lib/utils";

function formatAddress(account: CorporateAccount): string | null {
  const parts = [
    account.addressLine1,
    account.addressLine2,
    [account.city, account.state, account.postcode].filter(Boolean).join(" "),
    account.country
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function AccountProfileSidebar({
  account,
  mtdSpend,
  openBalance,
  onEditClick
}: {
  account: CorporateAccount;
  mtdSpend: number;
  openBalance: number;
  onEditClick?: () => void;
}) {
  const [manager, setManager] = useState<User | null>(null);
  const budget = account.monthlyBudget;
  const credit = account.creditLimit;
  const budgetPct =
    budget != null && budget > 0 ? Math.min(100, Math.round((mtdSpend / budget) * 100)) : null;
  const creditPct =
    credit != null && credit > 0 ? Math.min(100, Math.round((openBalance / credit) * 100)) : null;
  const address = formatAddress(account);

  useEffect(() => {
    const id = account.accountManagerUserId?.trim();
    if (!id) {
      setManager(null);
      return;
    }
    let cancelled = false;
    fetchUser(id)
      .then((user) => {
        if (!cancelled) setManager(user?.role === "admin" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setManager(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account.accountManagerUserId]);

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
            aria-label="Edit account">
            <PencilIcon />
          </Button>
        ) : null}
        <CardContent>
          <div className="space-y-8">
            <div className="pr-10">
              <h5 className="text-xl font-semibold">{account.name}</h5>
              <Badge
                variant="outline"
                className={cn(
                  "mt-2 font-medium",
                  account.status === "active"
                    ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                )}>
                {corporateAccountStatusTitle[account.status]}
              </Badge>
            </div>

            <div className="flex flex-col gap-y-4">
              {account.abn?.trim() ? (
                <ContactRow icon={Hash}>ABN {account.abn}</ContactRow>
              ) : null}
              {account.joinCode?.trim() ? (
                <ContactRow icon={Building2}>
                  Join code{" "}
                  <span className="font-mono tracking-wide">{account.joinCode}</span>
                </ContactRow>
              ) : null}
              {account.billingEmail?.trim() ? (
                <ContactRow icon={Mail}>
                  <a
                    href={`mailto:${account.billingEmail}`}
                    className="hover:text-primary hover:underline">
                    {account.billingEmail}
                  </a>
                </ContactRow>
              ) : null}
              {account.billingPhone?.trim() ? (
                <ContactRow icon={PhoneCall}>
                  <a
                    href={`tel:${account.billingPhone}`}
                    className="hover:text-primary hover:underline">
                    {account.billingPhone}
                  </a>
                </ContactRow>
              ) : null}
              {address ? <ContactRow icon={MapPin}>{address}</ContactRow> : null}
              {manager ? (
                <ContactRow icon={UserRound}>{customerDisplayName(manager)}</ContactRow>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly spend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums font-medium">{formatCurrency(mtdSpend)}</span>
            <span className="text-muted-foreground">
              {budget != null ? `of ${formatCurrency(budget)}` : "No monthly budget"}
            </span>
          </div>
          {budgetPct != null ? <Progress value={budgetPct} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums font-medium">{formatCurrency(openBalance)}</span>
            <span className="text-muted-foreground">
              {credit != null ? `of ${formatCurrency(credit)} credit` : "No credit limit"}
            </span>
          </div>
          {creditPct != null ? <Progress value={creditPct} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  corporatePreferredPaymentTitle,
  corporateRateModeTitle,
  type CorporateAccount,
  type User
} from "@/lib/models";
import { customerDisplayName } from "@/lib/users/customer-display";

function billingDayLabel(account: CorporateAccount): string {
  return account.billingDay === "last" ? "Last day of month" : String(account.billingDay);
}

export function AccountOverviewTab({
  account,
  manager,
  membersCount
}: {
  account: CorporateAccount;
  manager: User | null;
  membersCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Name" value={account.name} />
          <Row label="ABN" value={account.abn} />
          <Row label="PO number" value={account.poNumber} />
          <Row label="Billing day" value={billingDayLabel(account)} />
          <Row label="Payment terms" value={`${account.paymentTermsDays} days`} />
          <Row label="Rate mode" value={corporateRateModeTitle[account.rateMode]} />
          <Row
            label="Preferred payment"
            value={
              account.preferredPayment
                ? corporatePreferredPaymentTitle[account.preferredPayment]
                : null
            }
          />
          <Row label="GST inclusive" value={account.gstInclusive ? "Yes" : "No"} />
          <Row label="Notes" value={account.notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Primary" value={account.primaryContactName} />
          <Row label="Primary email" value={account.primaryContactEmail} />
          <Row label="Primary phone" value={account.primaryContactPhone} />
          <Row label="Billing" value={account.billingContactName} />
          <Row label="Billing email" value={account.billingContactEmail ?? account.billingEmail} />
          <Row label="Billing phone" value={account.billingContactPhone ?? account.billingPhone} />
          <Row label="Account manager" value={manager ? customerDisplayName(manager) : null} />
          <Row label="Members" value={String(membersCount)} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Policy summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <Row
            label="Max per ride"
            value={
              account.maxRideAmount != null ? formatCurrency(account.maxRideAmount) : "Unlimited"
            }
          />
          <Row
            label="Monthly budget"
            value={
              account.monthlyBudget != null ? formatCurrency(account.monthlyBudget) : "Unlimited"
            }
          />
          <Row
            label="Credit limit"
            value={account.creditLimit != null ? formatCurrency(account.creditLimit) : "Unlimited"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium wrap-break-word">{value?.trim() || "—"}</p>
    </div>
  );
}

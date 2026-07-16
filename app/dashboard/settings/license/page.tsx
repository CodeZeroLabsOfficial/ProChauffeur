"use client";

import { useEffect, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useUsers } from "@/hooks/use-collections";
import { fetchGlobalLimits } from "@/lib/services/firebase-service";
import {
  capLabel,
  UNLIMITED,
  unlimitedLimits,
  usagePercent,
  type AppGlobalLimits
} from "@/lib/models";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type LimitRow = {
  label: string;
  used: number;
  max: number;
};

function LimitUsageBar({ label, used, max }: LimitRow) {
  const capped = max < UNLIMITED;
  const percent = usagePercent(used, max);
  const overLimit = capped && used > max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {capLabel(max)}
        </span>
      </div>
      {capped && (
        <Progress
          value={percent}
          indicatorColor={overLimit ? "bg-destructive" : undefined}
        />
      )}
    </div>
  );
}

export default function LicensePage() {
  const { users, loading: usersLoading } = useUsers();
  const { branches, branchesLoading } = useActiveBranch();
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(true);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .catch(() => setLimits(unlimitedLimits))
      .finally(() => setLimitsLoading(false));
  }, []);

  const loading = usersLoading || branchesLoading || limitsLoading;
  const resolved = limits ?? unlimitedLimits;

  const adminCount = users.filter((u) => u.role === "admin").length;
  const driverCount = users.filter((u) => u.role === "driver").length;

  const rows: LimitRow[] = [
    { label: "Admin accounts", used: adminCount, max: resolved.maxAdmins },
    { label: "Drivers", used: driverCount, max: resolved.maxDrivers },
    { label: "Locations", used: branches.length, max: resolved.maxLocations }
  ];

  const tier = resolved.subscriptionTier.trim();
  const planTitle = tier ? `You're on ${tier} plan` : "Your subscription";

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{planTitle}</CardTitle>
        <CardDescription>
          License usage and account capacity for your current subscription.
        </CardDescription>
        <CardAction>
          <Button variant="outline">Manage plan</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 space-y-4 rounded-lg border p-6">
          <p className="font-semibold">License limits</p>
          <div className="space-y-4">
            {rows.map((row) => (
              <LimitUsageBar key={row.label} {...row} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

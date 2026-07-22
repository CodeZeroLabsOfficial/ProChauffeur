"use client";

import { useEffect, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useUsers } from "@/hooks/use-collections";
import { fetchLicense, fetchPlansCatalog } from "@/lib/services/firebase-service";
import {
  FEATURE_IDS,
  FEATURE_LABELS,
  capLabel,
  defaultLicense,
  defaultPlansCatalog,
  featureSource,
  isFeatureEnabled,
  planLabel,
  UNLIMITED,
  usagePercent,
  type AppLicense,
  type AppPlansCatalog,
  type FeatureSource
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

const SOURCE_LABEL: Record<FeatureSource, string> = {
  plan: "Included in plan",
  addon: "Add-on",
  not_included: "Not included",
  disabled: "Disabled"
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
  const [license, setLicense] = useState<AppLicense | null>(null);
  const [catalog, setCatalog] = useState<AppPlansCatalog | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLicense(), fetchPlansCatalog()])
      .then(([nextLicense, nextCatalog]) => {
        if (cancelled) return;
        setLicense(nextLicense);
        setCatalog(nextCatalog);
      })
      .catch(() => {
        if (cancelled) return;
        setLicense(defaultLicense);
        setCatalog(defaultPlansCatalog);
      })
      .finally(() => {
        if (!cancelled) setLicenseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = usersLoading || branchesLoading || licenseLoading;
  const resolved = license ?? defaultLicense;
  const plans = catalog ?? defaultPlansCatalog;

  const adminCount = users.filter((u) => u.role === "admin").length;
  const driverCount = users.filter((u) => u.role === "driver").length;

  const rows: LimitRow[] = [
    { label: "Admin accounts", used: adminCount, max: resolved.maxAdmins },
    { label: "Drivers", used: driverCount, max: resolved.maxDrivers },
    { label: "Locations", used: branches.length, max: resolved.maxLocations }
  ];

  const label = planLabel(resolved, plans);
  const planTitle = label ? `You're on ${label} plan` : "Your subscription";

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{planTitle}</CardTitle>
        <CardDescription>
          License usage, plan features, and account capacity for your current subscription.
        </CardDescription>
        <CardAction>
          <Button variant="outline">Manage plan</Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 space-y-4 rounded-lg border p-6">
          <p className="font-semibold">License limits</p>
          <div className="space-y-4">
            {rows.map((row) => (
              <LimitUsageBar key={row.label} {...row} />
            ))}
          </div>
        </div>

        <div className="bg-muted/50 space-y-4 rounded-lg border p-6">
          <p className="font-semibold">Features</p>
          <ul className="space-y-3">
            {FEATURE_IDS.map((feature) => {
              const enabled = isFeatureEnabled(resolved, plans, feature);
              const source = featureSource(resolved, plans, feature);
              return (
                <li
                  key={feature}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span>{FEATURE_LABELS[feature]}</span>
                  <span className="text-muted-foreground shrink-0 text-right">
                    {enabled ? "On" : "Off"}
                    <span className="text-muted-foreground/80"> · {SOURCE_LABEL[source]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

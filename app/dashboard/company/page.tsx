"use client";

import { useEffect, useState } from "react";

import { fetchCompanyProfile } from "@/lib/services/firebase-service";
import type { CompanyProfile } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Not set";
}

function websiteHref(website: string | null | undefined): string | undefined {
  const trimmed = website?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
        <a href={href} className="font-medium hover:underline" target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        <p className="font-medium">{text}</p>
      )}
    </div>
  );
}

export default function CompanyOverviewPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    fetchCompanyProfile()
      .then(setCompany)
      .catch(() => setCompany(null));
  }, []);

  if (!company) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const address = company.address;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Company name" value={company.name} />
          <DetailField label="Company phone" value={company.phone} href={company.phone ? `tel:${company.phone}` : undefined} />
          <DetailField label="Company email" value={company.email} href={company.email ? `mailto:${company.email}` : undefined} />
          <DetailField label="Company website" value={company.website} href={websiteHref(company.website)} />
          <DetailField label="Company ABN" value={company.abn} />
          <DetailField label="Company ACN" value={company.acn} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Street" value={address?.street} />
          <DetailField label="City" value={address?.city} />
          <DetailField label="State" value={address?.state} />
          <DetailField label="Postcode" value={address?.postcode} />
          <DetailField label="Country" value={address?.country} />
        </CardContent>
      </Card>
    </div>
  );
}

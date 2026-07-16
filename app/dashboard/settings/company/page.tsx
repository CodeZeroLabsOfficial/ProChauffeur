"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";

import { CompanyEditSheet } from "@/app/dashboard/settings/company/company-edit-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyCompanyProfile, type CompanyProfile } from "@/lib/models";
import { fetchCompanyProfile } from "@/lib/services/firebase-service";

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

export default function CompanyDetailsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadCompany = useCallback(() => {
    return fetchCompanyProfile()
      .then(setCompany)
      .catch(() => setCompany(emptyCompanyProfile));
  }, []);

  useEffect(() => {
    loadCompany().finally(() => setLoading(false));
  }, [loadCompany]);

  if (loading || !company) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Company details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Company name" value={company.name} />
            <DetailField
              label="Company phone"
              value={company.phone}
              href={company.phone ? `tel:${company.phone}` : undefined}
            />
            <DetailField
              label="Company email"
              value={company.email}
              href={company.email ? `mailto:${company.email}` : undefined}
            />
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
            <DetailField label="Street" value={company.street} />
            <DetailField label="City" value={company.city} />
            <DetailField label="State" value={company.state} />
            <DetailField label="Postcode" value={company.postcode} />
            <DetailField label="Country" value={company.country} />
          </CardContent>
        </Card>
      </div>

      <CompanyEditSheet
        company={company}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={setCompany}
      />
    </>
  );
}

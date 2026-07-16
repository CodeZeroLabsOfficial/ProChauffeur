"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { LocationEditSheet } from "@/app/dashboard/company/locations/location-edit-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  canCreateLocation,
  capLabel,
  isMultiLocationEnabled,
  unlimitedLimits,
  type AppGlobalLimits,
  type Branch
} from "@/lib/models";
import { fetchGlobalLimits } from "@/lib/services/firebase-service";

export default function CompanyLocationsPage() {
  const { branches, branchesLoading } = useActiveBranch();
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .catch(() => setLimits(unlimitedLimits));
  }, []);

  const resolved = limits ?? unlimitedLimits;
  const canAdd = canCreateLocation(branches.length, resolved.maxLocations);
  const multiOn = isMultiLocationEnabled(resolved.maxLocations);

  const sorted = useMemo(
    () => [...branches].sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setOpen(true);
  }

  if (branchesLoading || !limits) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>
          City markets for dispatch and bookings. License allows{" "}
          {capLabel(resolved.maxLocations)} location
          {resolved.maxLocations === 1 ? "" : "s"} ({branches.length} in use).
          {!multiOn ? " Raise maxLocations above 1 to add another city." : null}
        </CardDescription>
        <CardAction>
          <Button onClick={openNew} disabled={!canAdd}>
            <PlusIcon data-icon="inline-start" />
            Add location
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canAdd ? (
          <p className="text-muted-foreground text-sm">
            Location limit reached. Update the cap under{" "}
            <Link href="/dashboard/settings/license" className="underline">
              License
            </Link>{" "}
            to add another city.
          </p>
        ) : null}

        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">No locations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Postcodes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((branch) => {
                const pc =
                  branch.serviceArea?.type === "postcodes"
                    ? (branch.serviceArea.postcodes ?? []).length
                    : 0;
                return (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[14rem] truncate text-sm">
                      {branch.officeAddressLine?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {pc > 0 ? `${pc} listed` : "—"}
                    </TableCell>
                    <TableCell>
                      {branch.isActive ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(branch)}>
                        <PencilIcon />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <LocationEditSheet
        open={open}
        onOpenChange={setOpen}
        branch={editing}
        canCreate={canAdd}
        onSaved={(b) => setEditing(b)}
      />
    </Card>
  );
}

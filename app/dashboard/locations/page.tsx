"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { LocationCreateSheet } from "@/app/dashboard/locations/location-create-sheet";
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
import { fetchGlobalLimits, listenBranches } from "@/lib/services/firebase-service";

export default function LocationsPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .catch(() => setLimits(unlimitedLimits));
  }, []);

  useEffect(() => {
    return listenBranches((rows) => {
      setBranches(rows.sort((a, b) => a.name.localeCompare(b.name)));
      setBranchesLoading(false);
    });
  }, []);

  const resolved = limits ?? unlimitedLimits;
  const canAdd = canCreateLocation(branches.length, resolved.maxLocations);
  const multiOn = isMultiLocationEnabled(resolved.maxLocations);

  const sorted = useMemo(
    () => [...branches].sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );

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
          <Button onClick={() => setCreateOpen(true)} disabled={!canAdd}>
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((branch) => {
                const pc =
                  branch.serviceArea?.type === "postcodes"
                    ? (branch.serviceArea.postcodes ?? []).length
                    : 0;
                return (
                  <TableRow
                    key={branch.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/locations/${branch.id}`)}>
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
                      <ChevronRightIcon className="text-muted-foreground size-4" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <LocationCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        canCreate={canAdd}
        onCreated={() => {}}
      />
    </Card>
  );
}

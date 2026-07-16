"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  buildBranch,
  canCreateLocation,
  capLabel,
  isMultiLocationEnabled,
  unlimitedLimits,
  type AppGlobalLimits,
  type Branch
} from "@/lib/models";
import {
  createLocationWithScaffold,
  fetchGlobalLimits,
  upsertBranch
} from "@/lib/services/firebase-service";

function parsePostcodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

function postcodesToText(branch: Branch | null): string {
  const list = branch?.serviceArea?.type === "postcodes" ? branch.serviceArea.postcodes : null;
  return (list ?? []).join("\n");
}

function slugifyLocationId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export default function SettingsLocationsPage() {
  const { branches, branchesLoading } = useActiveBranch();
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .catch(() => setLimits(unlimitedLimits));
  }, []);

  useEffect(() => {
    if (!open) return;
    setIsActive(editing?.isActive !== false);
  }, [open, editing]);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const rawId = String(form.get("id") ?? "").trim();
    const timeZoneIdentifier = String(form.get("timeZoneIdentifier") ?? "").trim() || null;
    const postcodes = parsePostcodes(String(form.get("postcodes") ?? ""));

    if (!name) {
      toast.error("Enter a location name.");
      return;
    }

    const serviceArea =
      postcodes.length > 0
        ? { type: "postcodes" as const, postcodes }
        : null;

    setSaving(true);
    try {
      if (editing) {
        await upsertBranch({
          ...editing,
          name,
          isActive,
          timeZoneIdentifier,
          serviceArea,
          updatedAt: new Date()
        });
        toast.success("Location updated.");
      } else {
        const id = slugifyLocationId(rawId || name);
        if (!id) {
          toast.error("Enter a valid location id (letters and numbers).");
          return;
        }
        if (!canAdd) {
          toast.error(`Location limit reached (${capLabel(resolved.maxLocations)}).`);
          return;
        }
        await createLocationWithScaffold(
          buildBranch({
            id,
            name,
            isActive,
            timeZoneIdentifier,
            serviceArea
          })
        );
        toast.success("Location created.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
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
                <TableHead>Id</TableHead>
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
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {branch.id}
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <form onSubmit={onSubmit} className="flex h-full flex-col gap-4">
            <SheetHeader>
              <SheetTitle>{editing ? "Edit location" : "New location"}</SheetTitle>
              <SheetDescription>
                {editing
                  ? "Update name, service postcodes, and status."
                  : "Creates the location and copies pricing, hours, and vehicle classes from Brisbane."}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-1">
              {!editing ? (
                <div className="space-y-2">
                  <Label htmlFor="location-id">Id</Label>
                  <Input
                    id="location-id"
                    name="id"
                    placeholder="e.g. gold-coast"
                    className="font-mono"
                  />
                  <p className="text-muted-foreground text-xs">
                    Optional. Defaults from the name. Cannot be changed later.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  placeholder="e.g. Gold Coast"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-tz">Time zone</Label>
                <Input
                  id="location-tz"
                  name="timeZoneIdentifier"
                  defaultValue={editing?.timeZoneIdentifier ?? ""}
                  placeholder="e.g. Australia/Brisbane"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-postcodes">Service postcodes</Label>
                <Textarea
                  id="location-postcodes"
                  name="postcodes"
                  rows={6}
                  defaultValue={postcodesToText(editing)}
                  placeholder={"One per line or comma-separated\n4000\n4001"}
                />
                <p className="text-muted-foreground text-xs">
                  Used to route customer bookings when multi-location is enabled. Avoid overlapping
                  lists across locations.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="location-active">Active</Label>
                  <p className="text-muted-foreground text-xs">
                    Inactive locations are hidden from the switcher and resolve.
                  </p>
                </div>
                <Switch id="location-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || (!editing && !canAdd)}>
                {saving ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

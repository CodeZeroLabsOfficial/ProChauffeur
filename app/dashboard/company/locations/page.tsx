"use client";

import { useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useFleetLocations } from "@/hooks/use-collections";
import {
  createFleetLocation,
  deleteFleetLocation,
  updateFleetLocation
} from "@/lib/services/firebase-service";
import { hasValidFleetLocationCoordinate, type FleetLocation } from "@/lib/models";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function addressFromLocation(location: FleetLocation): AddressSuggestion | null {
  if (!hasValidFleetLocationCoordinate(location)) return null;
  return {
    id: location.id,
    addressLine: location.addressLine,
    coordinate: { latitude: location.latitude, longitude: location.longitude }
  };
}

export default function LocationsPage() {
  const { locations, loading } = useFleetLocations();
  const [editing, setEditing] = useState<FleetLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setAddress(addressFromLocation(editing));
      setIsDefault(editing.isDefault ?? false);
    } else {
      setAddress(null);
      setIsDefault(false);
    }
  }, [open, editing]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(loc: FleetLocation) {
    setEditing(loc);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();

    const resolvedAddress =
      address ??
      (editing && editing.addressLine && hasValidFleetLocationCoordinate(editing)
        ? addressFromLocation(editing)
        : null);

    if (!name) {
      toast.error("Enter a location name.");
      return;
    }
    if (!resolvedAddress) {
      toast.error("Select an address from the suggestions.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        addressLine: resolvedAddress.addressLine,
        latitude: resolvedAddress.coordinate.latitude,
        longitude: resolvedAddress.coordinate.longitude,
        isDefault
      };

      if (editing) {
        await updateFleetLocation({ ...editing, ...payload });
        toast.success("Location updated.");
      } else {
        await createFleetLocation(payload);
        toast.success("Location added.");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(loc: FleetLocation) {
    try {
      await deleteFleetLocation(loc.id);
      toast.success("Location removed.");
    } catch {
      toast.error("Could not remove the location.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Locations</CardTitle>
          <Button variant="outline" size="sm" onClick={openNew}>
            <PlusIcon /> Add location
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                    Loading locations…
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                    No locations yet.
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {loc.name}
                        {loc.isDefault ? (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{loc.addressLine}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove(loc)}>
                          <Trash2Icon className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                          <PencilIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit location" : "Add location"}</SheetTitle>
            <SheetDescription>Garages, depots and key service points.</SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={editing?.name} key={editing?.id ?? "new-name"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine">Address</Label>
              <AddressAutocomplete
                id="addressLine"
                value={address}
                onChange={setAddress}
                required
                placeholder="Search for an address…"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Default garage / depot</Label>
                <p className="text-muted-foreground text-xs">
                  Used for dispatch map centering and pricing deadhead calculations.
                </p>
              </div>
              <Switch id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save location"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

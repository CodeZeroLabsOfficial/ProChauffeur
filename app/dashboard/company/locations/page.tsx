"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useFleetLocations } from "@/hooks/use-collections";
import {
  createFleetLocation,
  deleteFleetLocation,
  updateFleetLocation
} from "@/lib/services/firebase-service";
import type { FleetLocation } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function LocationsPage() {
  const { locations, loading } = useFleetLocations();
  const [editing, setEditing] = useState<FleetLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const num = (k: string) => parseFloat(get(k)) || 0;
    setSaving(true);
    try {
      if (editing) {
        await updateFleetLocation({
          ...editing,
          name: get("name"),
          addressLine: get("addressLine"),
          latitude: num("latitude"),
          longitude: num("longitude")
        });
        toast.success("Location updated.");
      } else {
        await createFleetLocation({
          name: get("name"),
          addressLine: get("addressLine"),
          latitude: num("latitude"),
          longitude: num("longitude")
        });
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
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <PlusIcon /> Add location
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                    Loading locations…
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                    No locations yet.
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((loc) => (
                  <TableRow key={loc.id} className="cursor-pointer" onClick={() => openEdit(loc)}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{loc.addressLine}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(loc);
                        }}>
                        <Trash2Icon className="size-4" />
                      </Button>
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
          <form onSubmit={onSubmit} className="space-y-4 px-4" key={editing?.id ?? "new"}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={editing?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine">Address</Label>
              <Input id="addressLine" name="addressLine" required defaultValue={editing?.addressLine} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" name="latitude" inputMode="decimal" defaultValue={editing?.latitude} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" name="longitude" inputMode="decimal" defaultValue={editing?.longitude} />
              </div>
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

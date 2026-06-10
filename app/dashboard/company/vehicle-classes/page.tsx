"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { VehicleClassEditSheet } from "@/app/dashboard/company/vehicle-classes/vehicle-class-edit-sheet";
import { deleteVehicleClass, fetchVehicleClasses } from "@/lib/services/firebase-service";
import type { VehicleClass } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function VehicleClassesPage() {
  const [classes, setClasses] = useState<VehicleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editClass, setEditClass] = useState<VehicleClass | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function reload() {
    setClasses(await fetchVehicleClasses());
  }

  useEffect(() => {
    reload()
      .catch(() => toast.error("Could not load vehicle classes."))
      .finally(() => setLoading(false));
  }, []);

  async function removeClass(vehicleClass: VehicleClass) {
    try {
      await deleteVehicleClass(vehicleClass.id);
      toast.success(`${vehicleClass.displayName} deleted.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete vehicle class.");
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading vehicle classes…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Service classes define rate cards. Fleet vehicles and bookings reference a class for
          pricing.
        </p>
        <Button
          onClick={() => {
            setEditClass(null);
            setEditOpen(true);
          }}>
          Add class
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicle classes yet. Add a class to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((vehicleClass) => (
                  <TableRow key={vehicleClass.id}>
                    <TableCell className="font-medium">{vehicleClass.displayName}</TableCell>
                    <TableCell>{vehicleClass.slug}</TableCell>
                    <TableCell>
                      {vehicleClass.passengerCapacity} pax · {vehicleClass.smallLuggageCount} small ·{" "}
                      {vehicleClass.largeLuggageCount} large
                    </TableCell>
                    <TableCell>
                      {vehicleClass.isEnabled ? "Enabled" : "Disabled"}
                      {vehicleClass.isVisible ? " · Visible" : " · Hidden"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditClass(vehicleClass);
                            setEditOpen(true);
                          }}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeClass(vehicleClass)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VehicleClassEditSheet
        vehicleClass={editClass}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => {
          reload().catch(() => toast.error("Could not refresh vehicle classes."));
        }}
      />
    </div>
  );
}

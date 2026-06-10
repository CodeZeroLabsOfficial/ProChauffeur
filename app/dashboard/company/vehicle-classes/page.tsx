"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { VehicleClassEditSheet } from "@/app/dashboard/company/vehicle-classes/vehicle-class-edit-sheet";
import {
  deleteVehicleClass,
  fetchPricingRaw,
  fetchVehicleClasses,
  migrateVehicleClassesFromLegacyPricing
} from "@/lib/services/firebase-service";
import { isLegacyPricingDocument } from "@/lib/migration/vehicle-class-migration";
import type { VehicleClass } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [editClass, setEditClass] = useState<VehicleClass | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function reload() {
    const [vehicleClasses, pricingRaw] = await Promise.all([
      fetchVehicleClasses(),
      fetchPricingRaw()
    ]);
    setClasses(vehicleClasses);
    setNeedsMigration(Boolean(pricingRaw && isLegacyPricingDocument(pricingRaw)));
  }

  useEffect(() => {
    reload()
      .catch(() => toast.error("Could not load vehicle classes."))
      .finally(() => setLoading(false));
  }, []);

  async function runMigration() {
    setMigrating(true);
    try {
      const result = await migrateVehicleClassesFromLegacyPricing();
      toast.success(
        `Migration complete: ${result.createdClassCount} classes, ${result.updatedVehicleCount} vehicles, ${result.updatedTripCount} trips.`
      );
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Migration failed.");
    } finally {
      setMigrating(false);
    }
  }

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
      {needsMigration ? (
        <Card>
          <CardHeader>
            <CardTitle>Migration required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pricing still uses the legacy vehicle tier schema. Migrate tiers into vehicle classes
              and upgrade pricing to schema v2.
            </p>
            <Button onClick={runMigration} disabled={migrating}>
              {migrating ? "Migrating…" : "Migrate from pricing tiers"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
            <p className="text-sm text-muted-foreground">
              No vehicle classes yet. Run migration or add a class.
            </p>
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

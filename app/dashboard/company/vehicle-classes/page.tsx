"use client";

import { useState } from "react";
import Image from "next/image";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { VehicleClassEditSheet } from "@/app/dashboard/company/vehicle-classes/vehicle-class-edit-sheet";
import { useVehicleClasses } from "@/hooks/use-collections";
import { deleteVehicleClass } from "@/lib/services/firebase-service";
import { tripTypeTitle, type VehicleClass } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

function formatTripTypes(vehicleClass: VehicleClass): string {
  if (vehicleClass.supportedTripTypes.length === 0) return "Not set";
  return vehicleClass.supportedTripTypes.map((type) => tripTypeTitle[type]).join(", ");
}

export default function VehicleClassesPage() {
  const { vehicleClasses, loading } = useVehicleClasses();
  const [editing, setEditing] = useState<VehicleClass | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(vehicleClass: VehicleClass) {
    setEditing(vehicleClass);
    setOpen(true);
  }

  async function remove(vehicleClass: VehicleClass) {
    try {
      await deleteVehicleClass(vehicleClass.id);
      toast.success("Vehicle class removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove vehicle class.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vehicle classes</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={openNew}>
            <PlusIcon /> Add vehicle class
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Trip types</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    Loading vehicle classes…
                  </TableCell>
                </TableRow>
              ) : vehicleClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    No vehicle classes yet.
                  </TableCell>
                </TableRow>
              ) : (
                vehicleClasses.map((vehicleClass) => (
                  <TableRow
                    key={vehicleClass.id}
                    className={cn(!vehicleClass.isEnabled && "text-muted-foreground")}>
                    <TableCell>
                      {vehicleClass.imageUrl ? (
                        <Image
                          src={vehicleClass.imageUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="size-10 rounded-sm object-cover"
                        />
                      ) : (
                        <div className="bg-muted size-10 rounded-sm" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {vehicleClass.displayName}
                        {!vehicleClass.isEnabled ? (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        ) : null}
                        {!vehicleClass.isVisible ? (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {vehicleClass.passengerCapacity} pax · {vehicleClass.smallLuggageCount} small ·{" "}
                      {vehicleClass.largeLuggageCount} large
                    </TableCell>
                    <TableCell>{formatTripTypes(vehicleClass)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove(vehicleClass)}>
                          <Trash2Icon className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(vehicleClass)}>
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

      <VehicleClassEditSheet
        vehicleClass={editing}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => {}}
      />
    </div>
  );
}

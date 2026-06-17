"use client";

import { useState } from "react";
import Image from "next/image";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { VehicleClassEditSheet } from "@/app/dashboard/company/vehicle-classes/vehicle-class-edit-sheet";
import { useVehicleClasses } from "@/hooks/use-collections";
import { deleteVehicleClass } from "@/lib/services/firebase-service";
import {
  buildInitialVehicleClass,
  slugFromDisplayName,
  tripTypeTitle,
  type VehicleClass
} from "@/lib/models";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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

type SheetMode = "create" | "edit" | "clone";

export default function VehicleClassesPage() {
  const { vehicleClasses, loading } = useVehicleClasses();
  const [editing, setEditing] = useState<VehicleClass | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create");
  const [open, setOpen] = useState(false);

  function openNew() {
    setSheetMode("create");
    setEditing(null);
    setOpen(true);
  }

  function openEdit(vehicleClass: VehicleClass) {
    setSheetMode("edit");
    setEditing(vehicleClass);
    setOpen(true);
  }

  function openClone(source: VehicleClass) {
    const displayName = `${source.displayName} (copy)`;
    setSheetMode("clone");
    setEditing(
      buildInitialVehicleClass({
        ...source,
        id: crypto.randomUUID(),
        displayName,
        slug: slugFromDisplayName(displayName),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );
    setOpen(true);
  }

  async function remove(vehicleClass: VehicleClass) {
    if (!window.confirm(`Delete "${vehicleClass.displayName}"? This cannot be undone.`)) {
      return;
    }
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
                <TableHead className="w-14" />
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
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(vehicleClass)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openClone(vehicleClass)}>
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => remove(vehicleClass)}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
        sheetMode={sheetMode}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => {}}
      />
    </div>
  );
}

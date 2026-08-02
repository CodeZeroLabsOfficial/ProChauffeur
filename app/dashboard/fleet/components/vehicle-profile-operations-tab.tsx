"use client";

import { useCallback, useMemo } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { AssignedDriverCard } from "@/app/dashboard/fleet/components/assigned-driver-card";
import type { RosterChauffeur } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { effectiveChauffeurUserId, type User, type Vehicle } from "@/lib/models";
import { assignFleetVehicle, unassignFleetVehicle } from "@/lib/services/firebase-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

function chauffeurLabel(chauffeur: RosterChauffeur): string {
  return chauffeur.user.profile.displayName.trim() || chauffeur.user.email || "Driver";
}

export function VehicleProfileOperationsTab({
  vehicle,
  vehicles,
  chauffeurs,
  assignedChauffeur,
  assignedChauffeurCategoryLabel
}: {
  vehicle: Vehicle;
  vehicles: Vehicle[];
  chauffeurs: RosterChauffeur[];
  assignedChauffeur: User | undefined;
  assignedChauffeurCategoryLabel: string | null;
}) {
  const availableChauffeurs = useMemo(() => {
    const assignedIds = new Set(
      vehicles.map((v) => effectiveChauffeurUserId(v)).filter((id): id is string => Boolean(id))
    );
    return chauffeurs.filter((c) => !assignedIds.has(c.user.id));
  }, [chauffeurs, vehicles]);

  const handleAssign = useCallback(
    async (chauffeurUserId: string) => {
      try {
        await assignFleetVehicle(vehicles, vehicle.driverID, chauffeurUserId);
        toast.success("Driver assigned.");
      } catch {
        toast.error("Could not assign the driver.");
      }
    },
    [vehicle.driverID, vehicles]
  );

  const handleUnassign = useCallback(async () => {
    try {
      await unassignFleetVehicle(vehicle.driverID);
      toast.success("Driver unassigned.");
    } catch {
      toast.error("Could not unassign the driver.");
    }
  }, [vehicle.driverID]);

  const assignmentAction = assignedChauffeur ? (
    <Button size="sm" variant="outline" onClick={() => void handleUnassign()}>
      <MinusIcon /> Unassign
    </Button>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon /> Assign
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableChauffeurs.length ? (
          availableChauffeurs.map((c) => (
            <DropdownMenuItem key={c.user.id} onClick={() => void handleAssign(c.user.id)}>
              {chauffeurLabel(c)}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No chauffeurs available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AssignedDriverCard
        title="Assignment"
        assignedChauffeur={assignedChauffeur}
        categoryLabel={assignedChauffeurCategoryLabel}
        headerAction={assignmentAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Maintenance &amp; operations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Maintenance schedules and operational details coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

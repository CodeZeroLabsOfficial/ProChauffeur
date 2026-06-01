"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";

import { useUsers, useVehicles } from "@/hooks/use-collections";
import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
  vehicleTypeTitle,
  type Vehicle
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { VehicleEditSheet } from "@/app/dashboard/fleet/vehicle-edit-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export default function FleetPage() {
  const { vehicles, loading } = useVehicles();
  const { users } = useUsers();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);

  const drivers = useMemo(() => users.filter((u) => u.role === "driver"), [users]);

  const driverNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) map.set(u.id, u.profile.displayName || u.email);
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [vehicleDisplayName(v), v.licensePlate].some((s) => s.toLowerCase().includes(q))
    );
  }, [vehicles, search]);

  function openVehicle(v: Vehicle | null) {
    setSelected(v);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fleet"
        description="Manage vehicles and their chauffeur assignments."
        actions={
          <Button onClick={() => openVehicle(null)}>
            <PlusIcon /> Add vehicle
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search vehicles or plates…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Assigned chauffeur</TableHead>
                <TableHead>Rego expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    Loading fleet…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No vehicles yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => {
                  const chauffeur = effectiveChauffeurUserId(v);
                  return (
                    <TableRow
                      key={v.driverID}
                      className="cursor-pointer"
                      onClick={() => openVehicle(v)}>
                      <TableCell className="font-medium">{vehicleDisplayName(v) || "Vehicle"}</TableCell>
                      <TableCell className="text-muted-foreground">{v.licensePlate || "—"}</TableCell>
                      <TableCell>
                        {v.pricingVehicleType ? (
                          <Badge variant="outline">{vehicleTypeTitle[v.pricingVehicleType]}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.passengerCapacity}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {chauffeur ? (driverNameById.get(chauffeur) ?? "Unknown") : "Unassigned"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(v.registrationExpiry ?? null)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VehicleEditSheet vehicle={selected} drivers={drivers} open={open} onOpenChange={setOpen} />
    </div>
  );
}

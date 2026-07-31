"use client";

import { Briefcase, Luggage, Users } from "lucide-react";

import type { Vehicle } from "@/lib/models";
import { ContactRow } from "@/components/contact-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VehicleCapacityCard({ vehicle }: { vehicle: Vehicle }) {
  const passengers = vehicle.capacity?.passengerCount;
  const smallLuggage = vehicle.capacity?.luggage.smallCount;
  const largeLuggage = vehicle.capacity?.luggage.largeCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <ContactRow icon={Users}>
            <span className={passengers != null ? undefined : "text-muted-foreground"}>
              {passengers != null ? String(passengers) : "—"}
            </span>
          </ContactRow>
          <ContactRow icon={Briefcase}>
            <span className={smallLuggage != null ? undefined : "text-muted-foreground"}>
              {smallLuggage != null ? String(smallLuggage) : "—"}
            </span>
          </ContactRow>
          <ContactRow icon={Luggage}>
            <span className={largeLuggage != null ? undefined : "text-muted-foreground"}>
              {largeLuggage != null ? String(largeLuggage) : "—"}
            </span>
          </ContactRow>
        </div>
      </CardContent>
    </Card>
  );
}

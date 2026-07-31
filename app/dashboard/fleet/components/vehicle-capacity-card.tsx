"use client";

import { Briefcase, Luggage, Users } from "lucide-react";

import type { Vehicle } from "@/lib/models";
import { ContactRow } from "@/components/contact-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LabeledValue({
  label,
  value
}: {
  label: string;
  value: number | null | undefined;
}) {
  const hasValue = value != null;
  return (
    <span className={hasValue ? undefined : "text-muted-foreground"}>
      {label}: {hasValue ? String(value) : "—"}
    </span>
  );
}

export function VehicleCapacityCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <ContactRow icon={Users}>
            <LabeledValue label="Passengers" value={vehicle.capacity?.passengerCount} />
          </ContactRow>
          <ContactRow icon={Briefcase}>
            <LabeledValue label="Small Luggage" value={vehicle.capacity?.luggage.smallCount} />
          </ContactRow>
          <ContactRow icon={Luggage}>
            <LabeledValue label="Large Luggage" value={vehicle.capacity?.luggage.largeCount} />
          </ContactRow>
        </div>
      </CardContent>
    </Card>
  );
}

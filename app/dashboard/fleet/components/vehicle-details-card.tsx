"use client";

import { Calendar, Car, CarFront, Cog, Fuel, Palette } from "lucide-react";

import type { Vehicle } from "@/lib/models";
import { ContactRow } from "@/components/contact-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LabeledValue({ label, value }: { label: string; value: string | null | undefined }) {
  const trimmed = value?.trim();
  return (
    <span className={trimmed ? undefined : "text-muted-foreground"}>
      {label}: {trimmed || "—"}
    </span>
  );
}

export function VehicleDetailsCard({ vehicle }: { vehicle: Vehicle }) {
  const year =
    vehicle.details?.manufactureYear != null ? String(vehicle.details.manufactureYear) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <ContactRow icon={Calendar}>
            <LabeledValue label="Year" value={year} />
          </ContactRow>
          <ContactRow icon={Car}>
            <LabeledValue label="Make" value={vehicle.details?.make} />
          </ContactRow>
          <ContactRow icon={CarFront}>
            <LabeledValue label="Model" value={vehicle.details?.model} />
          </ContactRow>
          <ContactRow icon={Palette}>
            <LabeledValue label="Colour" value={vehicle.details?.color} />
          </ContactRow>
          <ContactRow icon={Fuel}>
            <LabeledValue label="Engine" value={vehicle.specifications?.engineType} />
          </ContactRow>
          <ContactRow icon={Cog}>
            <LabeledValue label="Transmission" value={vehicle.specifications?.transmission} />
          </ContactRow>
        </div>
      </CardContent>
    </Card>
  );
}

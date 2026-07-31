"use client";

import Link from "next/link";
import { Calendar, Cog, Fuel, RectangleHorizontal, UserRound } from "lucide-react";

import type { User, Vehicle } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { ContactRow } from "@/components/contact-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VehicleDetailsCard({
  vehicle,
  assignedChauffeur
}: {
  vehicle: Vehicle;
  assignedChauffeur: User | undefined;
}) {
  const gear = vehicle.specifications?.transmission?.trim();
  const engine = vehicle.specifications?.engineType?.trim();
  const plate = vehicle.registration?.registrationNumber?.trim();
  const expiry = vehicle.registration?.registrationExpiry;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-y-4">
          <ContactRow icon={UserRound}>
            {assignedChauffeur ? (
              <Link
                href={`/dashboard/drivers/${assignedChauffeur.id}`}
                className="hover:text-primary hover:underline">
                {assignedChauffeur.profile.displayName.trim() ||
                  assignedChauffeur.email ||
                  "Chauffeur"}
              </Link>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </ContactRow>
          <ContactRow icon={Cog}>
            <span className={gear ? undefined : "text-muted-foreground"}>{gear || "—"}</span>
          </ContactRow>
          <ContactRow icon={Fuel}>
            <span className={engine ? undefined : "text-muted-foreground"}>{engine || "—"}</span>
          </ContactRow>
          <ContactRow icon={RectangleHorizontal}>
            <span className={plate ? undefined : "text-muted-foreground"}>{plate || "—"}</span>
          </ContactRow>
          <ContactRow icon={Calendar}>
            <span className={expiry ? undefined : "text-muted-foreground"}>
              {expiry ? formatDate(expiry) : "—"}
            </span>
          </ContactRow>
        </div>
      </CardContent>
    </Card>
  );
}

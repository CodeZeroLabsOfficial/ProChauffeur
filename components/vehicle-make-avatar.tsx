"use client";

import { CarFrontIcon } from "lucide-react";

import { vehicleMakeLabel, vehicleMakeLogoUrl } from "@/lib/vehicle-makes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function VehicleMakeAvatar({
  make,
  className
}: {
  make: string | null | undefined;
  className?: string;
}) {
  const logoUrl = vehicleMakeLogoUrl(make);
  const label = vehicleMakeLabel(make);

  return (
    <Avatar className={cn("h-20 w-20", className)}>
      {logoUrl ? <AvatarImage src={logoUrl} alt={`${label} logo`} /> : null}
      <AvatarFallback className="bg-[#1c1c1c]">
        <CarFrontIcon className="size-8 text-white opacity-45" />
      </AvatarFallback>
    </Avatar>
  );
}

"use client";

import { Marker } from "react-map-gl/mapbox";

import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import type { LiveLocation } from "@/hooks/use-live-locations";
import { useAnimatedLiveLocation } from "@/hooks/use-animated-live-location";

export function AnimatedDriverMarker({
  location,
  title,
  vehicleMake
}: {
  location: LiveLocation;
  title?: string;
  vehicleMake?: string | null;
}) {
  const animated = useAnimatedLiveLocation(location);
  if (!animated) return null;

  return (
    <Marker longitude={animated.lng} latitude={animated.lat} anchor="center">
      <div title={title}>
        <VehicleMakeAvatar
          make={vehicleMake}
          className="size-8 border-2 border-white shadow-lg"
        />
      </div>
    </Marker>
  );
}

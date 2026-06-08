"use client";

import { Marker } from "react-map-gl/mapbox";
import { CarFrontIcon } from "lucide-react";

import type { LiveLocation } from "@/hooks/use-live-locations";
import { useAnimatedLiveLocation } from "@/hooks/use-animated-live-location";

export function AnimatedDriverMarker({
  location,
  title
}: {
  location: LiveLocation;
  title?: string;
}) {
  const animated = useAnimatedLiveLocation(location);
  if (!animated) return null;

  return (
    <Marker longitude={animated.lng} latitude={animated.lat} anchor="center">
      <div
        className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg"
        title={title}
        style={
          animated.heading != null
            ? { transform: `rotate(${animated.heading}deg)` }
            : undefined
        }>
        <CarFrontIcon className="size-4" />
      </div>
    </Marker>
  );
}

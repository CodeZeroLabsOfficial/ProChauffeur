"use client";

import { useEffect, useRef } from "react";
import { Marker } from "react-map-gl/mapbox";
import type { Marker as MapboxMarker } from "mapbox-gl";

import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { createDriverMotion } from "@/lib/mapbox/driver-motion";

export function AnimatedDriverMarker({
  location,
  title,
  vehicleMake
}: {
  location: DriverLiveLocation;
  title?: string;
  vehicleMake?: string | null;
}) {
  const markerRef = useRef<MapboxMarker | null>(null);
  const motionRef = useRef(createDriverMotion());
  const initialRef = useRef({ longitude: location.lng, latitude: location.lat });

  useEffect(() => {
    const motion = motionRef.current;
    motion.pushFix(
      {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        updatedAt: location.updatedAt,
        driverId: location.driverId
      },
      performance.now()
    );
    const pose = motion.getPose();
    if (pose) markerRef.current?.setLngLat([pose.lng, pose.lat]);
  }, [
    location.lat,
    location.lng,
    location.heading,
    location.updatedAt,
    location.driverId
  ]);

  useEffect(() => {
    const motion = motionRef.current;
    let raf = 0;

    const loop = (now: number) => {
      const pose = motion.tick(now);
      if (pose) markerRef.current?.setLngLat([pose.lng, pose.lat]);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Marker
      ref={markerRef}
      longitude={initialRef.current.longitude}
      latitude={initialRef.current.latitude}
      anchor="center">
      <div title={title}>
        <VehicleMakeAvatar
          make={vehicleMake}
          className="size-8 border-2 border-white shadow-lg"
        />
      </div>
    </Marker>
  );
}

"use client";

import type { ReactNode } from "react";
import { Marker } from "react-map-gl/mapbox";

export function DispatchStopMarker({
  longitude,
  latitude,
  onClick,
  children
}: {
  longitude: number;
  latitude: number;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      {children}
    </Marker>
  );
}

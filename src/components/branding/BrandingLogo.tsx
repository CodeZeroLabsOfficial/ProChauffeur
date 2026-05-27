"use client";

import {
  isBrandingDataUrl,
  useFleetBranding,
} from "@/context/FleetBrandingContext";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";
import Image, { type ImageProps } from "next/image";

type BrandingAsset = keyof AppFleetBrandingSettings;

type BrandingLogoProps = Omit<ImageProps, "src" | "alt"> & {
  asset: BrandingAsset;
  alt?: string;
};

export default function BrandingLogo({
  asset,
  alt = "Logo",
  unoptimized,
  ...props
}: BrandingLogoProps) {
  const { branding } = useFleetBranding();
  const src = branding[asset];

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? isBrandingDataUrl(src)}
      {...props}
    />
  );
}

import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";

export type BrandingAssetKey = keyof AppFleetBrandingSettings;

export type BrandingAssetPreview = "compact" | "wide";

export type BrandingAssetDefinition = {
  key: BrandingAssetKey;
  label: string;
  usage: string;
  preview: BrandingAssetPreview;
};

export type BrandingSectionDefinition = {
  id: string;
  title: string;
  assets: BrandingAssetDefinition[];
};

export const BRANDING_ASSET_KEYS: BrandingAssetKey[] = [
  "favicon",
  "logo",
  "logoDark",
  "logoIcon",
  "authLogo",
];

export const DEFAULT_BRANDING_ASSETS: AppFleetBrandingSettings = {
  favicon: "/branding/logo-icon.svg",
  logo: "/branding/logo.svg",
  logoDark: "/branding/logo-dark.svg",
  logoIcon: "/branding/logo-icon.svg",
  authLogo: "/branding/auth-logo.svg",
};

export const BRANDING_SECTIONS: BrandingSectionDefinition[] = [
  {
    id: "favicon",
    title: "Favicon",
    assets: [
      {
        key: "favicon",
        label: "Favicon",
        usage: "Browser tab and bookmarks",
        preview: "compact",
      },
    ],
  },
  {
    id: "logos",
    title: "Logos",
    assets: [
      {
        key: "logo",
        label: "Primary logo (light)",
        usage: "Sidebar and header in light mode",
        preview: "wide",
      },
      {
        key: "logoDark",
        label: "Primary logo (dark)",
        usage: "Sidebar and header in dark mode",
        preview: "wide",
      },
      {
        key: "logoIcon",
        label: "Compact icon",
        usage: "Collapsed sidebar",
        preview: "compact",
      },
      {
        key: "authLogo",
        label: "Sign-in logo",
        usage: "Authentication pages",
        preview: "wide",
      },
    ],
  },
];

function normalizeLegacyBrandingPath(value: string): string {
  return value.replace(/^\/images\/logo\//, "/branding/");
}

export function mergeFleetBrandingSettings(
  stored: Partial<AppFleetBrandingSettings> | null | undefined
): AppFleetBrandingSettings {
  const merged = { ...DEFAULT_BRANDING_ASSETS };
  if (!stored) return merged;

  for (const key of BRANDING_ASSET_KEYS) {
    const value = stored[key]?.trim();
    if (value) merged[key] = normalizeLegacyBrandingPath(value);
  }

  return merged;
}

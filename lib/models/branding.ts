import type { BrandingFontId } from "@/lib/fonts-config";

/** `app_settings/branding` document (Appearance settings). */
export type Appearance = {
  portalName?: string;
  supportEmail?: string;
  primaryColorHex?: string;
  fontFamily?: BrandingFontId;
  logoUrl?: string;
  faviconUrl?: string;
};

/** @deprecated Use `Appearance` */
export type Branding = Appearance;

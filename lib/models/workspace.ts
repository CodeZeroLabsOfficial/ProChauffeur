import type { BrandingFontId } from "@/lib/fonts-config";

/** `app_settings/workspace` document (Appearance settings). */
export type Appearance = {
  workspaceName?: string;
  supportEmail?: string;
  primaryColorHex?: string;
  fontFamily?: BrandingFontId;
  logoUrl?: string;
  faviconUrl?: string;
};

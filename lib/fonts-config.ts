export const BRANDING_FONTS = [
  { value: "outfit", label: "Outfit" },
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "roboto", label: "Roboto" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "pt-sans", label: "PT Sans" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
  { value: "overpass-mono", label: "Overpass Mono" }
] as const;

export type BrandingFontId = (typeof BRANDING_FONTS)[number]["value"];

export const DEFAULT_BRANDING_FONT: BrandingFontId = "outfit";

export function isBrandingFontId(value: string | undefined): value is BrandingFontId {
  return BRANDING_FONTS.some((font) => font.value === value);
}

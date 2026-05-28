import { BRANDING_ASSET_KEYS } from "@/lib/prochauffeur/brandingAssets";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";

/** Max source file size when picking an image in the browser. */
export const MAX_BRANDING_FILE_BYTES = 512 * 1024;

/** Base64 data URLs are larger than the source file. */
const MAX_BRANDING_DATA_URL_BYTES = 700 * 1024;

export function validateBrandingForSave(branding: AppFleetBrandingSettings): void {
  for (const key of BRANDING_ASSET_KEYS) {
    const value = branding[key].trim();
    if (!value.startsWith("data:")) continue;

    if (value.length > MAX_BRANDING_DATA_URL_BYTES) {
      throw new Error(
        `The ${key} image is too large to upload. Use a file under ${Math.round(MAX_BRANDING_FILE_BYTES / 1024)} KB, or a smaller resolution.`
      );
    }
  }
}

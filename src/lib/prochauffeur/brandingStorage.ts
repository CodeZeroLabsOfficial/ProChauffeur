import {
  ensureFirebaseInitialized,
  getFirebaseAuth,
  getFirebaseConfig,
  getFirebaseStorage,
} from "@/lib/firebase/client";
import {
  BRANDING_ASSET_KEYS,
  isLegacyStaticBrandingPath,
} from "@/lib/prochauffeur/brandingAssets";
import { validateBrandingForSave } from "@/lib/prochauffeur/brandingValidation";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";
import { EMPTY_FLEET_BRANDING } from "@/lib/prochauffeur/types";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";

const UPLOAD_TIMEOUT_MS = 90_000;

function isStoragePermissionError(error: unknown): boolean {
  if (typeof error !== "object" || error == null || !("code" in error)) {
    return false;
  }
  const code = String(error.code);
  return code === "storage/unauthorized" || code === "storage/unauthenticated";
}

function extensionFromDataUrl(dataUrl: string): string {
  const mime = dataUrl.match(/^data:([^;]+);/)?.[1] ?? "image/png";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data. Try uploading the file again.");
  }

  const contentType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, contentType };
}

async function withTimeout<T>(
  promise: Promise<T>,
  message: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), UPLOAD_TIMEOUT_MS);
    }),
  ]);
}

async function uploadBrandingDataUrl(
  storage: FirebaseStorage,
  key: string,
  dataUrl: string
): Promise<string> {
  const extension = extensionFromDataUrl(dataUrl);
  const { bytes, contentType } = dataUrlToBytes(dataUrl);
  const storageRef = ref(storage, `branding/${key}.${extension}`);

  try {
    await withTimeout(
      uploadBytes(storageRef, bytes, { contentType }),
      `Upload timed out for ${key}. Check your network and Firebase Storage rules, then try again.`
    );
    return await getDownloadURL(storageRef);
  } catch (error) {
    if (isStoragePermissionError(error)) {
      throw new Error(
        `Storage permission denied for "${key}". Deploy Storage rules allowing admin writes to branding/* (see firebase/storage.rules) and confirm your user document has role "admin".`
      );
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Could not upload ${key} to Firebase Storage.`);
  }
}

export async function prepareBrandingAssetsForSave(
  branding: AppFleetBrandingSettings
): Promise<AppFleetBrandingSettings> {
  validateBrandingForSave(branding);

  await ensureFirebaseInitialized();

  const config = getFirebaseConfig();
  if (!config.storageBucket?.trim()) {
    throw new Error(
      "Firebase Storage bucket is not configured. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (bucket name only, without gs://)."
    );
  }

  const auth = getFirebaseAuth();
  await auth.authStateReady();

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to upload branding assets.");
  }

  await user.getIdToken(true);

  const storage = getFirebaseStorage();
  const prepared: AppFleetBrandingSettings = { ...EMPTY_FLEET_BRANDING };

  for (const key of BRANDING_ASSET_KEYS) {
    const value = branding[key].trim();
    if (!value || isLegacyStaticBrandingPath(value)) continue;

    if (value.startsWith("data:")) {
      prepared[key] = await uploadBrandingDataUrl(storage, key, value);
    } else {
      prepared[key] = value;
    }
  }

  return prepared;
}

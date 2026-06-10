import "server-only";

import { AppSettingsDocs, Collections, type Branding } from "@/lib/models";
import { adminFirestore } from "@/lib/firebase/admin";

/** Reads `app_settings/{docId}` via the Admin SDK (server components / route handlers). */
export async function fetchAppSettingAdmin<T extends Record<string, unknown>>(
  docId: string
): Promise<T | null> {
  const snap = await adminFirestore()
    .collection(Collections.appSettings)
    .doc(docId)
    .get();
  return snap.exists ? (snap.data() as T) : null;
}

export async function fetchBrandingAdmin(): Promise<Branding | null> {
  return fetchAppSettingAdmin<Branding>(AppSettingsDocs.branding);
}

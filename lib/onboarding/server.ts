import "server-only";

import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { AppSettingsDocs, Collections, defaultLicense } from "@/lib/models";
import { adminFirestore } from "@/lib/firebase/admin";
import { fetchAppSettingAdmin } from "@/lib/firebase/admin-settings";
import { mapLicense as mapLicenseFromData } from "@/lib/services/mappers";

export type OnboardingInviteDoc = {
  tokenHash: string;
  status: "pending" | "used";
  boundUid: string | null;
  expiresAt: Timestamp | Date | null;
  usedAt?: unknown;
};

export type OnboardingDoc = {
  completedAt?: Timestamp | Date | null;
  completedByUid?: string | null;
};

export function hashOnboardingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const doc = await fetchAppSettingAdmin<OnboardingDoc>(AppSettingsDocs.onboarding);
  if (doc?.completedAt) return true;
  // Legacy stamps (pre-invite onboarding) already have Locations.
  const branches = await countBranches();
  return branches > 0;
}

export async function getOnboardingInvite(): Promise<OnboardingInviteDoc | null> {
  return fetchAppSettingAdmin<OnboardingInviteDoc>(AppSettingsDocs.onboardingInvite);
}

function expiresAtMs(value: OnboardingInviteDoc["expiresAt"]): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

export type InviteValidation =
  | { ok: true; invite: OnboardingInviteDoc }
  | { ok: false; error: string; status: number };

export async function validateOnboardingInvite(rawToken: string): Promise<InviteValidation> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, error: "Invite token is required.", status: 400 };
  }
  if (await isOnboardingCompleted()) {
    return { ok: false, error: "This workspace is already set up. Sign in instead.", status: 410 };
  }

  const invite = await getOnboardingInvite();
  if (!invite?.tokenHash) {
    return { ok: false, error: "No onboarding invite has been issued for this workspace.", status: 404 };
  }
  if (invite.status === "used") {
    return { ok: false, error: "This invite has already been used.", status: 410 };
  }
  if (invite.tokenHash !== hashOnboardingToken(token)) {
    return { ok: false, error: "This invite link is invalid.", status: 403 };
  }
  const exp = expiresAtMs(invite.expiresAt);
  if (exp != null && exp < Date.now()) {
    return { ok: false, error: "This invite has expired.", status: 410 };
  }
  return { ok: true, invite };
}

export async function loadStampLicense() {
  const snap = await adminFirestore()
    .collection(Collections.appSettings)
    .doc(AppSettingsDocs.license)
    .get();
  if (!snap.exists) return defaultLicense;
  return mapLicenseFromData(snap.data() ?? {});
}

export async function countAdminUsers(): Promise<number> {
  const snap = await adminFirestore()
    .collection(Collections.users)
    .where("role", "==", "admin")
    .get();
  return snap.size;
}

export async function countBranches(): Promise<number> {
  const snap = await adminFirestore().collection(Collections.branches).get();
  return snap.size;
}

export async function bindInviteToUid(uid: string): Promise<void> {
  await adminFirestore()
    .collection(Collections.appSettings)
    .doc(AppSettingsDocs.onboardingInvite)
    .set({ boundUid: uid }, { merge: true });
}

export async function completeOnboarding(uid: string): Promise<void> {
  const db = adminFirestore();
  const batch = db.batch();
  batch.set(
    db.collection(Collections.appSettings).doc(AppSettingsDocs.onboarding),
    {
      completedAt: FieldValue.serverTimestamp(),
      completedByUid: uid
    },
    { merge: true }
  );
  batch.set(
    db.collection(Collections.appSettings).doc(AppSettingsDocs.onboardingInvite),
    {
      status: "used",
      usedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  await batch.commit();
}

/** Ensures the session user may continue an in-progress invite onboarding. */
export async function assertOnboardingSession(
  uid: string,
  rawToken: string
): Promise<InviteValidation> {
  const validated = await validateOnboardingInvite(rawToken);
  if (!validated.ok) return validated;
  const bound = validated.invite.boundUid;
  if (bound && bound !== uid) {
    return {
      ok: false,
      error: "This invite is already in progress for another account.",
      status: 403
    };
  }
  return validated;
}

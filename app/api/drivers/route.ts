import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireLocationAccess } from "@/lib/auth/require-staff";
import { validatePasswordPair } from "@/lib/auth/password-strength";
import { canUsePath } from "@/lib/auth/staff-access";
import { parseBranchId } from "@/lib/branch/require-branch-id";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import {
  Collections,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  canAddDriver,
  defaultDriverProfile
} from "@/lib/models";
import { driverNotification } from "@/lib/notifications/messages";
import { loadStampLicense } from "@/lib/onboarding/server";

/**
 * POST: create a Firebase Auth user, `users/{uid}` driver document, and Location roster entry.
 */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canUsePath(session.staffRole, "/dashboard/drivers")) {
    return NextResponse.json(
      { error: "You do not have permission to manage chauffeurs." },
      { status: 403 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
    phoneNumber?: string;
    branchId?: string;
    address?: {
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postcode?: string | null;
      country?: string | null;
    } | null;
    visibility?: {
      visibleOnCustomerApp?: boolean;
      acceptsDispatchAssignments?: boolean;
    } | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const branchId = parseBranchId(body.branchId);
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }
  const locationDenied = requireLocationAccess(session, branchId);
  if (locationDenied) return locationDenied;

  const trimmedEmail = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim();
  const password = body.password ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (!trimmedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const passwordCheck = validatePasswordPair(password, confirmPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const phoneNumber = body.phoneNumber?.trim() || null;
  const addressRaw = body.address;
  const address = addressRaw
    ? {
        street: addressRaw.street?.trim() || null,
        city: addressRaw.city?.trim() || null,
        state: addressRaw.state?.trim() || null,
        postcode: addressRaw.postcode?.trim() || null,
        country: addressRaw.country?.trim() || null
      }
    : null;

  const defaults = defaultDriverProfile();
  const visibility = {
    visibleOnCustomerApp:
      body.visibility?.visibleOnCustomerApp ?? defaults.visibility.visibleOnCustomerApp,
    acceptsDispatchAssignments:
      body.visibility?.acceptsDispatchAssignments ??
      defaults.visibility.acceptsDispatchAssignments
  };

  try {
    const license = await loadStampLicense();
    if (!license) {
      return NextResponse.json({ error: LICENSE_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const driverSnap = await adminFirestore()
      .collection(Collections.users)
      .where("role", "==", "driver")
      .get();
    if (!canAddDriver(driverSnap.size, license.maxDrivers)) {
      return NextResponse.json(
        { error: "Driver limit reached on the current license." },
        { status: 409 }
      );
    }

    const authUser = await adminAuth().createUser({
      email: trimmedEmail,
      password,
      displayName
    });

    const db = adminFirestore();
    const now = FieldValue.serverTimestamp();

    await db
      .collection(Collections.users)
      .doc(authUser.uid)
      .set({
        id: authUser.uid,
        email: trimmedEmail,
        role: "driver",
        homeBranchId: branchId,
        profile: {
          displayName,
          phoneNumber,
          ...(address ? { address } : {})
        },
        createdAt: now
      });

    await db
      .collection(Collections.branches)
      .doc(branchId)
      .collection("drivers")
      .doc(authUser.uid)
      .set({
        id: authUser.uid,
        userId: authUser.uid,
        chauffeurCategory: defaults.chauffeurCategory,
        qualifications: defaults.qualifications,
        bioStatement: defaults.bioStatement,
        serviceSpecialties: defaults.serviceSpecialties,
        vehicleOrServiceFocus: defaults.vehicleOrServiceFocus,
        availabilitySchedules: defaults.availabilitySchedules,
        visibility,
        createdAt: now,
        updatedAt: now
      });

    await createActivityNotificationAdmin(
      driverNotification("created", displayName, authUser.uid),
      session
    );

    return NextResponse.json({ uid: authUser.uid });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (code === "auth/weak-password") {
      return NextResponse.json({ error: "Password is too weak." }, { status: 400 });
    }
    console.error("Could not create driver:", err);
    return NextResponse.json({ error: "Could not create driver." }, { status: 500 });
  }
}

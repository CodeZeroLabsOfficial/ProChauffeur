import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { customerNotification } from "@/lib/notifications/messages";

/**
 * POST: create a Firebase Auth user and `users/{uid}` customer document.
 */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    phoneNumber?: string;
    address?: {
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postcode?: string | null;
      country?: string | null;
    } | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const trimmedEmail = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim();
  const password = body.password;

  if (!trimmedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
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

  try {
    const authUser = await adminAuth().createUser({
      email: trimmedEmail,
      password,
      displayName
    });

    await adminFirestore()
      .collection("users")
      .doc(authUser.uid)
      .set({
        id: authUser.uid,
        email: trimmedEmail,
        role: "customer",
        profile: {
          displayName,
          phoneNumber,
          ...(address ? { address } : {})
        },
        createdAt: FieldValue.serverTimestamp()
      });

    await createActivityNotificationAdmin(
      customerNotification("created", displayName, authUser.uid),
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
    return NextResponse.json({ error: "Could not create customer." }, { status: 500 });
  }
}

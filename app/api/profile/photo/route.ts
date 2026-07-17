import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebase/admin";
import { uploadProfilePhoto } from "@/lib/firebase/admin-storage";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { profilePhotoNotification } from "@/lib/notifications/messages";

/** POST: upload a profile photo to Firebase Storage for the signed-in admin or a target user. */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  const requestedUid = String(formData.get("uid") ?? "").trim();
  const targetUid = requestedUid || session.uid;

  let notificationTitle = session.displayName ?? session.email ?? "Profile";

  if (targetUid !== session.uid) {
    const snap = await adminFirestore().collection("users").doc(targetUid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const data = snap.data();
    const profile = data?.profile as { displayName?: string } | undefined;
    notificationTitle =
      profile?.displayName?.trim() ||
      (typeof data?.email === "string" ? data.email.trim() : "") ||
      "Profile";
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoURL = await uploadProfilePhoto(targetUid, buffer, file.type, file.name);
    await createActivityNotificationAdmin(
      profilePhotoNotification(notificationTitle, targetUid),
      session
    );
    return NextResponse.json({ photoURL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("5 MB") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

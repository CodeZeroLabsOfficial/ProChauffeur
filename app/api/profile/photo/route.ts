import { NextResponse } from "next/server";

import { uploadProfilePhotoAdmin } from "@/lib/firebase/admin-storage";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { profilePhotoNotification } from "@/lib/notifications/messages";

/** POST: upload the signed-in admin's profile photo to Firebase Storage. */
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoURL = await uploadProfilePhotoAdmin(
      session.uid,
      buffer,
      file.type,
      file.name
    );
    await createActivityNotificationAdmin(
      profilePhotoNotification(session.displayName ?? session.email ?? "Profile", session.uid),
      session
    );
    return NextResponse.json({ photoURL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("5 MB") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

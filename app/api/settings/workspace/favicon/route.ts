import { NextResponse } from "next/server";

import { uploadWorkspaceFaviconAdmin } from "@/lib/firebase/admin-storage";
import { getAdminSessionUser } from "@/lib/firebase/session";

/** POST: upload the workspace favicon to Firebase Storage. */
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

  const isImage =
    file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".ico");
  if (!isImage) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/x-icon";
    const faviconUrl = await uploadWorkspaceFaviconAdmin(buffer, contentType, file.name);
    return NextResponse.json({ faviconUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("5 MB") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

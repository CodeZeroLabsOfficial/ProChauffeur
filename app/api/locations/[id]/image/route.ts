import { NextResponse } from "next/server";

import { uploadBranchImage } from "@/lib/firebase/admin-storage";
import { getAdminSessionUser } from "@/lib/firebase/session";

/** POST: upload a location square image to Firebase Storage. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Location id is required." }, { status: 400 });
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
    const imageUrl = await uploadBranchImage(id, buffer, file.type, file.name);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("5 MB") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import "server-only";

import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";

import { adminApp } from "@/lib/firebase/admin";

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Upload a profile photo via the Admin SDK (bypasses client Storage rules).
 * Returns a Firebase download URL with a storage token.
 */
export async function uploadProfilePhotoAdmin(
  uid: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (buffer.length > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const path = `users/${uid}/profile-photo.${ext}`;
  const bucket = getStorage(adminApp()).bucket();
  const file = bucket.file(path);
  const token = randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType: contentType || "image/jpeg",
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const encoded = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

import "server-only";

import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";

import { adminApp } from "@/lib/firebase/admin";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Upload a profile photo via the Admin SDK (bypasses client Storage rules).
 * Returns a Firebase download URL with a storage token.
 */
export async function uploadProfilePhoto(
  uid: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const path = `users/${uid}/profile-photo.${ext}`;
  return saveStorageImage(path, buffer, contentType);
}

/**
 * Upload the portal branding logo via the Admin SDK (bypasses client Storage rules).
 * Returns a Firebase download URL with a storage token.
 */
export async function uploadBrandingLogoAdmin(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = originalName.split(".").pop()?.toLowerCase() || "png";
  const path = `branding/logo.${ext}`;
  return saveStorageImage(path, buffer, contentType);
}

/**
 * Upload the portal favicon via the Admin SDK (bypasses client Storage rules).
 * Returns a Firebase download URL with a storage token.
 */
export async function uploadBrandingFaviconAdmin(
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const ext = originalName.split(".").pop()?.toLowerCase() || "png";
  const path = `branding/favicon.${ext}`;
  return saveStorageImage(path, buffer, contentType);
}

/**
 * Upload a vehicle class booking hero image via the Admin SDK.
 * Returns a Firebase download URL with a storage token.
 */
export async function uploadVehicleClassImage(
  classId: string,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<string> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const trimmedId = classId.trim();
  if (!trimmedId) {
    throw new Error("Vehicle class id is required.");
  }

  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const path = `vehicle_classes/${trimmedId}/hero.${ext}`;
  return saveStorageImage(path, buffer, contentType);
}

async function saveStorageImage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
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

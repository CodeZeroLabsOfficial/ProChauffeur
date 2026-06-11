"use client";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  type User
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";
import { updateUserEmail } from "@/lib/services/firebase-service";

export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((provider) => provider.providerId === "password");
}

export async function reauthenticateWithPassword(email: string, password: string): Promise<User> {
  const user = firebaseAuth().currentUser;
  if (!user) {
    throw new Error("Not signed in.");
  }
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(email.trim(), password));
  return user;
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await reauthenticateWithPassword(email, currentPassword);
  await updatePassword(user, newPassword);
}

export async function changeEmailAndSync(
  currentEmail: string,
  currentPassword: string,
  newEmail: string
): Promise<void> {
  const trimmedEmail = newEmail.trim();
  const user = await reauthenticateWithPassword(currentEmail, currentPassword);
  await updateEmail(user, trimmedEmail);
  await updateUserEmail(user.uid, trimmedEmail);

  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Could not refresh session." }));
    throw new Error(typeof error === "string" ? error : "Could not refresh session.");
  }
}

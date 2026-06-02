"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getFirebaseClientEnv } from "@/lib/env";

function loginErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return (
          "Invalid email or password. If you normally sign in with Apple or Google on the mobile app, " +
          "that account may not have a password yet — use “Forgot password?” or add Email/Password in " +
          "Firebase Console → Authentication → Users."
        );
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a few minutes and try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorised in Firebase. Add pro-chauffeur.vercel.app under Authentication → Settings → Authorised domains.";
      case "auth/requests-from-referer-are-blocked":
        return "Firebase API key is blocking this site. In Google Cloud → Credentials, allow referrers: https://pro-chauffeur.vercel.app/*";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled. Enable it in Firebase Authentication → Sign-in method.";
      default:
        return `Sign in failed (${error.code}). Check Firebase Auth settings for this project.`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Sign in failed. Please try again.";
}

/** Shown in dev/support to confirm which Firebase project the build is using. */
function firebaseProjectLabel(): string {
  try {
    return getFirebaseClientEnv().NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  } catch {
    return "not configured";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function onForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address first.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth(), trimmed);
      toast.success("Password reset email sent. Complete the link, then sign in here.");
    } catch (error) {
      console.error("Password reset failed:", error);
      toast.error(loginErrorMessage(error));
    } finally {
      setResetting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Sign in failed." }));
        await firebaseAuth().signOut();
        toast.error(error ?? "Sign in failed.");
        return;
      }
      router.replace(redirect);
      router.refresh();
    } catch (error) {
      console.error("Login failed:", error);
      toast.error(loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full items-center justify-center lg:w-1/2">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold">Welcome back</h2>
          <p className="text-muted-foreground mt-2 text-sm">Please sign in to your account</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="sr-only">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="w-full"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="text-end">
              <button
                type="button"
                className="ml-auto inline-block text-sm underline disabled:opacity-50"
                disabled={loading || resetting}
                onClick={onForgotPassword}>
                {resetting ? "Sending reset email…" : "Forgot your password?"}
              </button>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading || resetting}>
              {loading && <LoaderCircleIcon className="animate-spin" />}
              Sign in
            </Button>
          </div>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Firebase project: {firebaseProjectLabel()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh pb-8 lg:h-screen lg:pb-0">
      <div className="hidden w-1/2 bg-gray-100 lg:block">
        <img
          width={1000}
          height={1000}
          src="/images/extra/image4.jpg"
          alt="ProChauffeur operations portal"
          className="h-full w-full object-cover"
        />
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

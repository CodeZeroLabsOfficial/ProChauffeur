"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithCustomToken, type User } from "firebase/auth";
import { LoaderCircleIcon } from "lucide-react";

import { firebaseAuth } from "@/lib/firebase/client";

type FirebaseAuthContextValue = {
  ready: boolean;
  user: User;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

async function restoreAuthFromSession(): Promise<boolean> {
  const res = await fetch("/api/auth/custom-token");
  if (!res.ok) return false;
  const { customToken } = (await res.json()) as { customToken?: string };
  if (!customToken) return false;
  await signInWithCustomToken(firebaseAuth(), customToken);
  return true;
}

/**
 * Ensures Firebase client Auth is active before dashboard children render.
 *
 * Portal access uses an httpOnly session cookie, but Firestore reads require
 * `request.auth` from the client SDK. This provider waits for persisted auth
 * or restores it from the session cookie via a custom token.
 */
export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const restoringRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(firebaseAuth(), async (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser) {
        restoringRef.current = false;
        setUser(firebaseUser);
        return;
      }

      if (restoringRef.current) return;
      restoringRef.current = true;

      try {
        const restored = await restoreAuthFromSession();
        if (cancelled) return;
        if (!restored) {
          router.replace("/login");
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        restoringRef.current = false;
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <LoaderCircleIcon className="text-muted-foreground size-8 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  return (
    <FirebaseAuthContext.Provider value={{ ready: true, user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error("useFirebaseAuth must be used within FirebaseAuthProvider");
  }
  return ctx;
}

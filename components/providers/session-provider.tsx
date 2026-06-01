"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SessionUser } from "@/lib/firebase/session";

const SessionContext = createContext<SessionUser | null>(null);

/** Provides the server-resolved admin session to client components. */
export function SessionProvider({
  user,
  children
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionUser must be used within a SessionProvider");
  return ctx;
}

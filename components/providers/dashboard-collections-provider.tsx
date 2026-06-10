"use client";

import { CollectionsProvider } from "@/components/providers/collections-provider";

export function DashboardCollectionsProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return <CollectionsProvider>{children}</CollectionsProvider>;
}

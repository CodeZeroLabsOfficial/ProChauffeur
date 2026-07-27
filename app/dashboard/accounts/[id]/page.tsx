import { Suspense } from "react";

import { AccountProfilePage } from "@/app/dashboard/accounts/[id]/account-profile-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <AccountProfilePage accountId={id} />
    </Suspense>
  );
}

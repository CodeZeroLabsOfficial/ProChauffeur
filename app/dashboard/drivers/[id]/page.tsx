import { Suspense } from "react";

import { DriverProfilePage } from "@/app/dashboard/drivers/[id]/driver-profile-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <DriverProfilePage driverId={id} />
    </Suspense>
  );
}

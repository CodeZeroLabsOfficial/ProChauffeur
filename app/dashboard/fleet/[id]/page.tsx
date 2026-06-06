import { Suspense } from "react";

import { VehicleProfilePage } from "@/app/dashboard/fleet/[id]/vehicle-profile-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <VehicleProfilePage vehicleDocumentId={id} />
    </Suspense>
  );
}

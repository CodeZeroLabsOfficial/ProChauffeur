import { Suspense } from "react";

import { LocationProfilePage } from "@/app/dashboard/locations/[id]/location-profile-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <LocationProfilePage locationId={id} />
    </Suspense>
  );
}

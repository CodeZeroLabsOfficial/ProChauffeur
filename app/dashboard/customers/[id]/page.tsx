import { Suspense } from "react";

import { CustomerProfilePage } from "@/app/dashboard/customers/[id]/customer-profile-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
      <CustomerProfilePage customerId={id} />
    </Suspense>
  );
}

import { Clock, MapPin, MapPinned, PhoneCall } from "lucide-react";

import type { Branch } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactRow } from "@/components/contact-row";

export function LocationDetailsCard({ branch }: { branch: Branch }) {
  const address = branch.officeAddressLine?.trim();
  const phone = branch.officePhone?.trim();
  const timezone = branch.timeZoneIdentifier?.trim();
  const postcodeCount =
    branch.serviceArea?.type === "postcodes"
      ? (branch.serviceArea.postcodes ?? []).length
      : 0;

  const hasContent = Boolean(address || phone || timezone || postcodeCount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location details</CardTitle>
      </CardHeader>
      <CardContent>
        {hasContent ? (
          <div className="flex flex-col gap-y-4">
            {address ? <ContactRow icon={MapPin}>{address}</ContactRow> : null}
            {phone ? (
              <ContactRow icon={PhoneCall}>
                <a href={`tel:${phone}`} className="hover:text-primary hover:underline">
                  {phone}
                </a>
              </ContactRow>
            ) : null}
            {timezone ? <ContactRow icon={Clock}>{timezone}</ContactRow> : null}
            {postcodeCount > 0 ? (
              <ContactRow icon={MapPinned}>
                {postcodeCount} {postcodeCount === 1 ? "postcode" : "postcodes"} in service area
              </ContactRow>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No office details yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

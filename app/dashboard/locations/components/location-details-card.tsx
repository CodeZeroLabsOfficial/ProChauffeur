import { Clock, MapPin, MapPinned, PhoneCall } from "lucide-react";

import type { Branch } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactRow } from "@/components/contact-row";
import { formatServiceAreaDetail } from "@/lib/branch/service-area";

export function LocationDetailsCard({ branch }: { branch: Branch }) {
  const address = branch.officeAddressLine?.trim();
  const phone = branch.officePhone?.trim();
  const timezone = branch.timeZoneIdentifier?.trim();
  const serviceAreaDetail = formatServiceAreaDetail(branch.serviceArea);

  const hasContent = Boolean(address || phone || timezone || serviceAreaDetail);

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
            {serviceAreaDetail ? (
              <ContactRow icon={MapPinned}>{serviceAreaDetail}</ContactRow>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No office details yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

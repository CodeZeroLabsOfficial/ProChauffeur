"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  BadgePercent,
  CalendarRange,
  Hash,
  MapPin,
  Ticket,
  Type,
  Users
} from "lucide-react";

import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { LocationStatusBadge } from "@/components/location-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { tripTypeTitle, type Branch, type Promotion, type TripType } from "@/lib/models";

function formatDiscount(promo: Promotion): string {
  if (promo.type === "percent") {
    return `${Math.round(promo.value * 10000) / 100}%`;
  }
  return promo.value.toFixed(2);
}

function formatUsageLimit(max: number | null | undefined): string {
  if (max == null) return "Unlimited";
  return String(max);
}

function formatValidity(startsAt: Date | null | undefined, endsAt: Date | null | undefined): string {
  if (!startsAt && !endsAt) return "Always";
  if (startsAt && endsAt) {
    return `${format(startsAt, "MMM d, yyyy")} – ${format(endsAt, "MMM d, yyyy")}`;
  }
  if (startsAt) return `From ${format(startsAt, "MMM d, yyyy")}`;
  return `Until ${format(endsAt!, "MMM d, yyyy")}`;
}

function formatTripTypes(tripTypes: TripType[] | null | undefined): string {
  const ids = tripTypes?.filter(Boolean) ?? [];
  if (ids.length === 0) return "All trip types";
  return ids.map((id) => tripTypeTitle[id] ?? id).join(", ");
}

function DetailValue({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <dd className={muted ? "text-muted-foreground text-sm" : "text-foreground text-sm"}>
      {children}
    </dd>
  );
}

export function PromotionDetailSheet({
  promotion,
  branches,
  vehicleClasses,
  open,
  onOpenChange
}: {
  promotion: Promotion | null;
  branches: Branch[];
  vehicleClasses: { id: string; displayName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const display = useSheetDisplayItem(promotion, open);
  if (!display) return null;

  const branchIds = display.conditions.branchIds?.filter(Boolean) ?? [];
  const locationNames =
    branchIds.length === 0
      ? "All Locations"
      : branchIds
          .map((id) => branches.find((branch) => branch.id === id)?.name ?? id)
          .join(", ");

  const classIds = display.conditions.vehicleClassIds?.filter(Boolean) ?? [];
  const classNames =
    classIds.length === 0
      ? "All vehicle classes"
      : classIds
          .map(
            (id) => vehicleClasses.find((vehicleClass) => vehicleClass.id === id)?.displayName ?? id
          )
          .join(", ");

  const description = display.description?.trim() || null;
  const minFare = display.conditions.minimumSubtotal;
  const perCustomer = display.conditions.perCustomerLimit;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Coupon details</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
          <div className="space-y-4">
            <SectionHeading>Coupon details</SectionHeading>
            <dl className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <DetailLabel icon={Hash}>Coupon code</DetailLabel>
                <DetailValue>
                  <Badge variant="outline" className="rounded-md px-2 py-1 font-mono">
                    {display.code}
                  </Badge>
                </DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Type}>Title</DetailLabel>
                <DetailValue>{display.title || "—"}</DetailValue>
              </div>
              <div className="col-span-2 space-y-1">
                <DetailLabel icon={Ticket}>Description</DetailLabel>
                <DetailValue muted={!description}>{description || "—"}</DetailValue>
              </div>
            </dl>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Discount</SectionHeading>
            <dl className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <DetailLabel icon={BadgePercent}>Discount type</DetailLabel>
                <DetailValue>
                  {display.type === "percent" ? "Percent" : "Fixed amount"}
                </DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={BadgePercent}>Discount value</DetailLabel>
                <DetailValue>{formatDiscount(display)}</DetailValue>
              </div>
            </dl>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Applies to</SectionHeading>
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <DetailLabel icon={MapPin}>Locations</DetailLabel>
                <DetailValue>{locationNames}</DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Ticket}>Trip types</DetailLabel>
                <DetailValue>{formatTripTypes(display.conditions.tripTypes)}</DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Users}>Vehicle classes</DetailLabel>
                <DetailValue>{classNames}</DetailValue>
              </div>
            </dl>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Validity</SectionHeading>
            <dl className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <DetailLabel icon={CalendarRange}>Validity</DetailLabel>
                <DetailValue>
                  {formatValidity(display.conditions.startsAt, display.conditions.endsAt)}
                </DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Hash}>Max redemptions</DetailLabel>
                <DetailValue>{formatUsageLimit(display.conditions.maxRedemptions)}</DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={BadgePercent}>Minimum fare</DetailLabel>
                <DetailValue muted={minFare == null}>
                  {minFare == null ? "None" : String(minFare)}
                </DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Users}>Per customer</DetailLabel>
                <DetailValue>{formatUsageLimit(perCustomer)}</DetailValue>
              </div>
              <div className="space-y-1">
                <DetailLabel icon={Hash}>Used count</DetailLabel>
                <DetailValue>
                  <span className="tabular-nums">{display.redemptionCount}</span>
                </DetailValue>
              </div>
            </dl>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Status</SectionHeading>
            <dl>
              <div className="space-y-1">
                <DetailLabel icon={Ticket}>Active</DetailLabel>
                <DetailValue>
                  <LocationStatusBadge isActive={display.isEnabled} />
                </DetailValue>
              </div>
            </dl>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

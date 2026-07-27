import type { CorporateAccount, CorporateFixedRateOverride } from "@/lib/models/corporate-account";
import type { HourlyPricingRates, TransferPricingRates } from "@/lib/models/pricing";
import type { QuoteLineItem } from "@/lib/models/quote";
import type { TripType } from "@/lib/models/enums";
import type { VehicleClass } from "@/lib/models/vehicle-class";

/** Resolve fixed-rate override for a class + trip type. */
export function findCorporateFixedOverride(
  account: CorporateAccount,
  vehicleClassId: string,
  tripType: TripType
): CorporateFixedRateOverride | null {
  if (account.rateMode !== "fixedRates") return null;
  return (
    account.fixedRates.find(
      (row) => row.vehicleClassId === vehicleClassId && row.tripType === tripType
    ) ?? null
  );
}

/** Merge retail class with corporate fixed overrides for quoting. */
export function applyCorporateFixedRatesToVehicleClass(
  vehicleClass: VehicleClass,
  override: CorporateFixedRateOverride | null
): VehicleClass {
  if (!override) return vehicleClass;
  const transfer: TransferPricingRates = {
    ...vehicleClass.transfer,
    ...(override.transfer ?? {})
  };
  const hourly: HourlyPricingRates = {
    ...vehicleClass.hourly,
    ...(override.hourly ?? {})
  };
  return { ...vehicleClass, transfer, hourly };
}

export function applyCorporatePercentOffLayer(
  amount: number,
  lines: QuoteLineItem[],
  account: CorporateAccount | null | undefined,
  lineId: () => string
): { amount: number; lines: QuoteLineItem[] } {
  if (!account || account.rateMode !== "percentOff") return { amount, lines };
  const percent = account.percentOff ?? 0;
  if (percent <= 0) return { amount, lines };
  const discount = Math.round(amount * percent * 100) / 100;
  if (discount <= 0) return { amount, lines };
  const pctLabel = Math.round(percent * 10000) / 100;
  return {
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
    lines: [
      ...lines,
      {
        id: lineId(),
        label: `Corporate rate (−${pctLabel}%)`,
        amount: -discount,
        category: "discount",
        isInternal: false
      }
    ]
  };
}

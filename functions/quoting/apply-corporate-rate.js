/** Resolve fixed-rate override for a class + trip type. */
function findCorporateFixedOverride(account, vehicleClassId, tripType) {
  if (!account || account.rateMode !== "fixedRates") return null;
  const fixedRates = Array.isArray(account.fixedRates) ? account.fixedRates : [];
  return (
    fixedRates.find(
      (row) => row.vehicleClassId === vehicleClassId && row.tripType === tripType
    ) ?? null
  );
}

/** Merge retail class with corporate fixed overrides for quoting. */
function applyCorporateFixedRatesToVehicleClass(vehicleClass, override) {
  if (!override) return vehicleClass;
  const transfer = {
    ...vehicleClass.transfer,
    ...(override.transfer ?? {}),
  };
  const hourly = {
    ...vehicleClass.hourly,
    ...(override.hourly ?? {}),
  };
  return { ...vehicleClass, transfer, hourly };
}

function applyCorporatePercentOffLayer(amount, lines, account, lineId) {
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
        isInternal: false,
      },
    ],
  };
}

module.exports = {
  findCorporateFixedOverride,
  applyCorporateFixedRatesToVehicleClass,
  applyCorporatePercentOffLayer,
};

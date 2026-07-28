const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

/** Convert meters to km or miles. */
function metersToDistanceUnit(meters, unit) {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  return unit === "mile" ? meters / METERS_PER_MILE : meters / METERS_PER_KM;
}

function distanceUnitLabel(unit) {
  return unit === "mile" ? "mile" : "km";
}

module.exports = {
  metersToDistanceUnit,
  distanceUnitLabel,
};

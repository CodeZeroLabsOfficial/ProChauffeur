/**
 * Resolve a customer pickup to a Location (branch) id.
 * Mirrors web `lib/branch/resolve-branch.ts`.
 */

function normalizePostcode(postcode) {
  return String(postcode || "")
    .trim()
    .toUpperCase();
}

function hasValidCoordinate(latitude, longitude) {
  return typeof latitude === "number" && typeof longitude === "number"
    && (latitude !== 0 || longitude !== 0);
}

/** Great-circle distance between two WGS84 points, in meters. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function branchMatchesPostcode(branch, postcode) {
  const area = branch.serviceArea;
  if (!area || area.type !== "postcodes") return false;
  const list = Array.isArray(area.postcodes) ? area.postcodes : [];
  return list.some((p) => normalizePostcode(p) === postcode);
}

function branchMatchesRadius(branch, latitude, longitude) {
  const area = branch.serviceArea;
  if (!area || area.type !== "radius") return false;
  const centerLat = area.centerLatitude;
  const centerLng = area.centerLongitude;
  const radiusMeters = area.radiusMeters;
  if (
    typeof centerLat !== "number" ||
    typeof centerLng !== "number" ||
    typeof radiusMeters !== "number" ||
    radiusMeters <= 0
  ) {
    return false;
  }
  if (!hasValidCoordinate(centerLat, centerLng)) return false;
  return haversineMeters(latitude, longitude, centerLat, centerLng) <= radiusMeters;
}

function sortedActiveBranches(branches) {
  return (branches || [])
    .filter((b) => b && b.isActive !== false)
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function isMultiLocationEnabled(maxLocations) {
  return typeof maxLocations === "number" && maxLocations > 1;
}

/**
 * Resolves a customer pickup to a Location (branch) id.
 * Matches postcodes first, then radius, across all active Locations.
 * Zero matches → throws with code `out_of_area` (never silent default).
 *
 * @param {{
 *   postcode?: string,
 *   latitude?: number,
 *   longitude?: number,
 *   branches: object[],
 * }} input
 * @returns {string}
 */
function resolveBranchId(input) {
  const postcode = normalizePostcode(input.postcode);
  const hasCoords = hasValidCoordinate(input.latitude, input.longitude);

  if (!postcode && !hasCoords) {
    const err = new Error("Enter a pickup address to continue.");
    err.code = "out_of_area";
    throw err;
  }

  const active = sortedActiveBranches(input.branches);

  if (postcode) {
    const postcodeMatches = active.filter((b) => branchMatchesPostcode(b, postcode));
    if (postcodeMatches.length > 0) return postcodeMatches[0].id;
  }

  if (hasCoords) {
    const radiusMatches = active.filter((b) =>
      branchMatchesRadius(b, input.latitude, input.longitude)
    );
    if (radiusMatches.length > 0) return radiusMatches[0].id;
  }

  const err = new Error("This pickup is outside our service area.");
  err.code = "out_of_area";
  throw err;
}

/** Extract a 4-digit AU-style postcode from a free-form address line. */
function extractPostcodeFromAddress(line) {
  if (typeof line !== "string") return "";
  const m = line.match(/\b\d{4}\b/);
  return m ? m[0] : "";
}

/**
 * Loads branches and resolves a booking Location id from pickup.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{
 *   journey?: {
 *     pickupAddressLine?: string,
 *     pickup?: { latitude?: number, longitude?: number }
 *   }
 * }} trip Nested trip (or quote request) payload — reads `journey.pickupAddressLine`
 *   and `journey.pickup`.
 */
async function resolveBookingBranchId(db, trip) {
  const branchesSnap = await db.collection("branches").get();
  const branches = branchesSnap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      name: data.name || doc.id,
      isActive: data.isActive !== false,
      serviceArea: data.serviceArea || null,
    };
  });

  const journey = trip?.journey && typeof trip.journey === "object" ? trip.journey : {};
  const postcode = extractPostcodeFromAddress(journey.pickupAddressLine) || "";

  let latitude;
  let longitude;
  const pickup = journey.pickup;
  if (pickup && typeof pickup === "object") {
    if (typeof pickup.latitude === "number" && typeof pickup.longitude === "number") {
      latitude = pickup.latitude;
      longitude = pickup.longitude;
    }
  }

  return resolveBranchId({
    postcode,
    latitude,
    longitude,
    branches,
  });
}

module.exports = {
  isMultiLocationEnabled,
  resolveBranchId,
  extractPostcodeFromAddress,
  resolveBookingBranchId,
};

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { requireAuth, requireBranchIdArg } = require("../lib/auth");
const {
  Collections,
  tripRef,
  requireBranchId,
} = require("../lib/collections");
const {
  loadLicenseAndPlans,
  isLocationFeatureEnabled,
} = require("../lib/license");

const RATING_TAGS = [
  "punctuality",
  "cleanliness",
  "professionalism",
  "communication",
  "vehicle_condition",
];

const RATING_SCORE_MIN = 1;
const RATING_SCORE_MAX = 5;
const COMMENT_MAX_LENGTH = 500;

function ratingsCollection(db, branchId) {
  return db.collection(
    `${Collections.branches}/${requireBranchId(branchId)}/ratings`
  );
}

function driverRosterRef(db, branchId, driverId) {
  return db.doc(
    `${Collections.branches}/${requireBranchId(branchId)}/drivers/${driverId}`
  );
}

function branchRef(db, branchId) {
  return db.doc(`${Collections.branches}/${requireBranchId(branchId)}`);
}

function normalizeTags(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "tags must be an array.");
  }
  const tags = [];
  const seen = new Set();
  for (const value of raw) {
    if (typeof value !== "string" || !RATING_TAGS.includes(value)) {
      throw new HttpsError("invalid-argument", `Invalid rating tag: ${value}`);
    }
    if (seen.has(value)) continue;
    seen.add(value);
    tags.push(value);
  }
  return tags;
}

function normalizeComment(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") {
    throw new HttpsError("invalid-argument", "comment must be a string.");
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `comment must be at most ${COMMENT_MAX_LENGTH} characters.`
    );
  }
  return trimmed;
}

function normalizeScore(raw) {
  const score = Number(raw);
  if (!Number.isInteger(score) || score < RATING_SCORE_MIN || score > RATING_SCORE_MAX) {
    throw new HttpsError(
      "invalid-argument",
      `score must be an integer from ${RATING_SCORE_MIN} to ${RATING_SCORE_MAX}.`
    );
  }
  return score;
}

/**
 * Customer submits a star rating (+ optional tags/comment) for a completed trip.
 * Creates branches/{branchId}/ratings/{id}, sets trip ratingId/ratingScore,
 * and updates chauffeur roster ratingAverage/ratingCount.
 */
async function submitTripRatingHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();

  const tripId = request.data?.tripId;
  if (typeof tripId !== "string" || !tripId.trim()) {
    throw new HttpsError("invalid-argument", "tripId is required.");
  }
  const branchId = requireBranchIdArg(request.data?.branchId);
  const score = normalizeScore(request.data?.score);
  const tags = normalizeTags(request.data?.tags);
  const comment = normalizeComment(request.data?.comment);

  const tripDocRef = tripRef(db, tripId.trim(), branchId);
  const branchDocRef = branchRef(db, branchId);

  const [licenseBundle, branchSnap] = await Promise.all([
    loadLicenseAndPlans(db),
    branchDocRef.get(),
  ]);

  if (!branchSnap.exists) {
    throw new HttpsError("not-found", "Location not found.");
  }

  const branchData = branchSnap.data() || {};
  if (
    !isLocationFeatureEnabled(
      licenseBundle.license,
      licenseBundle.catalog,
      {
        autoDispatchEnabled: branchData.autoDispatchEnabled === true,
        dynamicPricingEnabled: branchData.dynamicPricingEnabled === true,
        bookingValidationEnabled: branchData.bookingValidationEnabled === true,
        driverRatingsEnabled: branchData.driverRatingsEnabled === true,
      },
      "driverRatings"
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Driver ratings are not enabled for this Location."
    );
  }

  const ratingId = await db.runTransaction(async (tx) => {
    const tripSnap = await tx.get(tripDocRef);
    if (!tripSnap.exists) {
      throw new HttpsError("not-found", "Trip not found.");
    }
    const trip = tripSnap.data() || {};

    if (trip.customerID !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the trip customer can submit a rating."
      );
    }
    if (trip.status !== "completed") {
      throw new HttpsError(
        "failed-precondition",
        "Only completed trips can be rated."
      );
    }
    const driverID =
      typeof trip.driverID === "string" && trip.driverID.trim()
        ? trip.driverID.trim()
        : "";
    if (!driverID) {
      throw new HttpsError(
        "failed-precondition",
        "This trip has no assigned chauffeur to rate."
      );
    }
    if (typeof trip.ratingId === "string" && trip.ratingId.trim()) {
      throw new HttpsError(
        "failed-precondition",
        "This trip has already been rated."
      );
    }

    const existing = await tx.get(
      ratingsCollection(db, branchId).where("tripId", "==", tripId.trim()).limit(1)
    );
    if (!existing.empty) {
      throw new HttpsError(
        "failed-precondition",
        "This trip has already been rated."
      );
    }

    const rosterRef = driverRosterRef(db, branchId, driverID);
    const rosterSnap = await tx.get(rosterRef);
    const roster = rosterSnap.exists ? rosterSnap.data() || {} : {};
    const prevCount =
      typeof roster.ratingCount === "number" && Number.isFinite(roster.ratingCount)
        ? Math.max(0, Math.trunc(roster.ratingCount))
        : 0;
    const prevAverage =
      typeof roster.ratingAverage === "number" && Number.isFinite(roster.ratingAverage)
        ? roster.ratingAverage
        : 0;
    const nextCount = prevCount + 1;
    const nextAverage =
      prevCount === 0 ? score : (prevAverage * prevCount + score) / nextCount;

    const newRatingRef = ratingsCollection(db, branchId).doc();
    const customer =
      trip.customer && typeof trip.customer === "object" ? trip.customer : {};
    const journey =
      trip.journey && typeof trip.journey === "object" ? trip.journey : {};
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.set(newRatingRef, {
      branchId,
      tripId: tripId.trim(),
      driverID,
      customerID: uid,
      score,
      tags,
      comment,
      ratedAt: now,
      customerDisplayName:
        typeof customer.displayName === "string" ? customer.displayName : null,
      tripCompletedAt: journey.journeyCompletedAt ?? null,
    });

    tx.update(tripDocRef, {
      ratingId: newRatingRef.id,
      ratingScore: score,
      updatedAt: now,
    });

    const rosterPayload = {
      ratingAverage: Math.round(nextAverage * 100) / 100,
      ratingCount: nextCount,
      updatedAt: now,
    };
    if (rosterSnap.exists) {
      tx.update(rosterRef, rosterPayload);
    } else {
      tx.set(
        rosterRef,
        {
          userId: driverID,
          ...rosterPayload,
          createdAt: now,
        },
        { merge: true }
      );
    }

    return newRatingRef.id;
  });

  return { ratingId, score };
}

module.exports = { submitTripRatingHandler };

/**
 * Firestore trip write → lifecycle / open-pool notifications.
 */

const admin = require("firebase-admin");
const {
  deliverUserNotification,
  multicastOpenJobPush,
} = require("./deliver-user-notification");

const DRIVING_CATEGORIES = new Set(["leadChauffeur", "chauffeur"]);

function driverIdEmpty(data) {
  const id = data?.driverID;
  return id == null || id === "";
}

function isOpenPool(data) {
  return data?.status === "requested" && driverIdEmpty(data);
}

function pickupLabel(trip) {
  return (
    trip?.journey?.pickupAddressLine ||
    trip?.journey?.pickupSuburb ||
    "Pickup"
  );
}

function scheduleLabel(trip) {
  const raw = trip?.journey?.scheduledPickupAt;
  if (!raw) return "";
  try {
    const date =
      typeof raw.toDate === "function"
        ? raw.toDate()
        : raw instanceof Date
          ? raw
          : new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function journeyMateriallyChanged(before, after) {
  const bj = before?.journey || {};
  const aj = after?.journey || {};
  const keys = [
    "scheduledPickupAt",
    "pickupAddressLine",
    "dropoffAddressLine",
    "pickup",
    "dropoff",
    "notes",
  ];
  return keys.some((k) => JSON.stringify(bj[k]) !== JSON.stringify(aj[k]));
}

async function resolveDispatchMode(branchId) {
  if (!branchId) return "open_pool";
  const snap = await admin
    .firestore()
    .doc(`branches/${branchId}/settings/dispatch`)
    .get();
  if (!snap.exists) return "open_pool";
  const mode = snap.data()?.dispatchMode;
  return mode === "auto" ? "auto" : "open_pool";
}

async function eligibleRosterDriverUids(branchId) {
  const snap = await admin
    .firestore()
    .collection(`branches/${branchId}/drivers`)
    .get();
  const uids = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const category = data.chauffeurCategory || "chauffeur";
    if (!DRIVING_CATEGORIES.has(category)) return;
    const accepts = data.visibility?.acceptsDispatchAssignments;
    if (accepts === false) return;
    uids.push(doc.id);
  });
  return uids;
}

/**
 * @param {import("firebase-functions/v2/firestore").FirestoreEvent} event
 */
async function notifyOnTripWriteHandler(event) {
  const beforeSnap = event.data?.before;
  const afterSnap = event.data?.after;
  if (!afterSnap?.exists) return;

  const before = beforeSnap?.exists ? beforeSnap.data() : null;
  const after = afterSnap.data() || {};
  const branchId = event.params.branchId;
  const tripId = event.params.tripId;
  const customerID = after.customerID;

  const beforeStatus = before?.status;
  const afterStatus = after.status;
  const beforeDriver = before?.driverID || null;
  const afterDriver = after.driverID || null;

  const when = scheduleLabel(after);
  const pickup = pickupLabel(after);

  // Booking created
  if (!before && afterStatus === "requested" && customerID) {
    await deliverUserNotification({
      uid: customerID,
      type: "trip.booking_confirmed",
      title: "Booking confirmed",
      body: when
        ? `${when} · ${pickup}`
        : `Your trip to ${pickup} is confirmed.`,
      tripId,
      branchId,
      prefKey: "bookingReminders",
    });
  }

  // Entered open pool
  const enteredOpenPool =
    isOpenPool(after) &&
    (!before || !isOpenPool(before));
  if (enteredOpenPool) {
    const mode = await resolveDispatchMode(branchId);
    if (mode === "open_pool") {
      const uids = await eligibleRosterDriverUids(branchId);
      await multicastOpenJobPush(uids, {
        type: "trip.open_job",
        title: "New job available",
        body: when ? `${when} · ${pickup}` : pickup,
        tripId,
        branchId,
      });
    }
  }

  // Driver assigned / reassigned / unassigned
  if (beforeDriver !== afterDriver) {
    if (afterDriver && !beforeDriver && customerID) {
      const name =
        after.driver?.displayName ||
        after.driver?.display_name ||
        "Your chauffeur";
      await deliverUserNotification({
        uid: customerID,
        type: "trip.driver_assigned",
        title: "Chauffeur assigned",
        body: `${name} will handle your trip.`,
        tripId,
        branchId,
        prefKey: "bookingReminders",
      });
    } else if (beforeDriver && afterDriver) {
      await deliverUserNotification({
        uid: beforeDriver,
        type: "trip.reassigned",
        title: "Trip reassigned",
        body: `A trip at ${pickup} was reassigned.`,
        tripId,
        branchId,
        prefKey: "tripJobAlerts",
      });
      await deliverUserNotification({
        uid: afterDriver,
        type: "trip.reassigned",
        title: "New trip assignment",
        body: when ? `${when} · ${pickup}` : pickup,
        tripId,
        branchId,
        prefKey: "tripJobAlerts",
      });
      if (customerID) {
        const name =
          after.driver?.displayName ||
          after.driver?.display_name ||
          "Your chauffeur";
        await deliverUserNotification({
          uid: customerID,
          type: "trip.reassigned",
          title: "Chauffeur updated",
          body: `${name} is now assigned to your trip.`,
          tripId,
          branchId,
          prefKey: "bookingReminders",
        });
      }
    } else if (beforeDriver && !afterDriver && afterStatus === "requested") {
      await deliverUserNotification({
        uid: beforeDriver,
        type: "trip.reassigned",
        title: "Trip unassigned",
        body: `You were removed from a trip at ${pickup}.`,
        tripId,
        branchId,
        prefKey: "tripJobAlerts",
      });
      if (customerID) {
        await deliverUserNotification({
          uid: customerID,
          type: "trip.reassigned",
          title: "Looking for a chauffeur",
          body: "Your trip is waiting to be assigned.",
          tripId,
          branchId,
          prefKey: "bookingReminders",
        });
      }
    }
  }

  // Status transitions
  if (beforeStatus !== afterStatus) {
    if (afterStatus === "en_route_pickup" && customerID) {
      await deliverUserNotification({
        uid: customerID,
        type: "trip.en_route",
        title: "Chauffeur en route",
        body: "Your chauffeur is on the way to pickup.",
        tripId,
        branchId,
        prefKey: "bookingReminders",
      });
    }
    if (afterStatus === "in_progress" && customerID) {
      await deliverUserNotification({
        uid: customerID,
        type: "trip.started",
        title: "Trip started",
        body: "Your ride is under way.",
        tripId,
        branchId,
        prefKey: "bookingReminders",
      });
    }
    if (afterStatus === "completed") {
      if (customerID) {
        await deliverUserNotification({
          uid: customerID,
          type: "trip.completed",
          title: "Trip completed",
          body: "Thanks for riding with us. Your receipt is ready.",
          tripId,
          branchId,
          prefKey: "bookingReminders",
        });
      }
      if (afterDriver) {
        await deliverUserNotification({
          uid: afterDriver,
          type: "trip.completed",
          title: "Trip completed",
          body: `Trip at ${pickup} is complete.`,
          tripId,
          branchId,
          prefKey: "tripJobAlerts",
        });
      }
    }
    if (afterStatus === "cancelled") {
      if (customerID) {
        await deliverUserNotification({
          uid: customerID,
          type: "trip.cancelled",
          title: "Trip cancelled",
          body: when
            ? `Your booking for ${when} was cancelled.`
            : "Your booking was cancelled.",
          tripId,
          branchId,
          prefKey: "bookingReminders",
        });
      }
      if (afterDriver || beforeDriver) {
        const driverUid = afterDriver || beforeDriver;
        await deliverUserNotification({
          uid: driverUid,
          type: "trip.cancelled",
          title: "Trip cancelled",
          body: `A trip at ${pickup} was cancelled.`,
          tripId,
          branchId,
          prefKey: "tripJobAlerts",
        });
      }
    }
  }

  // Schedule / journey updates (existing trip)
  if (before && journeyMateriallyChanged(before, after)) {
    if (customerID) {
      await deliverUserNotification({
        uid: customerID,
        type: "trip.schedule_updated",
        title: "Trip updated",
        body: when
          ? `Schedule or details changed · ${when}`
          : "Your trip details were updated.",
        tripId,
        branchId,
        prefKey: "bookingReminders",
      });
    }
    if (afterDriver) {
      await deliverUserNotification({
        uid: afterDriver,
        type: "trip.schedule_updated",
        title: "Trip updated",
        body: when
          ? `Schedule or details changed · ${when}`
          : "Trip details were updated.",
        tripId,
        branchId,
        prefKey: "tripJobAlerts",
      });
    }
  }
}

module.exports = { notifyOnTripWriteHandler };

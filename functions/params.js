const { defineString } = require("firebase-functions/params");

/** GCP region for all functions. Must match NEXT_PUBLIC_FUNCTIONS_REGION on the web app. */
const functionsRegion = defineString("FUNCTIONS_REGION", {
  default: "australia-southeast1",
  description: "GCP region for Cloud Functions",
});

/** IANA timezone for scheduled jobs (corporate invoice consolidation at 01:00). */
const scheduleTimezone = defineString("SCHEDULE_TIMEZONE", {
  default: "Australia/Sydney",
  description: "IANA timezone for scheduled Cloud Functions",
});

module.exports = {
  functionsRegion,
  scheduleTimezone,
};

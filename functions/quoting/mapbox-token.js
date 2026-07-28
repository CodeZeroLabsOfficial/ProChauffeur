const { defineSecret } = require("firebase-functions/params");

const mapboxAccessToken = defineSecret("MAPBOX_ACCESS_TOKEN");

function getMapboxToken() {
  try {
    const fromSecret = mapboxAccessToken.value();
    if (fromSecret) return fromSecret;
  } catch {
    // Secret not bound on this invocation (local/tests) — fall through.
  }
  return process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_TOKEN || "";
}

module.exports = {
  mapboxAccessToken,
  getMapboxToken,
};

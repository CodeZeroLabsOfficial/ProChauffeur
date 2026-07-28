/**
 * Fetch driving route metrics from Mapbox Directions API (overview=false).
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ latitude: number, longitude: number }} to
 * @param {string} token
 * @returns {Promise<{ distanceMeters: number, durationSeconds: number }|null>}
 */
async function fetchRouteMetrics(from, to, token) {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  url.searchParams.set("overview", "false");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const route = data.routes && data.routes[0];
  if (!route) return null;

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

module.exports = {
  fetchRouteMetrics,
};

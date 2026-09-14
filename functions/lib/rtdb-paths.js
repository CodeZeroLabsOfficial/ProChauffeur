const { requireBranchId } = require("./collections");

const rtdbLiveTripsPath = "liveTrips";
const rtdbTripChatsPath = "tripChats";

function rtdbLiveTripPath(branchId, tripId) {
  return `${rtdbLiveTripsPath}/${requireBranchId(branchId)}/${tripId}`;
}

function rtdbTripChatPath(branchId, tripId) {
  return `${rtdbTripChatsPath}/${requireBranchId(branchId)}/${tripId}`;
}

module.exports = {
  rtdbLiveTripsPath,
  rtdbTripChatsPath,
  rtdbLiveTripPath,
  rtdbTripChatPath,
};

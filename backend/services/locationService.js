/**
 * Calculates the distance between two GPS coordinates in meters using the Haversine formula.
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
};

/**
 * Validates if the location is within the allowed geofence range (e.g., 100 meters).
 */
const isWithinGeofence = (lat1, lon1, lat2, lon2, maxDistanceMeters = 100) => {
  const distance = getDistanceInMeters(lat1, lon1, lat2, lon2);
  return {
    isWithin: distance <= maxDistanceMeters,
    distance: Math.round(distance * 100) / 100 // rounded to 2 decimal places
  };
};

module.exports = {
  getDistanceInMeters,
  isWithinGeofence
};

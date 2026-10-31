/**
 * High-precision Haversine formula to compute distance between two GPS coordinates in meters
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cluster consecutive GPS tracking points to detect dwell periods (stops)
 * A stop is triggered when the officer remains within `radiusMeters` for at least `minDwellSeconds`.
 */
function detectStopsFromPoints(points, options = {}) {
  const radiusMeters = options.radiusMeters || 60; // 60 meter dwell radius
  const minDwellSeconds = options.minDwellSeconds || 120; // 2 minutes dwell threshold

  if (!points || points.length < 2) return [];

  // Sort chronologically
  const sorted = [...points].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const stops = [];
  let cluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const pt = sorted[i];
    const clusterCenterLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
    const clusterCenterLon = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;

    const dist = getDistanceInMeters(clusterCenterLat, clusterCenterLon, pt.latitude, pt.longitude);

    if (dist <= radiusMeters) {
      cluster.push(pt);
    } else {
      // Evaluate previous cluster
      const firstTime = new Date(cluster[0].timestamp).getTime();
      const lastTime = new Date(cluster[cluster.length - 1].timestamp).getTime();
      const durationSeconds = Math.round((lastTime - firstTime) / 1000);

      if (durationSeconds >= minDwellSeconds) {
        stops.push({
          stopIndex: stops.length + 1,
          latitude: clusterCenterLat,
          longitude: clusterCenterLon,
          startTime: new Date(firstTime).toISOString(),
          endTime: new Date(lastTime).toISOString(),
          durationSeconds,
          pointCount: cluster.length
        });
      }

      cluster = [pt];
    }
  }

  // Check last cluster
  if (cluster.length > 1) {
    const firstTime = new Date(cluster[0].timestamp).getTime();
    const lastTime = new Date(cluster[cluster.length - 1].timestamp).getTime();
    const durationSeconds = Math.round((lastTime - firstTime) / 1000);

    if (durationSeconds >= minDwellSeconds) {
      const clusterCenterLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
      const clusterCenterLon = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
      stops.push({
        stopIndex: stops.length + 1,
        latitude: clusterCenterLat,
        longitude: clusterCenterLon,
        startTime: new Date(firstTime).toISOString(),
        endTime: new Date(lastTime).toISOString(),
        durationSeconds,
        pointCount: cluster.length
      });
    }
  }

  return stops;
}

/**
 * Total distance calculation along chronological point path
 */
function calculateTotalDistance(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += getDistanceInMeters(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude
    );
  }
  return Math.round(total);
}

module.exports = {
  getDistanceInMeters,
  detectStopsFromPoints,
  calculateTotalDistance
};

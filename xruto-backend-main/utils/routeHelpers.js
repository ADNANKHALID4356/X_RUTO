// Default depot coordinates (Warrington)
const DEPOT_LAT = 53.3808256;
const DEPOT_LNG = -2.575416;

/**
 * Haversine distance between two lat/lng points in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate distance from the default depot to a given coordinate
 */
function calculateDistanceFromDepot(lat, lng) {
  if (!lat || !lng) return 0;
  return Math.round(haversineDistance(DEPOT_LAT, DEPOT_LNG, lat, lng) * 100) / 100;
}

/**
 * Simple k-means clustering for mock/fallback use.
 * The real clustering goes through hereAPI.generateOptimizedClustersForArea().
 */
function performKMeansClustering(orders, maxZones = 5) {
  if (!orders || orders.length === 0) return [];

  const k = Math.min(maxZones, orders.length);
  const colors = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98', '#87CEEB'];
  const zones = [];

  const perZone = Math.ceil(orders.length / k);
  for (let i = 0; i < k; i++) {
    const zoneOrders = orders.slice(i * perZone, (i + 1) * perZone);
    if (zoneOrders.length === 0) continue;

    zones.push({
      zone_id: 'zone_' + (i + 1),
      zone_name: 'Zone ' + (i + 1) + ' - ' + (zoneOrders[0].postcode_area || zoneOrders[0].postcode || 'Unknown'),
      total_orders: zoneOrders.length,
      orders: zoneOrders,
      color_hex: colors[i % colors.length],
      center_lat: zoneOrders.reduce((s, o) => s + (parseFloat(o.latitude) || DEPOT_LAT), 0) / zoneOrders.length,
      center_lng: zoneOrders.reduce((s, o) => s + (parseFloat(o.longitude) || DEPOT_LNG), 0) / zoneOrders.length
    });
  }

  return zones;
}

/**
 * Build a HERE WeGo navigation URL from depot + waypoints.
 * Returns object with url and stats when detailed=true, plain string otherwise.
 */
function generateNavigationURL(depot, waypoints, detailed = false) {
  const depotCoord = `${depot.latitude || depot.lat},${depot.longitude || depot.lng}`;

  const seen = new Set();
  const uniqueWaypoints = [];
  let duplicates = 0;

  for (const wp of waypoints) {
    const key = `${wp.lat},${wp.lng}`;
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    uniqueWaypoints.push(wp);
  }

  const waypointCoords = uniqueWaypoints.map(wp => `${wp.lat},${wp.lng}`).join('/');
  const url = `https://wego.here.com/directions/drive/${depotCoord}/${waypointCoords}/${depotCoord}`;

  if (detailed) {
    return {
      url,
      stats: {
        unique: uniqueWaypoints.length,
        duplicates,
        expected_points: uniqueWaypoints.length + 2
      }
    };
  }

  return url;
}

/**
 * Estimate route metrics from order count (for mock / demo mode)
 */
function calculateRealisticMetrics(orderCount) {
  const distance_km = Math.round((5 + orderCount * 2.5) * 100) / 100;
  const distance_miles = Math.round(distance_km * 0.621371 * 100) / 100;
  const time_minutes = Math.round(15 + orderCount * 7);
  const fuel_cost = Math.round((distance_miles / 30) * 1.45 * 100) / 100;

  return { distance_km, distance_miles, time_minutes, fuel_cost };
}

module.exports = {
  calculateDistanceFromDepot,
  performKMeansClustering,
  generateNavigationURL,
  calculateRealisticMetrics,
  haversineDistance,
  DEPOT_LAT,
  DEPOT_LNG
};

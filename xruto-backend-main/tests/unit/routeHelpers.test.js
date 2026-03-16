'use strict';

const {
  calculateDistanceFromDepot,
  performKMeansClustering,
  generateNavigationURL,
  calculateRealisticMetrics,
} = require('../../utils/routeHelpers');

// ─────────────────────────────────────────────
// calculateDistanceFromDepot
// ─────────────────────────────────────────────
describe('calculateDistanceFromDepot', () => {
  it('returns 0 for missing coords', () => {
    expect(calculateDistanceFromDepot(null, null)).toBe(0);
    expect(calculateDistanceFromDepot(undefined, undefined)).toBe(0);
    expect(calculateDistanceFromDepot(0, 0)).toBe(0);
  });

  it('returns 0 for the depot itself', () => {
    // Warrington depot
    const dist = calculateDistanceFromDepot(53.3808256, -2.575416);
    expect(dist).toBe(0);
  });

  it('returns a positive distance for a nearby location', () => {
    // Manchester city centre is ~25 km from depot
    const dist = calculateDistanceFromDepot(53.4808, -2.2426);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(50);
  });

  it('returns a rounded number (max 2 decimals)', () => {
    const dist = calculateDistanceFromDepot(53.5, -2.5);
    const decimals = (dist.toString().split('.')[1] || '').length;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────
// performKMeansClustering
// ─────────────────────────────────────────────
describe('performKMeansClustering', () => {
  const makeOrders = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: String(i + 1),
      postcode: `WA${i + 1} 1AA`,
      latitude: 53.38 + i * 0.01,
      longitude: -2.57 + i * 0.01,
    }));

  it('returns empty array for empty/null input', () => {
    expect(performKMeansClustering([])).toEqual([]);
    expect(performKMeansClustering(null)).toEqual([]);
    expect(performKMeansClustering(undefined)).toEqual([]);
  });

  it('returns at most maxZones zones', () => {
    const zones = performKMeansClustering(makeOrders(10), 3);
    expect(zones.length).toBeLessThanOrEqual(3);
  });

  it('distributes all orders across zones', () => {
    const orders = makeOrders(7);
    const zones = performKMeansClustering(orders, 3);
    const total = zones.reduce((s, z) => s + z.orders.length, 0);
    expect(total).toBe(7);
  });

  it('each zone has required fields', () => {
    const zones = performKMeansClustering(makeOrders(4), 2);
    for (const zone of zones) {
      expect(zone).toHaveProperty('zone_id');
      expect(zone).toHaveProperty('zone_name');
      expect(zone).toHaveProperty('total_orders');
      expect(zone).toHaveProperty('orders');
      expect(zone).toHaveProperty('color_hex');
      expect(zone).toHaveProperty('center_lat');
      expect(zone).toHaveProperty('center_lng');
    }
  });

  it('creates exactly 1 zone if only 1 order', () => {
    const zones = performKMeansClustering(makeOrders(1), 5);
    expect(zones.length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// generateNavigationURL
// ─────────────────────────────────────────────
describe('generateNavigationURL', () => {
  const depot = { latitude: 53.3808256, longitude: -2.575416 };
  const waypoints = [
    { lat: 53.39, lng: -2.56 },
    { lat: 53.40, lng: -2.55 },
  ];

  it('returns a valid HERE WeGo URL string (non-detailed)', () => {
    const url = generateNavigationURL(depot, waypoints, false);
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https:\/\/wego\.here\.com\/directions\/drive\//);
  });

  it('returns an object with url and stats when detailed=true', () => {
    const result = generateNavigationURL(depot, waypoints, true);
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('stats');
    expect(result.stats).toHaveProperty('unique');
    expect(result.stats).toHaveProperty('duplicates');
  });

  it('deduplicates waypoints with identical coords', () => {
    const dupWaypoints = [
      { lat: 53.39, lng: -2.56 },
      { lat: 53.39, lng: -2.56 }, // duplicate
      { lat: 53.40, lng: -2.55 },
    ];
    const result = generateNavigationURL(depot, dupWaypoints, true);
    expect(result.stats.duplicates).toBe(1);
    expect(result.stats.unique).toBe(2);
  });

  it('handles empty waypoints array', () => {
    const url = generateNavigationURL(depot, [], false);
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https:\/\/wego\.here\.com/);
  });
});

// ─────────────────────────────────────────────
// calculateRealisticMetrics
// ─────────────────────────────────────────────
describe('calculateRealisticMetrics', () => {
  it('returns all required fields', () => {
    const m = calculateRealisticMetrics(5);
    expect(m).toHaveProperty('distance_km');
    expect(m).toHaveProperty('distance_miles');
    expect(m).toHaveProperty('time_minutes');
    expect(m).toHaveProperty('fuel_cost');
  });

  it('distance_miles is less than distance_km (km > miles)', () => {
    const m = calculateRealisticMetrics(5);
    expect(m.distance_miles).toBeLessThan(m.distance_km);
  });

  it('values increase with more orders', () => {
    const m5 = calculateRealisticMetrics(5);
    const m10 = calculateRealisticMetrics(10);
    expect(m10.distance_km).toBeGreaterThan(m5.distance_km);
    expect(m10.time_minutes).toBeGreaterThan(m5.time_minutes);
  });

  it('returns positive numbers for 0 orders', () => {
    const m = calculateRealisticMetrics(0);
    expect(m.distance_km).toBeGreaterThan(0);
    expect(m.time_minutes).toBeGreaterThan(0);
  });
});

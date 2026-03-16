const HereAPIService = require('../../services/hereAPI');

// Create a fresh instance for testing (without side-effects from the singleton)
let hereAPI;

beforeEach(() => {
  // Create new instance without API key for pure unit testing
  hereAPI = new HereAPIService.constructor();
});

describe('HERE API Service', () => {

  describe('calculateHaversineDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = hereAPI.calculateHaversineDistance(53.3808, -2.5740, 53.3808, -2.5740);
      expect(distance).toBe(0);
    });

    it('should calculate correct distance between two UK points', () => {
      // Warrington to Manchester roughly 25-30km
      const distance = hereAPI.calculateHaversineDistance(53.3808, -2.5740, 53.4808, -2.2426);
      expect(distance).toBeGreaterThan(15);
      expect(distance).toBeLessThan(40);
    });

    it('should return a positive value regardless of order', () => {
      const d1 = hereAPI.calculateHaversineDistance(53.38, -2.57, 53.48, -2.24);
      const d2 = hereAPI.calculateHaversineDistance(53.48, -2.24, 53.38, -2.57);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });
  });

  describe('toRadians', () => {
    it('should convert 180 degrees to PI', () => {
      expect(hereAPI.toRadians(180)).toBeCloseTo(Math.PI, 10);
    });

    it('should convert 0 degrees to 0', () => {
      expect(hereAPI.toRadians(0)).toBe(0);
    });

    it('should convert 90 degrees to PI/2', () => {
      expect(hereAPI.toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    });
  });

  describe('getFallbackCoordinates', () => {
    it('should return coordinates for WA4 postcode', () => {
      const result = hereAPI.getFallbackCoordinates('WA4 1AB');
      expect(result).toHaveProperty('lat');
      expect(result).toHaveProperty('lng');
      expect(result.source).toBe('fallback');
      expect(result.confidence).toBe(0.7);
      // Should be near Warrington WA4
      expect(result.lat).toBeCloseTo(53.3808, 0);
    });

    it('should return WA4 default for unknown postcode', () => {
      const result = hereAPI.getFallbackCoordinates('ZZ99 9ZZ');
      expect(result).toHaveProperty('lat');
      expect(result.source).toBe('fallback');
    });

    it('should return WA4 default for empty postcode', () => {
      const result = hereAPI.getFallbackCoordinates('');
      expect(result).toHaveProperty('lat');
      expect(result.source).toBe('fallback');
    });
  });

  describe('shouldReturnToDepot', () => {
    it('should return false when below minimum order threshold', () => {
      expect(hereAPI.shouldReturnToDepot(3, 25, 10)).toBe(false);
    });

    it('should return true when capacity threshold reached', () => {
      // 18 out of 25 = 72% > 70% threshold, and >= 8 minimum
      expect(hereAPI.shouldReturnToDepot(18, 25, 5)).toBe(true);
    });

    it('should return true when far from depot with sufficient orders', () => {
      // 8 orders, distance > 15km
      expect(hereAPI.shouldReturnToDepot(8, 25, 20)).toBe(true);
    });

    it('should return false when capacity not yet reached', () => {
      // 8 orders out of 25 = 32% < 70%, and distance < 15
      expect(hereAPI.shouldReturnToDepot(8, 25, 10)).toBe(false);
    });
  });

  describe('calculateOrderWeight', () => {
    it('should return 1 for a normal order', () => {
      const weight = hereAPI.calculateOrderWeight({ order_value: 50 });
      expect(weight).toBe(1);
    });

    it('should increase weight for high priority orders', () => {
      const weight = hereAPI.calculateOrderWeight({ priority: 'high', order_value: 50 });
      expect(weight).toBe(1.5);
    });

    it('should increase weight for high-value orders', () => {
      const weight = hereAPI.calculateOrderWeight({ order_value: 150 });
      expect(weight).toBe(1.2);
    });

    it('should combine priority and value weights', () => {
      const weight = hereAPI.calculateOrderWeight({ priority: 'high', order_value: 150 });
      expect(weight).toBeCloseTo(1.8); // 1 * 1.5 * 1.2
    });
  });

  describe('calculateOrderComplexity', () => {
    it('should return 1 for a simple order', () => {
      const complexity = hereAPI.calculateOrderComplexity({ weight: 2, order_value: 50 });
      expect(complexity).toBe(1);
    });

    it('should increase for heavy items', () => {
      const complexity = hereAPI.calculateOrderComplexity({ weight: 8, order_value: 50 });
      expect(complexity).toBe(1.5); // +0.5 for weight > 5
    });

    it('should increase for very heavy items', () => {
      const complexity = hereAPI.calculateOrderComplexity({ weight: 12, order_value: 50 });
      expect(complexity).toBe(2.0); // +0.5 for >5, +0.5 for >10
    });

    it('should increase for high-value orders', () => {
      const complexity = hereAPI.calculateOrderComplexity({ weight: 2, order_value: 250 });
      expect(complexity).toBe(1.3); // +0.3 for >200
    });

    it('should increase for fragile/special orders', () => {
      const complexity = hereAPI.calculateOrderComplexity({ weight: 2, order_value: 50, is_fragile: true });
      expect(complexity).toBe(1.4); // +0.4 for fragile
    });
  });

  describe('calculateRealisticRouteTime', () => {
    it('should return 60 minutes for null/zero inputs', () => {
      expect(hereAPI.calculateRealisticRouteTime(0, 0)).toBe(60);
      expect(hereAPI.calculateRealisticRouteTime(null, null)).toBe(60);
    });

    it('should calculate realistic time for a short route', () => {
      const time = hereAPI.calculateRealisticRouteTime(10, 5);
      expect(time).toBeGreaterThan(40);
      expect(time).toBeLessThan(200);
    });

    it('should increase with more orders', () => {
      const time5 = hereAPI.calculateRealisticRouteTime(20, 5);
      const time15 = hereAPI.calculateRealisticRouteTime(20, 15);
      expect(time15).toBeGreaterThan(time5);
    });

    it('should increase with more distance', () => {
      const time10km = hereAPI.calculateRealisticRouteTime(10, 10);
      const time50km = hereAPI.calculateRealisticRouteTime(50, 10);
      expect(time50km).toBeGreaterThan(time10km);
    });
  });

  describe('calculateOptimizedRouteDistance', () => {
    const depot = { lat: 53.3808, lng: -2.5740 };

    it('should return 0 for empty orders', () => {
      expect(hereAPI.calculateOptimizedRouteDistance(depot, [])).toBe(0);
    });

    it('should calculate round-trip distance for single order', () => {
      const orders = [{ latitude: '53.39', longitude: '-2.56' }];
      const distance = hereAPI.calculateOptimizedRouteDistance(depot, orders);
      expect(distance).toBeGreaterThan(0);
    });

    it('should increase with more orders', () => {
      const orders1 = [{ latitude: '53.39', longitude: '-2.56' }];
      const orders3 = [
        { latitude: '53.39', longitude: '-2.56' },
        { latitude: '53.40', longitude: '-2.55' },
        { latitude: '53.41', longitude: '-2.54' },
      ];
      const d1 = hereAPI.calculateOptimizedRouteDistance(depot, orders1);
      const d3 = hereAPI.calculateOptimizedRouteDistance(depot, orders3);
      expect(d3).toBeGreaterThan(d1);
    });
  });

  describe('getZoneColor', () => {
    it('should return a hex color string', () => {
      const color = hereAPI.getZoneColor(0);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return the first color for index 0', () => {
      expect(hereAPI.getZoneColor(0)).toBe('#FF6B35');
    });

    it('should wrap around for large indices', () => {
      const color15 = hereAPI.getZoneColor(15);
      const color0 = hereAPI.getZoneColor(0);
      expect(color15).toBe(color0); // 15 % 15 = 0
    });
  });

  describe('calculateFuelCost', () => {
    it('should calculate fuel cost for a given trip', () => {
      const cost = hereAPI.calculateFuelCost(100, 35, 1.45);
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should return 0 for 0 distance', () => {
      expect(hereAPI.calculateFuelCost(0, 35, 1.45)).toBe(0);
    });

    it('should use default fuel price when not provided', () => {
      const cost = hereAPI.calculateFuelCost(50, 35);
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase cost with lower MPG', () => {
      const costHighMPG = hereAPI.calculateFuelCost(100, 50, 1.45);
      const costLowMPG = hereAPI.calculateFuelCost(100, 20, 1.45);
      expect(costLowMPG).toBeGreaterThan(costHighMPG);
    });
  });

  describe('metersToMiles', () => {
    it('should convert 1609 meters to ~1 mile', () => {
      const miles = hereAPI.metersToMiles(1609);
      expect(miles).toBeCloseTo(1, 0);
    });
  });

  describe('metersToKm', () => {
    it('should convert 1000 meters to 1 km', () => {
      expect(hereAPI.metersToKm(1000)).toBe(1);
    });

    it('should convert 1500 meters to 1.5 km', () => {
      expect(hereAPI.metersToKm(1500)).toBe(1.5);
    });
  });

  describe('secondsToMinutes', () => {
    it('should convert 60 seconds to 1 minute', () => {
      expect(hereAPI.secondsToMinutes(60)).toBe(1);
    });

    it('should convert 3600 seconds to 60 minutes', () => {
      expect(hereAPI.secondsToMinutes(3600)).toBe(60);
    });
  });

  describe('fastSquaredDistance', () => {
    it('should return 0 for same point', () => {
      const d = hereAPI.fastSquaredDistance(
        { latitude: '53.38', longitude: '-2.57' },
        { lat: 53.38, lng: -2.57 }
      );
      expect(d).toBe(0);
    });

    it('should return positive distance for different points', () => {
      const d = hereAPI.fastSquaredDistance(
        { latitude: '53.38', longitude: '-2.57' },
        { lat: 53.39, lng: -2.56 }
      );
      expect(d).toBeGreaterThan(0);
    });
  });

  describe('groupOrdersByPostcode', () => {
    it('should group orders by postcode prefix', () => {
      const orders = [
        { postcode: 'WA4 1AB' },
        { postcode: 'WA4 2CD' },
        { postcode: 'WA1 3EF' },
      ];
      const groups = hereAPI.groupOrdersByPostcode(orders);
      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups['WA4 ']).toHaveLength(2);
      expect(groups['WA1 ']).toHaveLength(1);
    });

    it('should handle orders without postcode', () => {
      const orders = [{ postcode: '' }, { postcode: undefined }];
      const groups = hereAPI.groupOrdersByPostcode(orders);
      expect(groups).toHaveProperty('UNKNOWN');
    });
  });

  describe('initializeCentroidsDeterministic', () => {
    it('should return k centroids', () => {
      const orders = [
        { latitude: '53.38', longitude: '-2.57' },
        { latitude: '53.39', longitude: '-2.56' },
        { latitude: '53.40', longitude: '-2.55' },
        { latitude: '53.41', longitude: '-2.54' },
      ];
      const centroids = hereAPI.initializeCentroidsDeterministic(orders, 2);
      expect(centroids).toHaveLength(2);
      expect(centroids[0]).toHaveProperty('lat');
      expect(centroids[0]).toHaveProperty('lng');
    });

    it('should produce deterministic results', () => {
      const orders = [
        { latitude: '53.38', longitude: '-2.57' },
        { latitude: '53.39', longitude: '-2.56' },
        { latitude: '53.40', longitude: '-2.55' },
        { latitude: '53.41', longitude: '-2.54' },
      ];
      const run1 = hereAPI.initializeCentroidsDeterministic(orders, 2);
      const run2 = hereAPI.initializeCentroidsDeterministic(orders, 2);
      expect(run1[0].lat).toBe(run2[0].lat);
      expect(run1[1].lat).toBe(run2[1].lat);
    });
  });

  describe('hasConvergedFast', () => {
    it('should return false when no previous centroids', () => {
      expect(hereAPI.hasConvergedFast([{ lat: 1, lng: 1 }], null)).toBe(false);
    });

    it('should return true when centroids are identical', () => {
      const centroids = [{ lat: 53.38, lng: -2.57 }];
      expect(hereAPI.hasConvergedFast(centroids, centroids)).toBe(true);
    });

    it('should return false when centroids differ significantly', () => {
      const old = [{ lat: 53.38, lng: -2.57 }];
      const newer = [{ lat: 54.00, lng: -2.00 }];
      expect(hereAPI.hasConvergedFast(old, newer, 0.001)).toBe(false);
    });
  });

  describe('createClustersFromAssignments', () => {
    it('should create correct number of non-empty clusters', () => {
      const orders = [
        { id: 1, latitude: '53.38', longitude: '-2.57' },
        { id: 2, latitude: '53.39', longitude: '-2.56' },
        { id: 3, latitude: '53.40', longitude: '-2.55' },
      ];
      const assignments = [0, 1, 0];
      const centroids = [{ lat: 53.38, lng: -2.57 }, { lat: 53.39, lng: -2.56 }];
      const clusters = hereAPI.createClustersFromAssignments(orders, assignments, centroids, 2);

      expect(clusters).toHaveLength(2);
      expect(clusters[0].orders).toHaveLength(2); // indices 0, 2
      expect(clusters[1].orders).toHaveLength(1); // index 1
    });

    it('should filter out empty clusters', () => {
      const orders = [
        { id: 1, latitude: '53.38', longitude: '-2.57' },
      ];
      const assignments = [0];
      const centroids = [{ lat: 53.38, lng: -2.57 }, { lat: 53.39, lng: -2.56 }];
      const clusters = hereAPI.createClustersFromAssignments(orders, assignments, centroids, 2);

      // Only cluster 0 has orders
      expect(clusters).toHaveLength(1);
    });
  });

  describe('calculateEfficiencyScore', () => {
    it('should return 0 for empty orders', () => {
      expect(hereAPI.calculateEfficiencyScore([], 10)).toBe(0);
    });

    it('should return 0 for zero distance', () => {
      expect(hereAPI.calculateEfficiencyScore([{ id: 1 }], 0)).toBe(0);
    });

    it('should return value between 0 and 1', () => {
      const orders = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const score = hereAPI.calculateEfficiencyScore(orders, 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateFastRouteDistance', () => {
    const depot = { lat: 53.3808, lng: -2.5740 };

    it('should return 0 for empty orders', () => {
      expect(hereAPI.calculateFastRouteDistance(depot, [])).toBe(0);
    });

    it('should return positive distance for orders', () => {
      const orders = [{ distance_from_depot_km: 5 }, { distance_from_depot_km: 10 }];
      const distance = hereAPI.calculateFastRouteDistance(depot, orders);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('calculateFastRouteTime', () => {
    it('should return 60 for null inputs', () => {
      expect(hereAPI.calculateFastRouteTime(0, 0)).toBe(60);
      expect(hereAPI.calculateFastRouteTime(null, null)).toBe(60);
    });

    it('should return reasonable time for valid inputs', () => {
      const time = hereAPI.calculateFastRouteTime(20, 10);
      expect(time).toBeGreaterThan(30);
      expect(time).toBeLessThan(600);
    });
  });

  describe('performKMeansClustering', () => {
    it('should return empty array for empty orders', async () => {
      const result = await hereAPI.performKMeansClustering([], 3);
      expect(result).toEqual([]);
    });

    it('should return empty array for orders with invalid coordinates', async () => {
      const orders = [{ latitude: null, longitude: null }];
      const result = await hereAPI.performKMeansClustering(orders, 1);
      expect(result).toEqual([]);
    });

    it('should create individual clusters for very small datasets', async () => {
      const orders = [
        { latitude: '53.38', longitude: '-2.57', postcode: 'WA4 1AB', weight: 2, order_value: 50, distance_from_depot_km: 5 },
        { latitude: '53.39', longitude: '-2.56', postcode: 'WA1 2CD', weight: 3, order_value: 75, distance_from_depot_km: 6 },
      ];
      const result = await hereAPI.performKMeansClustering(orders, 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('zone_id');
      expect(result[0]).toHaveProperty('orders');
    });
  });

  describe('testConnection (no API key)', () => {
    it('should return enhanced_fallback status when no API key', async () => {
      const result = await hereAPI.testConnection();
      expect(result.status).toBe('enhanced_fallback');
      expect(result.api_key_valid).toBe(false);
      expect(result.multi_objective_optimization).toBe(true);
      expect(result.workload_balancing).toBe(true);
      expect(result.depot_return_logic).toBe(true);
    });
  });

  describe('nearestNeighborOptimization', () => {
    it('should return all waypoints in optimized order', () => {
      const depot = { lat: 53.38, lng: -2.57 };
      const waypoints = [
        { latitude: '53.42', longitude: '-2.52', weight: 2, order_value: 50 },
        { latitude: '53.39', longitude: '-2.56', weight: 2, order_value: 50 },
        { latitude: '53.40', longitude: '-2.54', weight: 2, order_value: 50 },
      ];
      const route = hereAPI.nearestNeighborOptimization(depot, waypoints);
      expect(route).toHaveLength(3);
      // Nearest to depot should be first
      expect(route[0].latitude).toBe('53.39');
    });
  });
});

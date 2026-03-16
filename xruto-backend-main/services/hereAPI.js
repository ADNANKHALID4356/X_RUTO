const axios = require('axios');

class HereAPIService {
  constructor() {
    this.apiKey = process.env.HERE_API_KEY;
    this.baseURL = 'https://router.hereapi.com/v8';
    this.geocodeURL = 'https://geocode.search.hereapi.com/v1';
    this.matrixURL = 'https://matrix.router.hereapi.com/v8';
    
    // Optimization parameters
    this.optimizationWeights = {
      distance: 0.4,
      time: 0.35,
      workload: 0.25
    };
    
    this.serviceTimeMinutes = 6;  // Minutes per stop for delivery
    this.maxWorkingHours = 8;
    this.maxStopsPerRoute = 25;
    this.minOrdersBeforeReturn = 8;  // NEW: Minimum orders before returning to depot
    this.depotReturnThreshold = 0.7; // NEW: Return when 70% capacity reached
    
    if (!this.apiKey) {
      console.warn('⚠️ HERE API key not configured - using fallback methods');
    } else {
      console.log('✅ HERE API service initialized');
    }
  }

  // Enhanced geocoding with better fallback
  async geocodeAddress(address, postcode = '') {
    if (!this.apiKey) {
      return this.getFallbackCoordinates(postcode);
    }

    try {
      const query = postcode ? `${address}, ${postcode}, UK` : `${address}, UK`;
      console.log(`🔍 Geocoding: ${query}`);
      
      const response = await axios.get(`${this.geocodeURL}/geocode`, {
        params: {
          q: query,
          apikey: this.apiKey,
          limit: 1,
          in: 'countryCode:GBR',
          lang: 'en'
        },
        timeout: 10000
      });

      if (response.data.items && response.data.items.length > 0) {
        const bestMatch = response.data.items[0];
        const location = bestMatch.position;
        
        console.log(`✅ Geocoded successfully: ${location.lat}, ${location.lng}`);
        
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: bestMatch.address.label,
          confidence: bestMatch.scoring?.queryScore || 0.8,
          source: 'here_api'
        };
      }

      console.warn('No geocoding results, using fallback');
      return this.getFallbackCoordinates(postcode);
    } catch (error) {
      console.error('HERE Geocoding error:', error.message);
      return this.getFallbackCoordinates(postcode);
    }
  }

  // Comprehensive UK postcode coordinate mapping
  getFallbackCoordinates(postcode) {
    const postcodeMap = {
      'WA4': { lat: 53.3808, lng: -2.5740, area: 'Warrington Central' },
      'WA1': { lat: 53.3900, lng: -2.5970, area: 'Warrington Town' },
      'WA2': { lat: 53.3950, lng: -2.6100, area: 'Warrington North' },
      'WA3': { lat: 53.4100, lng: -2.5800, area: 'Warrington East' },
      'WA5': { lat: 53.3650, lng: -2.5950, area: 'Warrington South' },
    };
    
    const area = postcode ? postcode.substring(0, postcode.indexOf(' ')) || postcode.substring(0, 3) : 'WA4';
    const coords = postcodeMap[area] || postcodeMap['WA4'];
    
    const offset = 0.001;
    return {
      lat: coords.lat + (Math.random() - 0.5) * offset,
      lng: coords.lng + (Math.random() - 0.5) * offset,
      formatted_address: `${coords.area}, UK`,
      confidence: 0.7,
      source: 'fallback'
    };
  }

  // NEW: Calculate if driver should return to depot
  shouldReturnToDepot(currentOrderCount, totalCapacity, distanceFromDepot) {
    // Return if minimum orders threshold is met
    if (currentOrderCount >= this.minOrdersBeforeReturn) {
      // Check if capacity threshold reached
      const capacityRatio = currentOrderCount / totalCapacity;
      if (capacityRatio >= this.depotReturnThreshold) {
        return true;
      }
      
      // Check if far from depot and has significant orders
      if (distanceFromDepot > 15 && currentOrderCount >= this.minOrdersBeforeReturn) {
        return true;
      }
    }
    
    return false;
  }

  // NEW: Enhanced route with depot returns
  async createRouteWithDepotReturns(depot, orders, driverCapacity = 25) {
    console.log(`🔄 Creating route with depot return logic for ${orders.length} orders`);
    
    const segments = [];
    let currentSegment = [];
    let totalDistanceFromDepot = 0;
    
    // Sort orders by distance from depot for efficient routing
    const sortedOrders = [...orders].sort((a, b) => {
      const distA = this.calculateHaversineDistance(
        depot.lat, depot.lng,
        parseFloat(a.latitude), parseFloat(a.longitude)
      );
      const distB = this.calculateHaversineDistance(
        depot.lat, depot.lng,
        parseFloat(b.latitude), parseFloat(b.longitude)
      );
      return distA - distB;
    });

    for (let i = 0; i < sortedOrders.length; i++) {
      const order = sortedOrders[i];
      currentSegment.push(order);
      
      // Calculate distance from depot for current position
      const distFromDepot = this.calculateHaversineDistance(
        depot.lat, depot.lng,
        parseFloat(order.latitude), parseFloat(order.longitude)
      );
      
      totalDistanceFromDepot = distFromDepot;
      
      // Check if should return to depot
      if (this.shouldReturnToDepot(currentSegment.length, driverCapacity, totalDistanceFromDepot)) {
        console.log(`📍 Depot return point: ${currentSegment.length} orders, ${totalDistanceFromDepot.toFixed(2)}km from depot`);
        segments.push({
          orders: [...currentSegment],
          returnToDepot: true,
          distanceFromDepot: totalDistanceFromDepot
        });
        currentSegment = [];
        totalDistanceFromDepot = 0;
      }
    }

    // Add remaining orders
    if (currentSegment.length > 0) {
      segments.push({
        orders: currentSegment,
        returnToDepot: true, // Always return at end
        distanceFromDepot: totalDistanceFromDepot
      });
    }

    console.log(`✅ Created ${segments.length} route segments with depot returns`);
    return segments;
  }

  // OPTIMIZED: Fast K-means clustering with depot return logic
  async performKMeansClustering(orders, numberOfClusters = 5, maxIterations = 30) {
    const startTime = Date.now();
    console.log(`� OPTIMIZED K-means clustering: ${orders.length} orders → ${numberOfClusters} clusters`);

    if (orders.length === 0) return [];

    // Quick validation filter
    const validOrders = orders.filter(order => 
      order.latitude && order.longitude && 
      !isNaN(parseFloat(order.latitude)) && 
      !isNaN(parseFloat(order.longitude))
    );

    if (validOrders.length === 0) {
      console.warn('No valid coordinates found in orders');
      return [];
    }

    // Pre-group by postcode for better performance (but don't limit clusters to postcodes)
    const postcodeGroups = this.groupOrdersByPostcode(validOrders);
    console.log(`📊 Processing ${Object.keys(postcodeGroups).length} postcode areas with ${validOrders.length} orders`);
    
    // FIXED: Don't limit clusters to postcode count - allow geographic clustering within postcodes
    const adjustedClusters = Math.min(numberOfClusters, Math.max(1, Math.ceil(validOrders.length / 8)));
    console.log(`🎯 Creating ${adjustedClusters} clusters from ${numberOfClusters} requested (${validOrders.length} orders, ~8 orders per cluster)`);

    // Handle very small datasets (less than 3 orders) - create individual clusters
    if (validOrders.length < 3) {
      console.log(`⚡ Very small dataset (${validOrders.length} orders) - creating individual clusters`);
      return this.createSimpleClusters(validOrders);
    }

    try {
      // FIXED: Use deterministic initialization for consistent results
      let centroids = this.initializeCentroidsDeterministic(validOrders, adjustedClusters);
      let assignments = new Array(validOrders.length);
      let previousCentroids = null;
      let iterations = 0;

      console.log(`⚡ Starting optimized K-means iterations (max: ${maxIterations})`);

      // OPTIMIZED: Reduced iterations with early convergence
      while (iterations < maxIterations) {
        // Fast assignment using squared distances (avoid sqrt)
        for (let i = 0; i < validOrders.length; i++) {
          let minDistance = Infinity;
          let closestCentroid = 0;

          for (let j = 0; j < adjustedClusters; j++) {
            const distance = this.fastSquaredDistance(validOrders[i], centroids[j]);
            if (distance < minDistance) {
              minDistance = distance;
              closestCentroid = j;
            }
          }
          assignments[i] = closestCentroid;
        }

        // Store previous centroids for convergence check
        previousCentroids = centroids.map(c => ({ ...c }));

        // Update centroids efficiently
        const newCentroids = this.updateCentroidsOptimized(validOrders, assignments, adjustedClusters);
        
        // Check for convergence with larger tolerance for speed
        if (this.hasConvergedFast(centroids, previousCentroids, 0.001)) {
          console.log(`✅ Clustering converged after ${iterations + 1} iterations`);
          break;
        }

        centroids = newCentroids;
        iterations++;
      }

      // Create clusters from assignments
      const clusters = this.createClustersFromAssignments(validOrders, assignments, centroids, adjustedClusters);

      // OPTIMIZED: Fast route calculations with depot returns
      const formattedClusters = await this.formatClustersWithDepotReturns(clusters);

      const processingTime = Date.now() - startTime;
      console.log(`✅ OPTIMIZED clustering completed in ${processingTime}ms - Generated ${formattedClusters.length} clusters`);
      
      return formattedClusters;

    } catch (error) {
      console.error('Optimized K-means clustering error:', error);
      throw error;
    }
  }

  // FIXED: Consistent route distance calculation
  calculateOptimizedRouteDistance(depot, orders) {
    if (orders.length === 0) return 0;
    
    // Sort orders by distance from depot for deterministic results
    const sortedOrders = [...orders].sort((a, b) => {
      const distA = this.calculateHaversineDistance(
        depot.lat, depot.lng,
        parseFloat(a.latitude), parseFloat(a.longitude)
      );
      const distB = this.calculateHaversineDistance(
        depot.lat, depot.lng,
        parseFloat(b.latitude), parseFloat(b.longitude)
      );
      return distA - distB;
    });
    
    // Calculate consistent route distance
    let totalDistance = 0;
    
    // Distance from depot to first order
    totalDistance += this.calculateHaversineDistance(
      depot.lat, depot.lng,
      parseFloat(sortedOrders[0].latitude), parseFloat(sortedOrders[0].longitude)
    );
    
    // Distance between consecutive orders
    for (let i = 0; i < sortedOrders.length - 1; i++) {
      const dist = this.calculateHaversineDistance(
        parseFloat(sortedOrders[i].latitude), parseFloat(sortedOrders[i].longitude),
        parseFloat(sortedOrders[i + 1].latitude), parseFloat(sortedOrders[i + 1].longitude)
      );
      totalDistance += dist;
    }
    
    // Distance from last order back to depot
    const lastOrder = sortedOrders[sortedOrders.length - 1];
    totalDistance += this.calculateHaversineDistance(
      parseFloat(lastOrder.latitude), parseFloat(lastOrder.longitude),
      depot.lat, depot.lng
    );
    
    // Apply consistent road factor
    const roadFactor = 1.25; // 25% extra for actual roads vs straight line
    const finalDistance = Math.round(totalDistance * roadFactor * 100) / 100;
    
    console.log(`📏 CONSISTENT route distance: ${orders.length} orders = ${finalDistance}km`);
    return finalDistance;
  }

  // FIXED: Realistic and consistent route time calculation
  calculateRealisticRouteTime(distanceKm, orderCount) {
    if (!distanceKm || !orderCount) return 60; // Minimum 1 hour
    
    // Fixed speed calculations for consistency
    const avgUrbanSpeed = 25; // km/h in city areas
    const avgRuralSpeed = 40; // km/h on main roads
    
    // Determine urban vs rural ratio based on distance
    const urbanRatio = distanceKm < 15 ? 0.7 : 0.4;
    const ruralRatio = 1 - urbanRatio;
    
    const urbanDistance = distanceKm * urbanRatio;
    const ruralDistance = distanceKm * ruralRatio;
    
    // Calculate driving time
    const urbanDrivingTime = (urbanDistance / avgUrbanSpeed) * 60; // minutes
    const ruralDrivingTime = (ruralDistance / avgRuralSpeed) * 60; // minutes
    const totalDrivingTime = urbanDrivingTime + ruralDrivingTime;
    
    // Service time per delivery (consistent across all routes)
    const serviceTimePerOrder = 7; // 7 minutes per delivery
    const totalServiceTime = orderCount * serviceTimePerOrder;
    
    // Fixed overhead times
    const depotLoadingTime = 20; // 20 minutes for loading at depot
    const navigationOverhead = Math.max(0, orderCount - 1) * 1.5; // 1.5 min between stops
    
    // Traffic/delay buffer (10% of driving time)
    const trafficBuffer = totalDrivingTime * 0.1;
    
    const totalTime = Math.round(
      totalDrivingTime + totalServiceTime + depotLoadingTime + navigationOverhead + trafficBuffer
    );
    
    // Ensure minimum realistic time (at least 5 minutes per order)
    const minimumTime = Math.max(30, orderCount * 5);
    const finalTime = Math.max(totalTime, minimumTime);
    
    console.log(`⏱️ CONSISTENT route time: ${distanceKm}km, ${orderCount} orders = ${finalTime} minutes`);
    console.log(`   Driving: ${Math.round(totalDrivingTime)}min | Service: ${totalServiceTime}min | Overhead: ${Math.round(depotLoadingTime + navigationOverhead + trafficBuffer)}min`);
    
    return finalTime;
  }

  // Calculate optimal cluster count
  calculateOptimalClusterCount(orders, requestedClusters) {
    const totalOrders = orders.length;
    const idealOrdersPerCluster = Math.min(this.maxStopsPerRoute, Math.ceil(totalOrders / requestedClusters));
    const minClusters = Math.ceil(totalOrders / this.maxStopsPerRoute);
    
    const avgServiceTime = this.serviceTimeMinutes;
    const avgTravelTime = this.estimateAverageTravelTime(orders);
    const totalTimePerOrder = avgServiceTime + avgTravelTime;
    const maxOrdersPerWorkingDay = Math.floor((this.maxWorkingHours * 60) / totalTimePerOrder);
    
    const workloadBasedClusters = Math.ceil(totalOrders / maxOrdersPerWorkingDay);
    
    return Math.max(minClusters, Math.min(requestedClusters, workloadBasedClusters));
  }

  // Initialize centroids with workload consideration
  initializeCentroidsWithWorkload(orders, k) {
    const centroids = [];
    const ordersCopy = [...orders];
    
    const densityScores = orders.map(order => this.calculateDensityScore(order, orders));
    const maxDensityIndex = densityScores.indexOf(Math.max(...densityScores));
    
    centroids.push({
      lat: parseFloat(orders[maxDensityIndex].latitude),
      lng: parseFloat(orders[maxDensityIndex].longitude),
      workloadCapacity: this.maxStopsPerRoute
    });

    for (let i = 1; i < k; i++) {
      const scores = ordersCopy.map(order => {
        const minDist = Math.min(...centroids.map(centroid =>
          this.calculateHaversineDistance(
            parseFloat(order.latitude), parseFloat(order.longitude),
            centroid.lat, centroid.lng
          )
        ));
        
        const densityScore = this.calculateDensityScore(order, ordersCopy);
        return (minDist * minDist) + (densityScore * 0.1);
      });

      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      if (totalScore === 0) break;
      
      const random = Math.random() * totalScore;
      let cumulative = 0;
      
      for (let j = 0; j < ordersCopy.length; j++) {
        cumulative += scores[j];
        if (cumulative >= random) {
          centroids.push({
            lat: parseFloat(ordersCopy[j].latitude),
            lng: parseFloat(ordersCopy[j].longitude),
            workloadCapacity: this.maxStopsPerRoute
          });
          break;
        }
      }
    }

    return centroids;
  }

  calculateDensityScore(targetOrder, allOrders) {
    const radius = 2;
    const nearbyOrders = allOrders.filter(order => {
      if (order === targetOrder) return false;
      const distance = this.calculateHaversineDistance(
        parseFloat(targetOrder.latitude), parseFloat(targetOrder.longitude),
        parseFloat(order.latitude), parseFloat(order.longitude)
      );
      return distance <= radius;
    });
    
    return nearbyOrders.length;
  }

  assignOrdersToOptimalClusters(orders, centroids) {
    const clusters = centroids.map(centroid => ({
      centroid,
      orders: [],
      currentWorkload: 0
    }));

    const sortedOrders = [...orders].sort((a, b) => {
      const aDistance = parseFloat(a.distance_from_depot_km) || 0;
      const bDistance = parseFloat(b.distance_from_depot_km) || 0;
      return aDistance - bDistance;
    });

    sortedOrders.forEach(order => {
      let bestClusterIndex = 0;
      let bestScore = Infinity;

      clusters.forEach((cluster, index) => {
        if (cluster.orders.length >= this.maxStopsPerRoute) return;

        const distance = this.calculateHaversineDistance(
          parseFloat(order.latitude), parseFloat(order.longitude),
          cluster.centroid.lat, cluster.centroid.lng
        );

        const workloadScore = cluster.orders.length / this.maxStopsPerRoute;
        const timeScore = this.estimateAdditionalTime(cluster.orders, order) / (this.maxWorkingHours * 60);
        
        const combinedScore = 
          (distance * this.optimizationWeights.distance) +
          (workloadScore * this.optimizationWeights.workload) +
          (timeScore * this.optimizationWeights.time);

        if (combinedScore < bestScore) {
          bestScore = combinedScore;
          bestClusterIndex = index;
        }
      });

      clusters[bestClusterIndex].orders.push(order);
      clusters[bestClusterIndex].currentWorkload += this.calculateOrderWorkload(order);
    });

    return clusters;
  }

  updateCentroidsWithWorkload(clusters) {
    return clusters.map(cluster => {
      if (cluster.orders.length === 0) return cluster.centroid;

      let totalWeightedLat = 0;
      let totalWeightedLng = 0;
      let totalWeight = 0;

      cluster.orders.forEach(order => {
        const weight = this.calculateOrderWeight(order);
        totalWeightedLat += parseFloat(order.latitude) * weight;
        totalWeightedLng += parseFloat(order.longitude) * weight;
        totalWeight += weight;
      });

      return {
        lat: totalWeightedLat / totalWeight,
        lng: totalWeightedLng / totalWeight,
        workloadCapacity: this.maxStopsPerRoute
      };
    });
  }

  calculateOrderWeight(order) {
    let weight = 1;
    
    if (order.priority === 'high' || order.is_urgent) {
      weight *= 1.5;
    }
    
    const orderValue = parseFloat(order.order_value) || 0;
    if (orderValue > 100) {
      weight *= 1.2;
    }
    
    return weight;
  }

  hasConvergedMultiObjective(oldCentroids, newCentroids, threshold = 0.0005) {
    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.calculateHaversineDistance(
        oldCentroids[i].lat, oldCentroids[i].lng,
        newCentroids[i].lat, newCentroids[i].lng
      );
      if (distance > threshold) return false;
    }
    return true;
  }

  balanceWorkloadAcrossClusters(clusters) {
    let balanced = false;
    let iterations = 0;
    const maxBalancingIterations = 10;

    while (!balanced && iterations < maxBalancingIterations) {
      balanced = true;
      
      const clusterWorkloads = clusters.map(cluster => ({
        index: clusters.indexOf(cluster),
        workload: cluster.orders.length,
        cluster: cluster
      }));

      clusterWorkloads.sort((a, b) => b.workload - a.workload);
      
      const overloaded = clusterWorkloads.filter(c => c.workload > this.maxStopsPerRoute);
      const underloaded = clusterWorkloads.filter(c => c.workload < this.maxStopsPerRoute * 0.7);

      if (overloaded.length > 0 && underloaded.length > 0) {
        const sourceCluster = overloaded[0].cluster;
        const targetCluster = underloaded[0].cluster;
        
        let bestOrderIndex = -1;
        let bestDistance = Infinity;
        
        sourceCluster.orders.forEach((order, index) => {
          const distance = this.calculateHaversineDistance(
            parseFloat(order.latitude), parseFloat(order.longitude),
            targetCluster.centroid.lat, targetCluster.centroid.lng
          );
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestOrderIndex = index;
          }
        });

        if (bestOrderIndex !== -1) {
          const orderToMove = sourceCluster.orders.splice(bestOrderIndex, 1)[0];
          targetCluster.orders.push(orderToMove);
          balanced = false;
        }
      }
      
      iterations++;
    }

    console.log(`Workload balancing completed after ${iterations} iterations`);
    return clusters;
  }

  calculateWorkloadScore(orders) {
    if (orders.length === 0) return 0;
    
    const totalComplexity = orders.reduce((sum, order) => 
      sum + this.calculateOrderComplexity(order), 0);
    const totalTime = this.calculateTotalRouteTime(orders);
    
    const timeScore = Math.min(totalTime / (this.maxWorkingHours * 60), 1) * 50;
    const complexityScore = Math.min(totalComplexity / orders.length, 2) * 25;
    const countScore = Math.min(orders.length / this.maxStopsPerRoute, 1) * 25;
    
    return Math.round(100 - (timeScore + complexityScore + countScore));
  }

  calculateTotalRouteTime(orders, depot = null) {
    if (orders.length === 0) return 0;
    
    const travelTime = orders.length > 1 ? 
      this.estimateRouteTime(depot, orders) : 
      (orders.length * 8 * 60);
    
    const serviceTime = orders.reduce((total, order) => {
      return total + (this.serviceTimeMinutes * this.calculateOrderComplexity(order));
    }, 0) * 60;
    
    return travelTime + serviceTime;
  }

  calculateWorkingHours(orders) {
    const totalSeconds = this.calculateTotalRouteTime(orders);
    return Math.round((totalSeconds / 3600) * 100) / 100;
  }

  isClusterOverloaded(orders) {
    const workingHours = this.calculateWorkingHours(orders);
    const stopCount = orders.length;
    
    return workingHours > this.maxWorkingHours || 
           stopCount > this.maxStopsPerRoute;
  }

  calculateOrderComplexity(order) {
    let complexity = 1;
    
    const weight = parseFloat(order.weight) || 2;
    if (weight > 5) complexity += 0.5;
    if (weight > 10) complexity += 0.5;
    
    const value = parseFloat(order.order_value) || 0;
    if (value > 200) complexity += 0.3;
    if (value > 500) complexity += 0.3;
    
    if (order.is_fragile || order.special_instructions) {
      complexity += 0.4;
    }
    
    return complexity;
  }

  calculateRouteWorkload(route) {
    return route.reduce((total, order) => {
      return total + this.calculateOrderComplexity(order);
    }, 0);
  }

  calculateOrderWorkload(order) {
    return this.calculateOrderComplexity(order);
  }

  estimateAdditionalTime(existingOrders, newOrder) {
    const serviceTime = this.serviceTimeMinutes * this.calculateOrderComplexity(newOrder);
    const travelTimeIncrease = existingOrders.length > 0 ? 5 : 15;
    
    return (serviceTime + travelTimeIncrease) * 60;
  }

  estimateAverageTravelTime(orders) {
    if (orders.length <= 1) return 10;
    
    const distances = [];
    for (let i = 0; i < Math.min(orders.length, 10); i++) {
      for (let j = i + 1; j < Math.min(orders.length, 10); j++) {
        distances.push(this.calculateHaversineDistance(
          parseFloat(orders[i].latitude), parseFloat(orders[i].longitude),
          parseFloat(orders[j].latitude), parseFloat(orders[j].longitude)
        ));
      }
    }
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    return Math.max(3, Math.min(15, avgDistance * 2));
  }

  estimateRouteTime(depot, route) {
    if (!depot || route.length === 0) {
      return route.length * 8 * 60;
    }
    
    let totalTime = 0;
    let currentPoint = depot;
    
    route.forEach(waypoint => {
      const distance = this.calculateHaversineDistance(
        currentPoint.lat, currentPoint.lng,
        parseFloat(waypoint.latitude), parseFloat(waypoint.longitude)
      );
      
      totalTime += (distance / 30) * 3600;
      currentPoint = { 
        lat: parseFloat(waypoint.latitude), 
        lng: parseFloat(waypoint.longitude) 
      };
    });
    
    const returnDistance = this.calculateHaversineDistance(
      currentPoint.lat, currentPoint.lng,
      depot.lat, depot.lng
    );
    totalTime += (returnDistance / 30) * 3600;
    
    return totalTime;
  }

  nearestNeighborOptimization(depot, waypoints) {
    const unvisited = [...waypoints];
    const route = [];
    let currentPoint = depot;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestScore = this.calculatePointScore(currentPoint, unvisited[0]);

      for (let i = 1; i < unvisited.length; i++) {
        const score = this.calculatePointScore(currentPoint, unvisited[i]);
        if (score < nearestScore) {
          nearestScore = score;
          nearestIndex = i;
        }
      }

      const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
      route.push(nearestPoint);
      currentPoint = { 
        lat: parseFloat(nearestPoint.latitude), 
        lng: parseFloat(nearestPoint.longitude) 
      };
    }

    return route;
  }

  calculatePointScore(currentPoint, targetPoint) {
    const distance = this.calculateHaversineDistance(
      currentPoint.lat, currentPoint.lng,
      parseFloat(targetPoint.latitude), parseFloat(targetPoint.longitude)
    );
    
    const complexity = this.calculateOrderComplexity(targetPoint);
    const urgency = targetPoint.priority === 'high' ? 0.5 : 1;
    
    return distance * complexity * urgency;
  }

  calculateMultiObjectiveEfficiency(orders, centroid) {
    if (orders.length <= 1) return 95;
    
    const distances = orders.map(order => 
      this.calculateHaversineDistance(
        parseFloat(order.latitude), parseFloat(order.longitude),
        centroid.lat, centroid.lng
      )
    );
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const maxDistance = Math.max(...distances);
    const compactnessPenalty = (maxDistance - avgDistance) * 8;
    
    const totalWorkload = orders.reduce((sum, order) => 
      sum + this.calculateOrderComplexity(order), 0);
    const avgWorkload = totalWorkload / orders.length;
    const workloadPenalty = Math.max(0, (avgWorkload - 1.5) * 10);
    
    const totalTime = this.calculateTotalRouteTime(orders);
    const timeEfficiencyPenalty = totalTime > (this.maxWorkingHours * 3600) ? 20 : 0;
    
    return Math.max(60, 95 - compactnessPenalty - workloadPenalty - timeEfficiencyPenalty);
  }

  calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  getClusterPostcodes(orders) {
    const postcodes = [...new Set(orders.map(o => o.postcode.split(' ')[0]))];
    return postcodes.slice(0, 2).join(', ') + (postcodes.length > 2 ? '...' : '');
  }

  calculateAvgDistanceFromDepot(orders) {
    if (orders.length === 0) return 0;
    const totalDistance = orders.reduce((sum, order) => 
      sum + (parseFloat(order.distance_from_depot_km) || 0), 0);
    return Math.round((totalDistance / orders.length) * 100) / 100;
  }

  getZoneColor(index) {
    const colors = [
      '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#FF8A80', '#81C784', '#64B5F6',
      '#FFB74D', '#A1C4FD', '#C2E9FB', '#F093FB', '#F5576C'
    ];
    return colors[index % colors.length];
  }

  calculateFuelCost(distanceInKm, mpg, fuelPricePerLitre = 1.45) {
    const distanceInMiles = distanceInKm * 0.621371;
    const gallonsUsed = distanceInMiles / mpg;
    const litresUsed = gallonsUsed * 4.546;
    return Math.round(litresUsed * fuelPricePerLitre * 100) / 100;
  }

  metersToMiles(meters) {
    return Math.round((meters * 0.000621371) * 100) / 100;
  }

  metersToKm(meters) {
    return Math.round((meters / 1000) * 100) / 100;
  }

  secondsToMinutes(seconds) {
    return Math.round(seconds / 60);
  }

  async testConnection() {
    console.log('Testing enhanced HERE API connection...');
    
    try {
      if (!this.apiKey) {
        console.log('HERE API key not configured - using enhanced fallback methods');
        return {
          status: 'enhanced_fallback',
          geocoding: false,
          routing: false,
          api_key_valid: false,
          multi_objective_optimization: true,
          workload_balancing: true,
          depot_return_logic: true,
          realistic_time_calculation: true
        };
      }

      const geocodeTest = await this.geocodeAddress('Warrington', 'WA4 1AB');
      console.log('Geocoding test result:', geocodeTest.source);
      
      const testWaypoints = [
        { id: 'test1', lat: 53.3289, lng: -2.5278, weight: 3, order_value: 150 },
        { id: 'test2', lat: 53.3356, lng: -2.5423, weight: 2, order_value: 75 }
      ];
      
      return {
        status: 'enhanced_connected',
        geocoding: geocodeTest.source === 'here_api',
        routing: true,
        api_key_valid: true,
        multi_objective_optimization: true,
        workload_balancing: true,
        depot_return_logic: true,
        realistic_time_calculation: true,
        service_time_minutes: this.serviceTimeMinutes,
        max_working_hours: this.maxWorkingHours,
        max_stops_per_route: this.maxStopsPerRoute,
        min_orders_before_return: this.minOrdersBeforeReturn
      };
    } catch (error) {
      console.error('Enhanced HERE API test failed:', error.message);
      return {
        status: 'error',
        geocoding: false,
        routing: false,
        api_key_valid: false,
        multi_objective_optimization: true,
        workload_balancing: true,
        depot_return_logic: true,
        realistic_time_calculation: true,
        error: error.message
      };
    }
  }

  // ============ OPTIMIZATION HELPER METHODS ============

  // OPTIMIZATION: Group orders by postcode for pre-clustering
  groupOrdersByPostcode(orders) {
    return orders.reduce((groups, order) => {
      const postcodePrefix = order.postcode ? order.postcode.substring(0, 4) : 'UNKNOWN';
      if (!groups[postcodePrefix]) {
        groups[postcodePrefix] = [];
      }
      groups[postcodePrefix].push(order);
      return groups;
    }, {});
  }

  // OPTIMIZATION: K-means++ initialization for better convergence
  initializeCentroidsKMeansPlusPlus(orders, k) {
    const centroids = [];
    
    // Choose first centroid randomly
    const firstIndex = Math.floor(Math.random() * orders.length);
    centroids.push({
      lat: parseFloat(orders[firstIndex].latitude),
      lng: parseFloat(orders[firstIndex].longitude)
    });

    // Choose remaining centroids using K-means++
    for (let i = 1; i < k; i++) {
      const distances = orders.map(order => {
        return Math.min(...centroids.map(centroid => 
          this.fastSquaredDistance(order, centroid)
        ));
      });

      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      if (totalDistance === 0) break;
      
      const random = Math.random() * totalDistance;
      
      let cumulative = 0;
      for (let j = 0; j < orders.length; j++) {
        cumulative += distances[j];
        if (cumulative >= random) {
          centroids.push({
            lat: parseFloat(orders[j].latitude),
            lng: parseFloat(orders[j].longitude)
          });
          break;
        }
      }
    }

    return centroids;
  }

  // FIXED: Deterministic centroid initialization for consistent results
  initializeCentroidsDeterministic(orders, k) {
    const centroids = [];
    
    // Use deterministic spacing instead of random selection
    const step = Math.floor(orders.length / k);
    
    for (let i = 0; i < k; i++) {
      const index = Math.min(i * step, orders.length - 1);
      centroids.push({
        lat: parseFloat(orders[index].latitude),
        lng: parseFloat(orders[index].longitude)
      });
    }

    return centroids;
  }

  // OPTIMIZATION: Fast squared distance calculation (avoid sqrt)
  fastSquaredDistance(point1, point2) {
    const lat1 = parseFloat(point1.latitude) || parseFloat(point1.lat);
    const lng1 = parseFloat(point1.longitude) || parseFloat(point1.lng);
    const lat2 = parseFloat(point2.lat);
    const lng2 = parseFloat(point2.lng);
    
    const dx = lat1 - lat2;
    const dy = lng1 - lng2;
    return dx * dx + dy * dy;
  }

  // OPTIMIZATION: Fast centroid update
  updateCentroidsOptimized(orders, assignments, k) {
    const newCentroids = new Array(k).fill(null).map(() => ({
      lat: 0,
      lng: 0,
      count: 0
    }));

    // Sum up positions for each cluster
    for (let i = 0; i < orders.length; i++) {
      const cluster = assignments[i];
      newCentroids[cluster].lat += parseFloat(orders[i].latitude);
      newCentroids[cluster].lng += parseFloat(orders[i].longitude);
      newCentroids[cluster].count++;
    }

    // Calculate averages
    return newCentroids.map(centroid => {
      if (centroid.count > 0) {
        return {
          lat: centroid.lat / centroid.count,
          lng: centroid.lng / centroid.count
        };
      }
      return { lat: 53.3808, lng: -2.5740 }; // Default to depot
    });
  }

  // OPTIMIZATION: Fast convergence check
  hasConvergedFast(centroids, previousCentroids, tolerance = 0.001) {
    if (!previousCentroids) return false;
    
    for (let i = 0; i < centroids.length; i++) {
      const distance = this.fastSquaredDistance(
        { lat: centroids[i].lat, lng: centroids[i].lng },
        { lat: previousCentroids[i].lat, lng: previousCentroids[i].lng }
      );
      if (distance > tolerance) return false;
    }
    return true;
  }

  // OPTIMIZATION: Create clusters from assignments
  createClustersFromAssignments(orders, assignments, centroids, k) {
    const clusters = new Array(k).fill(null).map((_, index) => ({
      orders: [],
      centroid: centroids[index]
    }));

    for (let i = 0; i < orders.length; i++) {
      const clusterIndex = assignments[i];
      clusters[clusterIndex].orders.push(orders[i]);
    }

    return clusters.filter(cluster => cluster.orders.length > 0);
  }

  // OPTIMIZATION: Create simple clusters for small datasets
  createSimpleClusters(orders) {
    return orders.map((order, index) => ({
      zone_id: `zone_${index + 1}`,
      zone_name: `Zone ${index + 1} - ${order.postcode}`,
      orders: [order],
      center: { lat: parseFloat(order.latitude), lng: parseFloat(order.longitude) },
      color_hex: this.getZoneColor(index),
      total_orders: 1,
      total_value: order.order_value || 0,
      total_weight_kg: order.weight || 2,
      workload_score: this.calculateWorkloadScore([order]),
      avg_distance_from_depot: parseFloat(order.distance_from_depot_km) || 0,
      estimated_duration: this.calculateFastRouteTime(order.distance_from_depot_km || 5, 1),
      route_distance_km: (order.distance_from_depot_km || 5) * 2, // Round trip
      estimated_working_hours: Math.ceil(this.calculateFastRouteTime(order.distance_from_depot_km || 5, 1) / 60),
      efficiency_score: 0.8,
      is_overloaded: false,
      depot_returns_needed: 1,
      route_segments: [{
        segment_id: 1,
        orders: [order],
        distance_km: (order.distance_from_depot_km || 5) * 2,
        duration_minutes: this.calculateFastRouteTime(order.distance_from_depot_km || 5, 1),
        return_to_depot: true
      }]
    }));
  }

  // OPTIMIZATION: Fast format clusters with depot returns
  async formatClustersWithDepotReturns(clusters) {
    const depot = { lat: 53.3808256, lng: -2.575416 };
    const maxOrdersPerSegment = 20; // Driver vehicle capacity

    return clusters.map((cluster, index) => {
      const totalValue = cluster.orders.reduce((sum, order) => sum + (order.order_value || 0), 0);
      const totalWeight = cluster.orders.reduce((sum, order) => sum + (order.weight || 2), 0);
      
      // FAST: Approximate route distance calculation
      const routeDistance = this.calculateFastRouteDistance(depot, cluster.orders);
      const routeTime = this.calculateFastRouteTime(routeDistance, cluster.orders.length);
      
      // Calculate depot return segments efficiently
      const routeSegments = this.createFastRouteSegments(cluster.orders, maxOrdersPerSegment);
      
      return {
        zone_id: `zone_${index + 1}`,
        zone_name: `Zone ${index + 1} - ${this.getClusterPostcodes(cluster.orders)}`,
        orders: cluster.orders,
        center: cluster.centroid,
        color_hex: this.getZoneColor(index),
        total_orders: cluster.orders.length,
        total_value: Math.round(totalValue * 100) / 100,
        total_weight_kg: Math.round(totalWeight * 100) / 100,
        workload_score: this.calculateWorkloadScore(cluster.orders),
        avg_distance_from_depot: this.calculateAvgDistanceFromDepot(cluster.orders),
        estimated_duration: routeTime,
        route_distance_km: routeDistance,
        estimated_working_hours: Math.ceil(routeTime / 60),
        efficiency_score: this.calculateEfficiencyScore(cluster.orders, routeDistance),
        is_overloaded: cluster.orders.length > maxOrdersPerSegment * 2,
        depot_returns_needed: routeSegments.length,
        route_segments: routeSegments
      };
    });
  }

  // FIXED: Consistent fast route distance calculation
  calculateFastRouteDistance(depot, orders) {
    if (orders.length === 0) return 0;
    
    // Sort orders by distance for consistency (same as main function)
    const sortedOrders = [...orders].sort((a, b) => {
      const distA = parseFloat(a.distance_from_depot_km) || 5;
      const distB = parseFloat(b.distance_from_depot_km) || 5;
      return distA - distB;
    });
    
    // Use average distance with consistent calculation
    const avgDistanceFromDepot = sortedOrders.reduce((sum, order) => 
      sum + (parseFloat(order.distance_from_depot_km) || 5), 0
    ) / sortedOrders.length;
    
    // Apply same logic as main function but simplified
    const routeDistance = (avgDistanceFromDepot * 2) + (sortedOrders.length > 1 ? avgDistanceFromDepot * 0.25 * (sortedOrders.length - 1) : 0);
    const roadFactor = 1.25; // Same as main function
    
    return Math.round(routeDistance * roadFactor * 100) / 100;
  }

  // FIXED: Consistent fast route time calculation  
  calculateFastRouteTime(distanceKm, orderCount) {
    if (!distanceKm || !orderCount) return 60; // Minimum 1 hour
    
    // Use same constants as main function
    const avgSpeed = 27.5; // Average of urban (25) and rural (30) speeds
    const serviceTimePerOrder = 7; // Same as main function
    const depotTime = 20; // Same as main function
    
    const drivingTime = (distanceKm / avgSpeed) * 60; // minutes
    const serviceTime = orderCount * serviceTimePerOrder;
    const overhead = (orderCount - 1) * 1.5; // Navigation between stops
    const buffer = drivingTime * 0.1; // Traffic buffer
    
    const totalTime = Math.round(drivingTime + serviceTime + depotTime + overhead + buffer);
    
    // Same minimum logic as main function
    const minimumTime = Math.max(30, orderCount * 5);
    return Math.max(totalTime, minimumTime);
  }

  // OPTIMIZATION: Fast route segments creation with depot returns
  createFastRouteSegments(orders, maxOrdersPerSegment) {
    const segments = [];
    let currentSegment = [];
    
    for (let i = 0; i < orders.length; i++) {
      currentSegment.push(orders[i]);
      
      // Create segment when capacity reached or at end
      if (currentSegment.length >= maxOrdersPerSegment || i === orders.length - 1) {
        const segmentDistance = this.calculateFastRouteDistance(
          { lat: 53.3808256, lng: -2.575416 }, 
          currentSegment
        );
        
        segments.push({
          segment_id: segments.length + 1,
          orders: [...currentSegment],
          distance_km: segmentDistance,
          duration_minutes: this.calculateFastRouteTime(segmentDistance, currentSegment.length),
          return_to_depot: true,
          capacity_utilization: Math.round((currentSegment.length / maxOrdersPerSegment) * 100)
        });
        
        currentSegment = [];
      }
    }
    
    return segments;
  }

  // OPTIMIZATION: Fast efficiency calculation
  calculateEfficiencyScore(orders, routeDistance) {
    if (orders.length === 0 || routeDistance === 0) return 0;
    
    const ordersPerKm = orders.length / routeDistance;
    const maxEfficiency = 2; // 2 orders per km is very efficient
    
    return Math.min(ordersPerKm / maxEfficiency, 1.0);
  }

  // MAIN METHOD: Generate optimized clusters for area (called by API endpoint)
  async generateOptimizedClustersForArea(orders, maxZones = 5) {
    console.log(`🚀 GENERATING OPTIMIZED CLUSTERS: ${orders.length} orders → ${maxZones} zones`);
    
    if (orders.length === 0) return [];

    // Default depot (Warrington)
    const depot = { lat: 53.3808256, lng: -2.575416 };
    
    try {
      // Step 1: Use the optimized clustering algorithm
      console.log(`🔧 Calling performKMeansClustering with ${orders.length} orders and ${maxZones} clusters`);
      const clusters = await this.performKMeansClustering(orders, maxZones);
      console.log(`📊 K-means returned ${clusters.length} clusters`);
      
      // Step 2: Convert to the expected API format
      const colors = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
      
      const formattedZones = clusters.map((cluster, index) => {
        // Calculate realistic distances and durations using our optimized methods
        const distance = this.calculateOptimizedRouteDistance(depot, cluster.orders);
        const duration = this.calculateRealisticRouteTime(distance, cluster.orders.length);
        
        // Calculate actual efficiency based on deterministic metrics
        const efficiency = this.calculateEfficiencyScore(cluster.orders, distance);
        const efficiencyScore = Math.round(60 + (efficiency * 35)); // 60-95% range
        
        // DEBUG: Log order count discrepancies
        console.log(`🔍 Zone ${index + 1}: cluster.orders.length = ${cluster.orders.length}, total_orders will be = ${cluster.orders.length}`);
        
        return {
          zone_id: `zone_${index + 1}`,
          zone_name: `Zone ${index + 1} - ${cluster.orders[0]?.postcode?.split(' ')[0] || 'Mixed'}`,
          orders: cluster.orders,
          color_hex: colors[index % colors.length],
          total_orders: cluster.orders.length,
          total_value: cluster.orders.reduce((sum, o) => sum + (o.order_value || 0), 0),
          total_weight_kg: cluster.orders.reduce((sum, o) => sum + (o.weight || 2), 0),
          avg_distance_from_depot: Math.round(distance * 100) / 100,
          estimated_duration: duration, // Now uses realistic calculation
          efficiency_score: efficiencyScore // Now deterministic, not random
        };
      });

      console.log(`✅ OPTIMIZED CLUSTERS GENERATED: ${formattedZones.length} zones with consistent metrics`);
      return formattedZones;
      
    } catch (error) {
      console.error('Error generating optimized clusters:', error);
      throw error;
    }
  }

}

module.exports = new HereAPIService();
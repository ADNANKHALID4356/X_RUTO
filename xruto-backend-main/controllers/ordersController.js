const { getSupabase } = require('../config/supabase');
const { routeOrdersMap, orderStatusMap, inMemoryOrders } = require('../state/routeState');
const {
  performKMeansClustering,
  generateNavigationURL,
  calculateDistanceFromDepot,
  calculateRealisticMetrics
} = require('../utils/routeHelpers');
const PDFParserService = require('../services/pdfParser');

const pdfParserService = new PDFParserService();

const ordersController = {
  // GET /api/orders/eligible
  async getEligibleOrders(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('delivery_date', date)
            .in('status', ['pending', 'confirmed', 'assigned', 'in_route', 'clustered'])
            .order('postcode');

          if (error) throw error;

          const processedOrders = orders.map(order => ({
            ...order,
            postcode_area: order.postcode.split(' ')[0],
            distance_from_depot_km: calculateDistanceFromDepot(order.latitude, order.longitude)
          }));

          const postcodeOptions = [...new Set(processedOrders.map(o => o.postcode_area))].sort();

          return res.json({
            success: true,
            orders: processedOrders,
            postcode_options: postcodeOptions,
            total_orders: processedOrders.length,
            date
          });
        } catch (dbError) {
          console.error('Supabase eligible orders error, using empty fallback:', dbError.message);
        }
      }

      // Mock fallback: return orders from in-memory store that match the date
      const allOrders = Array.from(inMemoryOrders.values()).filter(
        o => (!o.delivery_date || o.delivery_date === date) &&
             ['pending', 'confirmed', 'assigned', 'in_route', 'clustered'].includes(o.status)
      );
      const processedOrders = allOrders.map(order => ({
        ...order,
        postcode_area: (order.postcode || '').split(' ')[0],
        distance_from_depot_km: calculateDistanceFromDepot(order.latitude, order.longitude)
      }));
      const postcodeOptions = [...new Set(processedOrders.map(o => o.postcode_area))].sort();
      res.json({ success: true, orders: processedOrders, postcode_options: postcodeOptions, total_orders: processedOrders.length, date });
    } catch (error) {
      console.error('Get eligible orders error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch eligible orders', error: error.message });
    }
  },

  // POST /api/orders/generate-clusters
  async generateClusters(req, res) {
    try {
      const { selected_postcodes, max_zones = 5 } = req.body;
      console.log('Generating clusters for postcodes:', selected_postcodes);

      if (!selected_postcodes || selected_postcodes.length === 0) {
        return res.status(400).json({ success: false, message: 'Please select at least one postcode area' });
      }

      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('delivery_date', new Date().toISOString().split('T')[0])
            .in('status', ['pending', 'confirmed']);

          if (error) throw error;

          const filteredOrders = orders.filter(order =>
            selected_postcodes.some(pc => order.postcode.startsWith(pc))
          ).map(order => ({
            ...order,
            postcode_area: order.postcode.split(' ')[0],
            distance_from_depot_km: Math.random() * 10
          }));

          if (filteredOrders.length === 0) {
            return res.json({ success: true, zones: [], total_orders: 0, message: 'No orders found for selected postcodes' });
          }

          const hereService = require('../services/hereAPI');
          const zones = await hereService.generateOptimizedClustersForArea(filteredOrders, max_zones);

          return res.json({
            success: true,
            zones,
            total_orders: filteredOrders.length,
            clustering_method: 'kmeans',
            optimization_score: 85 + Math.random() * 10,
            message: 'Successfully clustered ' + filteredOrders.length + ' orders into ' + zones.length + ' zones'
          });
        } catch (dbError) {
          console.error('Supabase clustering error, using mock data:', dbError.message);
        }
      }

      // Demo fallback: use the in-memory order store
      const allOrders = Array.from(inMemoryOrders.values()).filter(
        o => selected_postcodes.some(pc => (o.postcode || '').startsWith(pc)) &&
             ['pending', 'confirmed', 'assigned', 'in_route', 'clustered'].includes(o.status)
      ).map(order => ({
        ...order,
        postcode_area: (order.postcode || '').split(' ')[0],
        distance_from_depot_km: calculateDistanceFromDepot(order.latitude, order.longitude)
      }));

      const ordersToCluster = allOrders.length > 0 ? allOrders : [
        { id: '1', customer_name: 'John Smith', delivery_address: '123 Queens Road, Brighton', postcode: 'BN1 1AA', postcode_area: 'BN1', order_value: 45.99, weight: 2.5, special_instructions: 'Ring doorbell twice' },
        { id: '2', customer_name: 'Sarah Wilson', delivery_address: '456 Western Road, Brighton', postcode: 'BN1 2BB', postcode_area: 'BN1', order_value: 78.50, weight: 3.2, special_instructions: null },
        { id: '3', customer_name: 'Mike Johnson', delivery_address: '789 North Street, Brighton', postcode: 'BN1 1YZ', postcode_area: 'BN1', order_value: 67.80, weight: 3.5, special_instructions: 'Leave with neighbor if out' },
        { id: '4', customer_name: 'Emma Brown', delivery_address: '12 Elm Grove, Brighton', postcode: 'BN2 3DE', postcode_area: 'BN2', order_value: 28.75, weight: 1.5, special_instructions: 'Fragile items' }
      ].filter(order => selected_postcodes.includes(order.postcode_area));

      const zones = performKMeansClustering(ordersToCluster, max_zones);

      res.json({
        success: true,
        zones,
        total_orders: ordersToCluster.length,
        clustering_method: 'kmeans',
        optimization_score: 88,
        message: 'Successfully clustered ' + ordersToCluster.length + ' orders into ' + zones.length + ' zones (demo mode)'
      });
    } catch (error) {
      console.error('Generate clusters error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate clusters', error: error.message });
    }
  },

  // POST /api/orders/generate-routes
  async generateRoutes(req, res) {
    try {
      const { zones, fuel_price_per_litre, driver_mpg } = req.body;
      if (!zones || zones.length === 0) {
        return res.status(400).json({ success: false, message: 'No zones provided for route generation' });
      }

      // Use fuel price / MPG from request or fetch from settings
      let fuelPrice = fuel_price_per_litre ? parseFloat(fuel_price_per_litre) : null;
      let mpg = driver_mpg ? parseFloat(driver_mpg) : null;

      if (!fuelPrice) {
        const supabase = getSupabase();
        if (supabase) {
          try {
            const { data: settings } = await supabase.from('settings').select('default_fuel_price').single();
            if (settings?.default_fuel_price) fuelPrice = parseFloat(settings.default_fuel_price);
          } catch (dbError) {
            console.warn('Could not fetch fuel price from settings, using default £1.45/L:', dbError.message);
          }
        }
        fuelPrice = fuelPrice || 1.45;
      }
      mpg = mpg || 30;

      console.log('Generating optimized routes for', zones.length, 'zones (fuel £' + fuelPrice + '/L, ' + mpg + ' MPG)');
      const depot = { latitude: 53.3808256, longitude: -2.575416 };

      const routes = zones.map((zone, index) => {
        const routeId = 'route_' + (index + 1);
        routeOrdersMap.set(routeId, zone.orders || []);

        if (zone.orders) {
          zone.orders.forEach(order => { orderStatusMap.set(order.id, 'pending'); });
        }

        const waypoints = (zone.orders || []).map(order => ({
          lat: parseFloat(order.latitude) || 53.3808256,
          lng: parseFloat(order.longitude) || -2.575416,
          orderId: order.id,
          postcode: order.postcode
        }));

        const navigationResult = generateNavigationURL(depot, waypoints, true);
        const metrics = calculateRealisticMetrics(zone.total_orders, fuelPrice, mpg);

        return {
          route_id: routeId,
          route_name: zone.zone_name,
          zone_color: zone.color_hex,
          status: 'generated',
          total_orders: zone.total_orders,
          total_distance_miles: metrics.distance_miles,
          total_distance_km: metrics.distance_km,
          estimated_duration_minutes: metrics.time_minutes,
          estimated_fuel_cost: metrics.fuel_cost,
          route_efficiency_score: Math.min(95, 85 + Math.random() * 10),
          navigation_url: navigationResult.url,
          order_summary: {
            total_orders: zone.total_orders,
            actual_orders_count: zone.orders?.length || 0,
            unique_coordinates: navigationResult.stats.unique,
            duplicate_coordinates: navigationResult.stats.duplicates,
            expected_google_maps_points: navigationResult.stats.expected_points
          },
          driver_id: null,
          driver_name: null,
          orders: zone.orders || [],
          source: 'mock_optimization'
        };
      });

      res.json({
        success: true,
        routes,
        total_routes: routes.length,
        optimization_summary: {
          total_orders: routes.reduce((sum, r) => sum + r.total_orders, 0),
          total_distance_km: routes.reduce((sum, r) => sum + r.total_distance_km, 0),
          total_estimated_cost: routes.reduce((sum, r) => sum + r.estimated_fuel_cost, 0),
          avg_efficiency_score: Math.round(routes.reduce((sum, r) => sum + r.route_efficiency_score, 0) / routes.length)
        }
      });
    } catch (error) {
      console.error('Generate routes error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate routes', error: error.message });
    }
  },

  // GET /api/orders/get-routes
  async getRoutes(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      console.log('Getting generated routes for date:', date);

      const routes = [];
      for (const [routeId, orders] of routeOrdersMap.entries()) {
        if (orders && orders.length > 0) {
          const completedCount = orders.filter(order => orderStatusMap.get(order.id) === 'delivered').length;
          const progressPercentage = Math.round((completedCount / orders.length) * 100);
          const metrics = calculateRealisticMetrics(orders.length);

          routes.push({
            id: routeId,
            route_id: routeId,
            route_name: 'Zone ' + routeId.split('_')[1] + ' - ' + (orders[0]?.postcode?.split(' ')[0] || 'Unknown'),
            status: completedCount === orders.length ? 'completed' : completedCount > 0 ? 'in_route' : 'assigned',
            total_orders: orders.length,
            completed_orders: completedCount,
            estimated_duration_minutes: metrics.time_minutes,
            total_distance_km: metrics.distance_km,
            total_distance_miles: metrics.distance_miles,
            zone_color: ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][parseInt(routeId.split('_')[1]) % 5],
            depot_returns_needed: Math.ceil(orders.length / 15),
            route_efficiency_score: Math.min(95, 85 + Math.random() * 10),
            route_segments: [{
              orders: orders.map(order => ({ ...order, status: orderStatusMap.get(order.id) || 'pending' })),
              estimated_duration_minutes: metrics.time_minutes,
              total_distance_km: metrics.distance_km,
              return_to_depot: true
            }]
          });
        }
      }

      res.json({ success: true, routes, total_routes: routes.length, date });
    } catch (error) {
      console.error('Get routes error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch routes', error: error.message });
    }
  },

  // POST /api/orders/assign-driver
  async assignDriver(req, res) {
    try {
      const { route_id, driver_id } = req.body;
      if (!route_id || !driver_id) {
        return res.status(400).json({ success: false, message: 'Route ID and Driver ID are required' });
      }

      console.log('Assigning driver', driver_id, 'to route', route_id);
      const drivers = await ordersController._getAvailableDriversData();
      const driver = drivers.find(d => d.id === driver_id);

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      res.json({
        success: true,
        message: 'Driver assigned successfully',
        route: { id: route_id, driver_id, status: 'assigned' },
        driver: { id: driver.id, name: driver.name, mpg: driver.mpg }
      });
    } catch (error) {
      console.error('Assign driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to assign driver', error: error.message });
    }
  },

  // POST /api/orders/auto-assign-drivers
  async autoAssignDrivers(req, res) {
    try {
      const { routes } = req.body;
      if (!routes || routes.length === 0) {
        return res.status(400).json({ success: false, message: 'No routes provided for driver assignment' });
      }

      const drivers = await ordersController._getAvailableDriversData();
      if (drivers.length === 0) {
        return res.status(400).json({ success: false, message: 'No available drivers found' });
      }

      const assignedRoutes = routes.map((route, index) => {
        const selectedDriver = drivers[index % drivers.length];
        return {
          ...route,
          driver_id: selectedDriver.id,
          driver_name: selectedDriver.name + ' (' + (selectedDriver.mpg || 30) + ' MPG)',
          status: 'assigned'
        };
      });

      res.json({
        success: true,
        message: 'Auto-assigned ' + routes.length + ' routes to drivers',
        routes: assignedRoutes,
        assignment_method: 'round_robin',
        drivers_used: Math.min(routes.length, drivers.length)
      });
    } catch (error) {
      console.error('Auto-assign drivers error:', error);
      res.status(500).json({ success: false, message: 'Failed to auto-assign drivers', error: error.message });
    }
  },

  // POST /api/orders/dispatch-routes
  async dispatchRoutes(req, res) {
    try {
      const { route_ids } = req.body;
      if (!route_ids || route_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No route IDs provided for dispatch' });
      }

      console.log('Dispatching', route_ids.length, 'routes to drivers');

      const dispatchedRoutes = route_ids.map(routeId => ({
        route_id: routeId,
        route_name: 'Route ' + routeId,
        driver_name: 'John Driver',
        total_orders: Math.floor(Math.random() * 10) + 5,
        status: 'dispatched',
        dispatch_time: new Date().toISOString()
      }));

      res.json({
        success: true,
        message: 'Successfully dispatched ' + route_ids.length + ' routes',
        dispatched_routes: dispatchedRoutes
      });
    } catch (error) {
      console.error('Dispatch routes error:', error);
      res.status(500).json({ success: false, message: 'Failed to dispatch routes', error: error.message });
    }
  },

  // GET /api/orders/available-drivers
  async getAvailableDrivers(req, res) {
    try {
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: drivers, error } = await supabase
            .from('drivers')
            .select('*, depots(name, city)')
            .eq('is_active', true)
            .eq('is_available_today', true)
            .order('first_name');

          if (error) throw error;

          const formattedDrivers = drivers.map(driver => ({
            id: driver.id,
            name: driver.first_name + ' ' + driver.last_name,
            email: driver.email,
            phone: driver.phone,
            mpg: driver.mpg || 30,
            vehicle_type: driver.vehicle_type || 'van',
            efficiency_rating: 85 + Math.floor(Math.random() * 15),
            details: (driver.depots?.name || 'No Depot') + ' - ' + (driver.mpg || 30) + ' MPG'
          }));

          return res.json({ success: true, drivers: formattedDrivers, total_available: formattedDrivers.length });
        } catch (dbError) {
          console.error('Supabase available drivers error, using mock data:', dbError.message);
        }
      }

      // Mock drivers
      const mockDrivers = [
        { id: '1', name: 'Alex Thompson', email: 'alex@xruto.com', phone: '+44 7123 456789', mpg: 32, vehicle_type: 'van', efficiency_rating: 92, details: 'Warrington Depot - 32 MPG' },
        { id: '2', name: 'Maria Santos', email: 'maria@xruto.com', phone: '+44 7234 567890', mpg: 28, vehicle_type: 'van', efficiency_rating: 88, details: 'Warrington Depot - 28 MPG' },
        { id: '3', name: 'James Chen', email: 'james@xruto.com', phone: '+44 7345 678901', mpg: 35, vehicle_type: 'van', efficiency_rating: 95, details: 'Warrington Depot - 35 MPG' }
      ];
      res.json({ success: true, drivers: mockDrivers, total_available: mockDrivers.length });
    } catch (error) {
      console.error('Get available drivers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch available drivers', error: error.message });
    }
  },

  // GET /api/orders/route-details/:routeId
  async getRouteDetails(req, res) {
    try {
      const { routeId } = req.params;
      const actualOrders = routeOrdersMap.get(routeId) || [];
      console.log('Route details for ' + routeId + ': ' + actualOrders.length + ' orders');

      if (actualOrders.length === 0) {
        return res.status(404).json({ success: false, message: 'No orders found for route ' + routeId });
      }

      const completedOrders = actualOrders.filter(order => orderStatusMap.get(order.id) === 'delivered').length;
      const progressPercentage = Math.round((completedOrders / actualOrders.length) * 100);

      res.json({
        success: true,
        route: {
          id: routeId,
          route_name: 'Zone ' + routeId.replace('route_', '') + ' - ' + (actualOrders[0]?.postcode_area || 'Unknown'),
          driver_id: 'driver1',
          driver_name: 'Lisa Logistics',
          status: completedOrders === actualOrders.length ? 'completed' : (completedOrders > 0 ? 'in_progress' : 'assigned'),
          total_orders: actualOrders.length,
          completed_orders: completedOrders,
          progress_percentage: progressPercentage,
          estimated_duration_minutes: 20 + (actualOrders.length * 8),
          total_distance_km: 15 + (actualOrders.length * 1.5),
          total_distance_miles: Math.round((15 + (actualOrders.length * 1.5)) * 0.621371 * 100) / 100,
          estimated_fuel_cost: Math.round((8 + actualOrders.length * 1.2) * 100) / 100,
          route_efficiency_score: 88,
          created_at: new Date().toISOString()
        },
        orders: actualOrders.map((order, index) => ({
          ...order,
          sequence_number: index + 1,
          delivery_status: orderStatusMap.get(order.id) || 'pending',
          estimated_arrival: new Date(Date.now() + (30 + index * 15) * 60000).toISOString()
        }))
      });
    } catch (error) {
      console.error('Route details error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch route details', error: error.message });
    }
  },

  // PUT /api/orders/delivery-status/:orderId
  async updateDeliveryStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['pending', 'assigned', 'in_route', 'delivered', 'failed', 'returned'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be one of: ' + validStatuses.join(', ') });
      }

      console.log('Updating order ' + orderId + ' status to: ' + status);
      const supabase = getSupabase();

      if (supabase) {
        const updateData = { status, updated_at: new Date().toISOString() };
        if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
        if (notes) updateData.delivery_notes = notes;

        const { error } = await supabase.from('orders').update(updateData).eq('id', orderId).select();
        if (error) console.error('Error updating order in database:', error);
      }

      orderStatusMap.set(orderId, status);

      // Calculate route progress
      let routeProgress = null;
      for (const [rId, orders] of routeOrdersMap.entries()) {
        if (orders.some(order => order.id === orderId)) {
          const completedCount = orders.filter(order => orderStatusMap.get(order.id) === 'delivered').length;
          const progressPercentage = Math.round((completedCount / orders.length) * 100);
          routeProgress = {
            route_id: rId,
            completed: completedCount,
            total: orders.length,
            percentage: progressPercentage,
            is_complete: completedCount === orders.length
          };
          break;
        }
      }

      res.json({
        success: true,
        message: 'Order marked as ' + status,
        order_id: orderId,
        status,
        notes: notes || null,
        timestamp: new Date().toISOString(),
        route_progress: routeProgress
      });
    } catch (error) {
      console.error('Update delivery status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update delivery status', error: error.message });
    }
  },

  // POST /api/orders/driver-update-status
  async driverUpdateStatus(req, res) {
    try {
      const { driver_id, order_id, status, notes } = req.body;
      console.log('Driver ' + driver_id + ' updating order ' + order_id + ' to ' + status);

      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: order, error } = await supabase
            .from('orders')
            .update({
              delivery_status: status,
              delivered_at: status === 'delivered' ? new Date().toISOString() : null,
              delivery_notes: notes || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', order_id)
            .select('route_id')
            .single();

          if (!error && order && order.route_id) {
            const { data: routeOrders } = await supabase
              .from('orders')
              .select('id, delivery_status')
              .eq('route_id', order.route_id);

            if (routeOrders) {
              const completedCount = routeOrders.filter(o => o.delivery_status === 'delivered').length;
              const totalCount = routeOrders.length;
              const progressPercentage = Math.round((completedCount / totalCount) * 100);
              const routeStatus = progressPercentage === 100 ? 'completed' : (progressPercentage > 0 ? 'in_progress' : 'assigned');

              await supabase.from('routes').update({
                status: routeStatus,
                progress_percentage: progressPercentage,
                completed_orders: completedCount,
                updated_at: new Date().toISOString()
              }).eq('id', order.route_id);

              return res.json({
                success: true,
                message: 'Order marked as ' + status,
                order_id, status,
                route_progress: { completed: completedCount, total: totalCount, percentage: progressPercentage },
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (dbError) {
          console.error('Database error, falling back to memory:', dbError.message);
        }
      }

      // Memory fallback
      orderStatusMap.set(order_id, status);

      let routeProgress = null;
      for (const [routeId, orders] of routeOrdersMap.entries()) {
        if (orders.some(order => order.id === order_id)) {
          const completedCount = orders.filter(order => orderStatusMap.get(order.id) === 'delivered').length;
          routeProgress = { completed: completedCount, total: orders.length, percentage: Math.round((completedCount / orders.length) * 100) };
          break;
        }
      }

      res.json({
        success: true,
        message: 'Order marked as ' + status,
        order_id, status,
        route_progress: routeProgress,
        timestamp: new Date().toISOString(),
        source: 'memory'
      });
    } catch (error) {
      console.error('Driver update status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update delivery status', error: error.message });
    }
  },

  // GET /api/orders/driver-routes/:driverId
  async getDriverRoutes(req, res) {
    try {
      const { driverId } = req.params;
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      console.log('Getting routes for driver ' + driverId + ' on ' + date);

      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('*, drivers(first_name, last_name, phone, email)')
            .eq('driver_id', driverId)
            .eq('delivery_date', date)
            .in('status', ['assigned', 'dispatched', 'in_progress', 'completed'])
            .order('created_at');

          if (!routesError && routes && routes.length > 0) {
            const driverRoutes = [];
            for (const route of routes) {
              const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('route_id', route.id)
                .order('sequence_number');

              if (ordersError) continue;

              const completedOrders = orders.filter(o => o.delivery_status === 'delivered').length;
              const progressPercentage = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;

              driverRoutes.push({
                id: route.id,
                route_id: route.id,
                route_name: route.route_name,
                driver_id: driverId,
                driver_name: route.drivers ? route.drivers.first_name + ' ' + route.drivers.last_name : 'Driver',
                status: route.status,
                total_orders: orders.length,
                completed_orders: completedOrders,
                progress_percentage: progressPercentage,
                estimated_duration_minutes: route.estimated_duration_minutes,
                total_distance_km: route.total_distance_km,
                estimated_fuel_cost: route.estimated_fuel_cost,
                route_efficiency_score: route.route_efficiency_score,
                navigation_url: route.navigation_url,
                created_at: route.created_at,
                orders: orders.map((order, index) => ({
                  ...order,
                  sequence_number: order.sequence_number || index + 1,
                  delivery_status: order.delivery_status || 'pending'
                }))
              });
            }

            if (driverRoutes.length > 0) {
              return res.json({ success: true, routes: driverRoutes, total_routes: driverRoutes.length, driver_id: driverId, date });
            }
          }
        } catch (dbError) {
          console.error('Database connection error:', dbError.message);
        }
      }

      // Check memory storage
      const memRoutes = [];
      for (const [routeId, orders] of routeOrdersMap.entries()) {
        if (orders && orders.length > 0) {
          const completedOrders = orders.filter(order => orderStatusMap.get(order.id) === 'delivered').length;
          const progressPercentage = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;

          memRoutes.push({
            id: routeId,
            route_id: routeId,
            route_name: 'Zone ' + routeId.replace('route_', '') + ' - ' + (orders[0]?.postcode_area || 'Unknown'),
            driver_id: driverId,
            driver_name: 'Lisa Logistics',
            status: completedOrders === orders.length ? 'completed' : (completedOrders > 0 ? 'in_progress' : 'assigned'),
            total_orders: orders.length,
            completed_orders: completedOrders,
            progress_percentage: progressPercentage,
            estimated_duration_minutes: 20 + (orders.length * 8),
            total_distance_km: Math.round((15 + (orders.length * 1.5)) * 100) / 100,
            estimated_fuel_cost: Math.round((8 + orders.length * 1.2) * 100) / 100,
            route_efficiency_score: 85 + Math.random() * 15,
            navigation_url: generateNavigationURL(
              { latitude: 53.3808256, longitude: -2.575416 },
              orders.map(order => ({ lat: parseFloat(order.latitude) || 53.3808256, lng: parseFloat(order.longitude) || -2.575416 })),
              false
            ),
            created_at: new Date().toISOString(),
            orders: orders.map((order, index) => ({
              ...order,
              sequence_number: order.sequence_number || index + 1,
              delivery_status: orderStatusMap.get(order.id) || 'pending'
            }))
          });
        }
      }

      if (memRoutes.length > 0) {
        return res.json({ success: true, routes: memRoutes, total_routes: memRoutes.length, driver_id: driverId, date });
      }

      // Demo data fallback
      const demoRoute = {
        id: 'demo_route_1',
        route_id: 'demo_route_1',
        route_name: 'Demo Zone 1 - BN1',
        driver_id: driverId,
        driver_name: 'Demo Driver',
        status: 'assigned',
        total_orders: 3,
        completed_orders: 0,
        progress_percentage: 0,
        estimated_duration_minutes: 45,
        total_distance_km: 8.5,
        estimated_fuel_cost: 12.50,
        route_efficiency_score: 88,
        navigation_url: 'https://wego.here.com/directions/drive/53.3808256,-2.575416/53.3765,-2.5618/53.3821,-2.5723/53.3808256,-2.575416',
        created_at: new Date().toISOString(),
        orders: [
          { id: 'demo_order_1', customer_name: 'Sarah Wilson', delivery_address: '13 Myrtle Grove, Latchford, Warrington', postcode: 'WA4 1EE', latitude: 53.3811877, longitude: -2.5748538, order_value: 32.50, weight: 1.8, customer_phone: '07123456789', special_instructions: 'Ring doorbell twice', sequence_number: 1, delivery_status: 'pending' },
          { id: 'demo_order_2', customer_name: 'Mike Johnson', delivery_address: '32 Park Ave, Warrington', postcode: 'WA4 1DZ', latitude: 53.38065109999999, longitude: -2.5763532, order_value: 67.25, weight: 3.2, customer_phone: '07234567890', special_instructions: 'Leave with neighbor if out', sequence_number: 2, delivery_status: 'pending' },
          { id: 'demo_order_3', customer_name: 'Emma Brown', delivery_address: '19 Ash Grove, Latchford, Warrington', postcode: 'WA4 1EF', latitude: 53.3804919, longitude: -2.5745405, order_value: 28.75, weight: 1.5, customer_phone: '07345678901', special_instructions: 'Fragile items', sequence_number: 3, delivery_status: 'pending' }
        ]
      };

      res.json({ success: true, routes: [demoRoute], total_routes: 1, driver_id: driverId, date, source: 'demo_data' });
    } catch (error) {
      console.error('Get driver routes error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch driver routes', error: error.message, driver_id: req.params.driverId });
    }
  },

  // POST /api/orders/upload-pdf
  async uploadPDF(req, res) {
    try {
      console.log('PDF upload request received');
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
      }

      console.log('Processing PDF file:', req.file.originalname);
      const orders = await pdfParserService.parsePDF(req.file.buffer);

      if (orders.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid orders found in PDF.', orders: [] });
      }

      const supabase = getSupabase();

      if (supabase) {
        const { data: insertedOrders, error } = await supabase.from('orders').insert(orders).select();
        if (error) {
          return res.status(500).json({ success: false, message: 'Failed to save orders to database', error: error.message, extractedOrders: orders });
        }

        return res.json({
          success: true,
          message: 'Successfully processed PDF and added ' + insertedOrders.length + ' orders',
          orders: insertedOrders,
          filename: req.file.originalname,
          extractedCount: orders.length,
          insertedCount: insertedOrders.length
        });
      }

      res.json({
        success: true,
        message: 'Successfully extracted ' + orders.length + ' orders from PDF (database not configured)',
        orders, filename: req.file.originalname,
        extractedCount: orders.length, insertedCount: 0
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to process PDF file', error: error.message });
    }
  },

  // POST /api/orders/test-pdf-parsing
  async testPDFParsing(req, res) {
    try {
      console.log('Generating test orders');
      const orders = pdfParserService.generateSampleOrders(5);
      const supabase = getSupabase();

      if (supabase) {
        const { data: insertedOrders, error } = await supabase.from('orders').insert(orders).select();
        if (error) {
          return res.status(500).json({ success: false, message: 'Failed to insert test orders', error: error.message });
        }
        return res.json({ success: true, message: 'Successfully created ' + insertedOrders.length + ' test orders', orders: insertedOrders });
      }

      res.json({ success: true, message: 'Generated ' + orders.length + ' test orders (database not configured)', orders });
    } catch (error) {
      console.error('Test PDF parsing error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate test orders', error: error.message });
    }
  },

  // POST /api/orders/upload-text
  async uploadText(req, res) {
    try {
      console.log('Text bulk upload request received');
      const { orders } = req.body;

      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid orders provided' });
      }

      const validOrders = orders.map((order, index) => ({
        customer_name: order.customer_name || 'Customer ' + (index + 1),
        customer_email: order.customer_email || 'customer' + (index + 1) + '@email.com',
        customer_phone: order.customer_phone || '01925' + String(100000 + index).slice(1),
        delivery_address: order.delivery_address || 'Address to be confirmed',
        postcode: order.postcode || 'WA4 1EF',
        city: order.city || 'Warrington',
        latitude: order.latitude || 53.3900,
        longitude: order.longitude || -2.5970,
        order_value: order.order_value || 50.00,
        weight: order.weight || 2.5,
        delivery_date: order.delivery_date || new Date().toISOString().split('T')[0],
        status: 'pending'
      }));

      const supabase = getSupabase();

      if (supabase) {
        const { data: insertedOrders, error } = await supabase.from('orders').insert(validOrders).select();
        if (error) {
          return res.status(500).json({ success: false, message: 'Failed to save orders to database', error: error.message, extractedOrders: validOrders });
        }

        return res.json({
          success: true,
          message: 'Successfully processed and added ' + insertedOrders.length + ' orders',
          orders: insertedOrders,
          extractedCount: orders.length,
          insertedCount: insertedOrders.length
        });
      }

      // No Supabase — save to in-memory store so getEligibleOrders can serve them
      validOrders.forEach((order, idx) => {
        const id = 'mem_' + Date.now() + '_' + idx;
        inMemoryOrders.set(id, { ...order, id });
        orderStatusMap.set(id, 'pending');
      });

      res.json({
        success: true,
        message: 'Successfully processed ' + validOrders.length + ' orders (database not configured)',
        orders: validOrders,
        extractedCount: orders.length, insertedCount: 0
      });
    } catch (error) {
      console.error('Text bulk upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to process text orders', error: error.message });
    }
  },

  // DELETE /api/orders/reset
  async resetOrders(req, res) {
    try {
      console.log('Reset orders request received');
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

          await supabase
            .from('orders')
            .delete()
            .gte('created_at', '1900-01-01');

          routeOrdersMap.clear();
          orderStatusMap.clear();

          return res.json({ success: true, message: 'Successfully reset ' + (orderCount || 0) + ' orders from database', deletedCount: orderCount || 0 });
        } catch (dbError) {
          console.error('Supabase reset error, clearing memory state:', dbError.message);
        }
      }

      routeOrdersMap.clear();
      orderStatusMap.clear();
      inMemoryOrders.clear();
      res.json({ success: true, message: 'Orders reset completed (database not configured)', deletedCount: 0 });
    } catch (error) {
      console.error('Reset orders error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset orders', error: error.message });
    }
  },

  // GET /api/orders/analytics
  async getAnalytics(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0], range = 'today' } = req.query;
      const supabase = getSupabase();

      let analytics = {
        date,
        range,
        orders: { total: 0, delivered: 0, pending: 0, failed: 0, in_route: 0 },
        routes: { total: 0, completed: 0, in_progress: 0, assigned: 0 },
        drivers: { total: 0, active: 0, available_today: 0 },
        performance: { total_distance_km: 0, total_fuel_cost: 0, avg_delivery_time_minutes: 0, success_rate: 0 },
        driver_performance: []
      };

      if (supabase) {
        try {
          // Fetch orders, routes, and drivers in parallel
          const [ordersResult, driversResult, routesResult] = await Promise.all([
            supabase.from('orders').select('id, status, driver_id').eq('delivery_date', date),
            supabase.from('drivers').select('id, is_active, is_available_today'),
            supabase.from('routes').select('id, status, total_distance_km, estimated_fuel_cost, estimated_duration_minutes, driver_id').eq('delivery_date', date)
          ]);

          const orders = ordersResult.data || [];
          const drivers = driversResult.data || [];
          const routes = routesResult.data || [];

          analytics.orders.total = orders.length;
          analytics.orders.delivered = orders.filter(o => o.status === 'delivered').length;
          analytics.orders.pending = orders.filter(o => o.status === 'pending').length;
          analytics.orders.failed = orders.filter(o => o.status === 'failed').length;
          analytics.orders.in_route = orders.filter(o => o.status === 'in_route' || o.status === 'out_for_delivery').length;

          analytics.routes.total = routes.length;
          analytics.routes.completed = routes.filter(r => r.status === 'completed').length;
          analytics.routes.in_progress = routes.filter(r => r.status === 'in_progress' || r.status === 'dispatched').length;
          analytics.routes.assigned = routes.filter(r => r.status === 'assigned').length;

          analytics.drivers.total = drivers.length;
          analytics.drivers.active = drivers.filter(d => d.is_active).length;
          analytics.drivers.available_today = drivers.filter(d => d.is_active && d.is_available_today).length;

          analytics.performance.total_distance_km = Math.round(routes.reduce((s, r) => s + (r.total_distance_km || 0), 0) * 100) / 100;
          analytics.performance.total_fuel_cost = Math.round(routes.reduce((s, r) => s + (r.estimated_fuel_cost || 0), 0) * 100) / 100;
          analytics.performance.avg_delivery_time_minutes = routes.length > 0
            ? Math.round(routes.reduce((s, r) => s + (r.estimated_duration_minutes || 0), 0) / routes.length)
            : 0;
          analytics.performance.success_rate = analytics.orders.total > 0
            ? Math.round((analytics.orders.delivered / analytics.orders.total) * 100)
            : 0;

          // Per-driver performance
          const driverMap = {};
          routes.forEach(r => {
            if (!r.driver_id) return;
            if (!driverMap[r.driver_id]) {
              driverMap[r.driver_id] = { driver_id: r.driver_id, routes: 0, distance_km: 0, fuel_cost: 0 };
            }
            driverMap[r.driver_id].routes += 1;
            driverMap[r.driver_id].distance_km += r.total_distance_km || 0;
            driverMap[r.driver_id].fuel_cost += r.estimated_fuel_cost || 0;
          });
          orders.forEach(o => {
            if (!o.driver_id || !driverMap[o.driver_id]) return;
            if (!driverMap[o.driver_id].delivered) driverMap[o.driver_id].delivered = 0;
            if (!driverMap[o.driver_id].total_orders) driverMap[o.driver_id].total_orders = 0;
            driverMap[o.driver_id].total_orders += 1;
            if (o.status === 'delivered') driverMap[o.driver_id].delivered += 1;
          });
          analytics.driver_performance = Object.values(driverMap).map(d => ({
            ...d,
            distance_km: Math.round(d.distance_km * 100) / 100,
            fuel_cost: Math.round(d.fuel_cost * 100) / 100,
            success_rate: d.total_orders > 0 ? Math.round(((d.delivered || 0) / d.total_orders) * 100) : 0
          }));

          return res.json({ success: true, analytics });
        } catch (dbError) {
          console.error('Supabase analytics error, using in-memory fallback:', dbError.message);
        }
      }

      // In-memory fallback using routeOrdersMap / orderStatusMap
      let totalOrders = 0;
      let deliveredOrders = 0;
      let pendingOrders = 0;
      let totalDistanceKm = 0;

      for (const [, orders] of routeOrdersMap.entries()) {
        totalOrders += orders.length;
        orders.forEach(order => {
          const status = orderStatusMap.get(order.id) || 'pending';
          if (status === 'delivered') deliveredOrders += 1;
          else pendingOrders += 1;
        });
        const metrics = calculateRealisticMetrics(orders.length);
        totalDistanceKm += metrics.distance_km;
      }

      analytics.orders.total = totalOrders;
      analytics.orders.delivered = deliveredOrders;
      analytics.orders.pending = pendingOrders;
      analytics.routes.total = routeOrdersMap.size;
      analytics.performance.total_distance_km = Math.round(totalDistanceKm * 100) / 100;
      analytics.performance.success_rate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

      res.json({ success: true, analytics });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
    }
  },

  // Internal helper: get available drivers data
  async _getAvailableDriversData() {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: drivers, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('is_active', true)
          .eq('is_available_today', true);

        if (error) throw error;
        return drivers.map(driver => ({
          id: driver.id,
          name: driver.first_name + ' ' + driver.last_name,
          mpg: driver.mpg || 30
        }));
      } catch (error) {
        console.error('Error fetching drivers from database:', error);
        // Fall through to mock data below
      }
    }

    return [
      { id: '1', name: 'John Driver', mpg: 35 },
      { id: '2', name: 'Sarah Courier', mpg: 42 }
    ];
  }
};

module.exports = ordersController;

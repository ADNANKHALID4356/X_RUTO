// In-memory state for route tracking
// These Maps persist across requests within a single server process
const routeOrdersMap = new Map();
const orderStatusMap = new Map();

// In-memory order store used when Supabase is not configured (demo / dev mode).
// Key: order id (string), Value: order object
const inMemoryOrders = new Map();

// In-memory settings store – used when Supabase is not configured.
// Persists across requests so admin changes take effect immediately.
const inMemorySettings = {
  drivers_today_count: 5,
  include_admin_as_driver: false,
  navigation_app_preference: 'here',
  enable_stock_refill: false,
  max_deliveries_per_route: 25,
  max_routes_per_day: 10,
  default_fuel_price: 1.45,
  enable_help_tooltips: true,
  auto_assign_routes: true,
  route_optimization_method: 'distance',
  customer_notifications: true,
  driver_app_enabled: true,
  woocommerce_integration_enabled: false,
  sync_frequency_minutes: 15,
  enable_real_time_tracking: false
};

module.exports = { routeOrdersMap, orderStatusMap, inMemoryOrders, inMemorySettings };

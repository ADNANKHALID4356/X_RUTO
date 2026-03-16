// In-memory state for route tracking
// These Maps persist across requests within a single server process
const routeOrdersMap = new Map();
const orderStatusMap = new Map();

// In-memory order store used when Supabase is not configured (demo / dev mode).
// Key: order id (string), Value: order object
const inMemoryOrders = new Map();

module.exports = { routeOrdersMap, orderStatusMap, inMemoryOrders };

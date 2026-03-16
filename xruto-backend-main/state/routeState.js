// In-memory state for route tracking
// These Maps persist across requests within a single server process
const routeOrdersMap = new Map();
const orderStatusMap = new Map();

module.exports = { routeOrdersMap, orderStatusMap };

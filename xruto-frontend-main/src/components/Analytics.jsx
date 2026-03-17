import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    failedOrders: 0,
    totalRoutes: 0,
    activeRoutes: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalDistance: 0,
    totalFuelCost: 0,
    avgDeliveryTime: 0,
    deliverySuccessRate: 0,
  });
  const [driverPerformance, setDriverPerformance] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];

      // Try the dedicated analytics endpoint first
      const analyticsRes = await fetch(`${API_BASE_URL}/orders/analytics?date=${date}&range=${dateRange}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      if (analyticsRes?.success && analyticsRes.analytics) {
        const a = analyticsRes.analytics;
        setStats({
          totalOrders: a.orders.total,
          completedOrders: a.orders.delivered,
          pendingOrders: a.orders.pending,
          failedOrders: a.orders.failed,
          totalRoutes: a.routes.total,
          activeRoutes: a.routes.in_progress,
          totalDrivers: a.drivers.total,
          activeDrivers: a.drivers.active,
          totalDistance: a.performance.total_distance_km,
          totalFuelCost: a.performance.total_fuel_cost,
          avgDeliveryTime: a.performance.avg_delivery_time_minutes,
          deliverySuccessRate: a.performance.success_rate,
        });
        setDriverPerformance(a.driver_performance || []);
        setRouteMetrics([]);
        return;
      }

      // Fallback: compose analytics from individual endpoints
      const [ordersRes, driversRes, routesRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/orders/eligible?date=${date}`).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/drivers`).then(r => r.json()),
        fetch(`${API_BASE_URL}/orders/routes`).then(r => r.json()),
      ]);

      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.orders || []) : [];
      const drivers = driversRes.status === 'fulfilled' ? (driversRes.value.drivers || []) : [];
      const routes = routesRes.status === 'fulfilled' ? (routesRes.value.routes || []) : [];

      const completed = orders.filter(o => o.status === 'delivered').length;
      const pending = orders.filter(o => o.status === 'pending' || !o.status).length;
      const failed = orders.filter(o => o.status === 'failed').length;
      const activeDrivers = drivers.filter(d => d.is_active !== false).length;
      const activeRoutes = routes.filter(r => r.status === 'dispatched' || r.status === 'in_progress').length;
      const totalDistance = routes.reduce((s, r) => s + (r.total_distance_km || 0), 0);
      const totalFuelCost = routes.reduce((s, r) => s + (r.estimated_fuel_cost || 0), 0);
      const avgTime = routes.length > 0 ? routes.reduce((s, r) => s + (r.estimated_duration_minutes || 0), 0) / routes.length : 0;

      setStats({
        totalOrders: orders.length,
        completedOrders: completed,
        pendingOrders: pending,
        failedOrders: failed,
        totalRoutes: routes.length,
        activeRoutes,
        totalDrivers: drivers.length,
        activeDrivers,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalFuelCost: Math.round(totalFuelCost * 100) / 100,
        avgDeliveryTime: Math.round(avgTime),
        deliverySuccessRate: orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0,
      });

      setDriverPerformance(drivers.map(d => ({
        name: d.name,
        vehicle: d.vehicle_type || 'Van',
        mpg: d.mpg || 35,
        isActive: d.is_active !== false,
        assignedRoutes: routes.filter(r => r.driver_id === d.id).length,
        completedOrders: 0,
      })));

      setRouteMetrics(routes.map(r => ({
        name: r.route_name,
        orders: r.total_orders || 0,
        distance: r.total_distance_km || 0,
        duration: r.estimated_duration_minutes || 0,
        status: r.status,
        efficiency: r.route_efficiency_score || 0,
      })));

    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Progress bar helper
  const ProgressBar = ({ value, max, color = 'bg-orange-500' }) => (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%` }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="bg-[#0D0B1F] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0B1F] min-h-screen text-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-20 bg-[#0D0B1F]">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Analytics Dashboard</h1>
              <p className="text-gray-400 text-sm">
                {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 days' : 'Last 30 days'} · delivery performance &amp; route insights
              </p>
            </div>
            <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
              {['today', 'week', 'month'].map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors capitalize ${
                    dateRange === range ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: 'text-blue-400' },
            { label: 'Delivered', value: stats.completedOrders, icon: '✅', color: 'text-green-400' },
            { label: 'Active Routes', value: stats.activeRoutes, icon: '🗺️', color: 'text-orange-400' },
            { label: 'Active Drivers', value: stats.activeDrivers, icon: '🚛', color: 'text-purple-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{kpi.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-gray-500 text-xs mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Delivery Performance */}
        <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-bold mb-4">Delivery Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{stats.deliverySuccessRate}%</div>
              <div className="text-gray-500 text-xs mt-1">Success Rate</div>
              <ProgressBar value={stats.deliverySuccessRate} max={100} color="bg-green-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">{stats.avgDeliveryTime} min</div>
              <div className="text-gray-500 text-xs mt-1">Avg Route Time</div>
              <ProgressBar value={stats.avgDeliveryTime} max={480} color="bg-orange-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{stats.totalDistance} km</div>
              <div className="text-gray-500 text-xs mt-1">Total Distance</div>
              <ProgressBar value={stats.totalDistance} max={500} color="bg-blue-500" />
            </div>
          </div>

          {/* Order Status Breakdown */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Pending', value: stats.pendingOrders, color: 'bg-yellow-500/20 text-yellow-400' },
              { label: 'Delivered', value: stats.completedOrders, color: 'bg-green-500/20 text-green-400' },
              { label: 'Failed', value: stats.failedOrders, color: 'bg-red-500/20 text-red-400' },
              { label: 'Total', value: stats.totalOrders, color: 'bg-blue-500/20 text-blue-400' },
            ].map((s, i) => (
              <div key={i} className={`rounded-lg p-3 text-center ${s.color}`}>
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-xs opacity-70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-5">
          <h2 className="text-white font-bold mb-4">Cost Analysis</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-800/60 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-green-400">£{stats.totalFuelCost.toFixed(2)}</div>
              <div className="text-gray-500 text-xs mt-1">Total Fuel Cost</div>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-blue-400">
                £{stats.totalOrders > 0 ? (stats.totalFuelCost / Math.max(stats.totalOrders, 1)).toFixed(2) : '0.00'}
              </div>
              <div className="text-gray-500 text-xs mt-1">Cost per Order</div>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-orange-400">
                {stats.totalRoutes > 0 ? (stats.totalDistance / Math.max(stats.totalRoutes, 1)).toFixed(1) : '0'} km
              </div>
              <div className="text-gray-500 text-xs mt-1">Avg Route Distance</div>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-purple-400">
                {stats.totalRoutes > 0 ? Math.round(stats.totalOrders / Math.max(stats.totalRoutes, 1)) : '0'}
              </div>
              <div className="text-gray-500 text-xs mt-1">Avg Orders/Route</div>
            </div>
          </div>
        </div>

        {/* Driver Performance Table */}
        {driverPerformance.length > 0 && (
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-white font-bold">Driver Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60">
                  <tr className="text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Driver</th>
                    <th className="px-4 py-3 font-medium">Vehicle</th>
                    <th className="px-4 py-3 font-medium">MPG</th>
                    <th className="px-4 py-3 font-medium">Routes</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {driverPerformance.map((driver, i) => (
                    <tr key={i} className="text-gray-300 hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-white">{driver.name}</td>
                      <td className="px-4 py-3">{driver.vehicle}</td>
                      <td className="px-4 py-3">{driver.mpg}</td>
                      <td className="px-4 py-3">{driver.assignedRoutes}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          driver.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}>
                          {driver.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Route Metrics */}
        {routeMetrics.length > 0 && (
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-white font-bold">Route Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60">
                  <tr className="text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium">Orders</th>
                    <th className="px-4 py-3 font-medium">Distance</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Efficiency</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {routeMetrics.map((route, i) => (
                    <tr key={i} className="text-gray-300 hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-white">{route.name}</td>
                      <td className="px-4 py-3">{route.orders}</td>
                      <td className="px-4 py-3">{route.distance.toFixed(1)} km</td>
                      <td className="px-4 py-3">{route.duration} min</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={route.efficiency} max={100} color={
                            route.efficiency > 80 ? 'bg-green-500' :
                            route.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          } />
                          <span className="text-xs">{Math.round(route.efficiency)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          route.status === 'dispatched' ? 'bg-green-500/20 text-green-400' :
                          route.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>{route.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state when no data */}
        {stats.totalOrders === 0 && stats.totalRoutes === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-400">Upload orders and generate routes to see analytics here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;

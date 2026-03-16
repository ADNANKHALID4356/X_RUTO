import React, { useState, useEffect, useCallback } from 'react';
import PDFUpload from './PDFUpload';
import TextBulkUpload from './TextBulkUpload';
import ClusterMap from './ClusterMap';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- API Layer ---
const ordersAPI = {
  getEligibleOrders: async (date) => {
    const res = await fetch(`${API_BASE_URL}/orders/eligible?date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },
  generateClusters: async (selectedPostcodes, maxZones = 5) => {
    const res = await fetch(`${API_BASE_URL}/orders/generate-clusters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_postcodes: selectedPostcodes, max_zones: maxZones })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
  generateRoutes: async (zones) => {
    const res = await fetch(`${API_BASE_URL}/orders/generate-routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  getAvailableDrivers: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/available-drivers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  assignDriver: async (routeId, driverId) => {
    const res = await fetch(`${API_BASE_URL}/orders/assign-driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: routeId, driver_id: driverId })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  autoAssignDrivers: async (routes) => {
    const res = await fetch(`${API_BASE_URL}/orders/auto-assign-drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  dispatchRoutes: async (routeIds) => {
    const res = await fetch(`${API_BASE_URL}/orders/dispatch-routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_ids: routeIds })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  resetOrders: async () => {
    const res = await fetch(`${API_BASE_URL}/orders/reset`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

// --- Helpers ---
const formatDuration = (min) => {
  if (!min) return '0 min';
  if (min < 60) return `${Math.round(min)} min`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
};

const formatDistance = (km) => {
  if (!km) return '0 km';
  return `${km.toFixed(1)} km`;
};

const ZONE_COLORS = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF6F61', '#88D8B0'];

// ============================================================
//  TAB 1 - Filter & Upload Orders
// ============================================================
const FilterOrdersTab = ({ orders, setOrders, postcodeOptions, setPostcodeOptions, selectedPostcodes, setSelectedPostcodes, zones, setZones, onProceedToRoutes }) => {
  const [loading, setLoading] = useState(false);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ordersAPI.getEligibleOrders(deliveryDate);
      if (data.success) {
        setOrders(data.orders || []);
        setPostcodeOptions(data.postcode_options || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deliveryDate, setOrders, setPostcodeOptions]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleOrdersUploaded = () => {
    setUploadMode(null);
    fetchOrders();
  };

  const togglePostcode = (pc) => {
    setSelectedPostcodes(prev => prev.includes(pc) ? prev.filter(p => p !== pc) : [...prev, pc]);
  };

  const selectAllPostcodes = () => setSelectedPostcodes([...postcodeOptions]);
  const deselectAllPostcodes = () => setSelectedPostcodes([]);

  const handleGenerateClusters = async () => {
    if (selectedPostcodes.length === 0) {
      setError('Select at least one postcode area');
      return;
    }
    setClusterLoading(true);
    setError('');
    try {
      const data = await ordersAPI.generateClusters(selectedPostcodes);
      if (data.success) {
        setZones(data.zones || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setClusterLoading(false);
    }
  };

  const handleResetOrders = async () => {
    if (!window.confirm('This will delete all orders. Are you sure?')) return;
    try {
      await ordersAPI.resetOrders();
      setOrders([]);
      setPostcodeOptions([]);
      setSelectedPostcodes([]);
      setZones([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredOrders = selectedPostcodes.length > 0
    ? orders.filter(o => selectedPostcodes.some(pc => o.postcode?.startsWith(pc)))
    : orders;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Filter & Import Orders</h2>
          <p className="text-gray-400 text-sm">{orders.length} eligible orders for delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <button onClick={fetchOrders} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-200 font-bold">&times;</button>
        </div>
      )}

      {/* Upload Buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setUploadMode(uploadMode === 'pdf' ? null : 'pdf')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMode === 'pdf' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}>
          Upload PDF
        </button>
        <button onClick={() => setUploadMode(uploadMode === 'text' ? null : 'text')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploadMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}>
          Bulk Text Upload
        </button>
        {orders.length > 0 && (
          <button onClick={handleResetOrders} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800 ml-auto">
            Reset All Orders
          </button>
        )}
      </div>

      {/* Upload Panel */}
      {uploadMode === 'pdf' && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <PDFUpload onOrdersUploaded={handleOrdersUploaded} />
        </div>
      )}
      {uploadMode === 'text' && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <TextBulkUpload onOrdersUploaded={handleOrdersUploaded} />
        </div>
      )}

      {/* Postcode Filter */}
      {postcodeOptions.length > 0 && (
        <div className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">Postcode Areas</h3>
            <div className="flex gap-2">
              <button onClick={selectAllPostcodes} className="text-xs text-orange-400 hover:text-orange-300">Select All</button>
              <span className="text-gray-600">|</span>
              <button onClick={deselectAllPostcodes} className="text-xs text-gray-400 hover:text-gray-300">Clear</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {postcodeOptions.map(pc => (
              <button
                key={pc}
                onClick={() => togglePostcode(pc)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedPostcodes.includes(pc)
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {pc}
                <span className="ml-1 text-xs opacity-70">
                  ({orders.filter(o => o.postcode?.startsWith(pc)).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      {filteredOrders.length > 0 && (
        <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">
              Orders ({filteredOrders.length}{selectedPostcodes.length > 0 ? ` of ${orders.length}` : ''})
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 sticky top-0">
                <tr className="text-gray-400 text-left">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">Address</th>
                  <th className="px-4 py-2 font-medium">Postcode</th>
                  <th className="px-4 py-2 font-medium hidden md:table-cell">Value</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredOrders.map((order, i) => (
                  <tr key={order.id || i} className="text-gray-300 hover:bg-gray-800/40">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-white">{order.customer_name}</td>
                    <td className="px-4 py-2 hidden sm:table-cell text-gray-400 max-w-[200px] truncate">{order.delivery_address}</td>
                    <td className="px-4 py-2">
                      <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{order.postcode}</span>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">{order.order_value ? `£${Number(order.order_value).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>{order.status || 'pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Clusters */}
      {orders.length > 0 && selectedPostcodes.length > 0 && (
        <div className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-semibold">Generate Delivery Zones</h3>
              <p className="text-gray-400 text-sm">Cluster {filteredOrders.length} orders into optimized zones</p>
            </div>
            <button
              onClick={handleGenerateClusters}
              disabled={clusterLoading}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20"
            >
              {clusterLoading ? 'Clustering...' : 'Generate Zones'}
            </button>
          </div>

          {/* Zone Preview */}
          {zones.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-white font-medium text-sm">Zone Preview ({zones.length} zones)</h4>
              {/* Map visualization */}
              <ClusterMap zones={zones} height="320px" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {zones.map((zone, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: zone.color_hex || ZONE_COLORS[i % ZONE_COLORS.length]}} />
                      <span className="text-white font-medium text-sm">{zone.zone_name}</span>
                    </div>
                    <div className="text-gray-400 text-xs space-y-1">
                      <div>Orders: {zone.total_orders}</div>
                      <div>Postcodes: {zone.postcodes?.join(', ') || '-'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={onProceedToRoutes}
                className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                Proceed to Route Generation &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-white mb-2">No Orders Found</h3>
          <p className="text-gray-400 mb-4">Upload orders via PDF or text, or generate test data</p>
        </div>
      )}
    </div>
  );
};

// ============================================================
//  Route print helper (opens a new window with printable sheet)
// ============================================================
const printRouteSheet = (route) => {
  const stops = (route.orders || []).map((o, idx) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 12px;font-weight:bold;width:40px">${idx + 1}</td>
      <td style="padding:8px 12px">
        <strong>${o.customer_name || 'Unknown'}</strong><br/>
        <span style="color:#555;font-size:13px">${o.delivery_address || ''}</span><br/>
        <span style="background:#f0f0f0;padding:2px 6px;border-radius:10px;font-size:12px">${o.postcode || ''}</span>
        ${o.customer_phone ? `<br/><span style="color:#777;font-size:12px">📞 ${o.customer_phone}</span>` : ''}
        ${o.special_instructions ? `<br/><em style="color:#e07800;font-size:12px">⚠ ${o.special_instructions}</em>` : ''}
      </td>
      <td style="padding:8px 12px;color:#555;font-size:13px">${o.order_value ? `£${Number(o.order_value).toFixed(2)}` : '-'}</td>
      <td style="padding:8px 12px;width:80px">
        <span style="background:#fff3cd;padding:3px 8px;border-radius:4px;font-size:12px">Pending</span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Route Sheet – ${route.route_name}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;color:#222}h1{font-size:20px;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f4f4f4;padding:8px 12px;text-align:left;font-size:13px}
    @media print{button{display:none}}</style></head>
    <body>
    <button onclick="window.print()" style="float:right;padding:6px 14px;background:#4caf50;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">🖨 Print</button>
    <h1>Route Sheet: ${route.route_name}</h1>
    <div style="display:flex;gap:24px;margin-bottom:12px;font-size:13px;color:#555">
      <span>Driver: <strong>${route.driver_name || 'Unassigned'}</strong></span>
      <span>Stops: <strong>${route.total_orders}</strong></span>
      <span>Distance: <strong>${route.total_distance_km ? route.total_distance_km.toFixed(1) + ' km' : '-'}</strong></span>
      <span>ETA: <strong>${route.estimated_duration_minutes ? Math.round(route.estimated_duration_minutes) + ' min' : '-'}</strong></span>
      <span>Fuel: <strong>£${(route.estimated_fuel_cost || 0).toFixed(2)}</strong></span>
    </div>
    <table>
      <thead><tr><th>#</th><th>Delivery Address</th><th>Value</th><th>Status</th></tr></thead>
      <tbody>${stops}</tbody>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#aaa">Generated: ${new Date().toLocaleString()} · xRuto Delivery System</p>
    </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

// ============================================================
//  TAB 2 - Route Review & Driver Assignment
// ============================================================
const RouteReviewTab = ({ zones, routes, setRoutes, onProceedToDispatch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const handleGenerateRoutes = useCallback(async () => {
    if (zones.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const data = await ordersAPI.generateRoutes(zones);
      if (data.success) {
        setRoutes(data.routes || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [zones, setRoutes]);

  // Generate routes from zones on mount
  useEffect(() => {
    if (zones.length > 0 && routes.length === 0) {
      handleGenerateRoutes();
    }
  }, [zones, routes.length, handleGenerateRoutes]);

  // Load available drivers
  useEffect(() => {
    const loadDrivers = async () => {
      setDriversLoading(true);
      try {
        const data = await ordersAPI.getAvailableDrivers();
        if (data.success) setDrivers(data.drivers || []);
      } catch (err) {
        console.error('Failed to load drivers:', err);
      } finally {
        setDriversLoading(false);
      }
    };
    loadDrivers();
  }, []);

  const handleAssignDriver = async (routeId, driverId) => {
    try {
      const data = await ordersAPI.assignDriver(routeId, driverId);
      if (data.success) {
        const driver = drivers.find(d => d.id === driverId);
        setRoutes(prev => prev.map(r =>
          r.route_id === routeId
            ? { ...r, driver_id: driverId, driver_name: driver?.name || 'Assigned', status: 'assigned' }
            : r
        ));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    setError('');
    try {
      const data = await ordersAPI.autoAssignDrivers(routes);
      if (data.success) {
        setRoutes(data.routes || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAutoAssigning(false);
    }
  };

  const allRoutesAssigned = routes.length > 0 && routes.every(r => r.driver_id);
  const totalOrders = routes.reduce((s, r) => s + (r.total_orders || 0), 0);
  const totalDistance = routes.reduce((s, r) => s + (r.total_distance_km || 0), 0);
  const totalFuel = routes.reduce((s, r) => s + (r.estimated_fuel_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Routes', value: routes.length, color: 'text-blue-400' },
          { label: 'Orders', value: totalOrders, color: 'text-green-400' },
          { label: 'Distance', value: `${totalDistance.toFixed(1)} km`, color: 'text-orange-400' },
          { label: 'Fuel Est.', value: `£${totalFuel.toFixed(2)}`, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-800 text-center">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-gray-500 text-xs mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-200 font-bold">&times;</button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleGenerateRoutes} disabled={loading || zones.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Generating...' : 'Regenerate Routes'}
        </button>
        <button onClick={handleAutoAssign} disabled={autoAssigning || routes.length === 0 || drivers.length === 0} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
          {autoAssigning ? 'Assigning...' : 'Auto-Assign Drivers'}
        </button>
        {allRoutesAssigned && (
          <button onClick={onProceedToDispatch} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all ml-auto shadow-lg">
            Proceed to Dispatch &rarr;
          </button>
        )}
      </div>

      {/* Route Cards */}
      <div className="space-y-4">
        {routes.map((route, i) => (
          <div key={route.route_id} className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
            {/* Route Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: route.zone_color || ZONE_COLORS[i % ZONE_COLORS.length]}} />
                  <h3 className="text-white font-bold">{route.route_name}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  route.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                  route.status === 'generated' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-700 text-gray-400'
                }`}>{route.status}</span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-white font-bold text-sm">{route.total_orders}</div>
                  <div className="text-gray-500 text-xs">Orders</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-white font-bold text-sm">{formatDuration(route.estimated_duration_minutes)}</div>
                  <div className="text-gray-500 text-xs">ETA</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-white font-bold text-sm">{formatDistance(route.total_distance_km)}</div>
                  <div className="text-gray-500 text-xs">Distance</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-white font-bold text-sm">£{(route.estimated_fuel_cost || 0).toFixed(2)}</div>
                  <div className="text-gray-500 text-xs">Fuel</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-2">
                  <div className="text-white font-bold text-sm">{Math.round(route.route_efficiency_score || 0)}%</div>
                  <div className="text-gray-500 text-xs">Efficiency</div>
                </div>
              </div>
            </div>

            {/* Driver Assignment */}
            <div className="p-4">
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm font-medium whitespace-nowrap">Assign Driver:</label>
                {route.driver_name ? (
                  <div className="flex items-center gap-2">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                      {route.driver_name}
                    </span>
                    <button
                      onClick={() => setRoutes(prev => prev.map(r => r.route_id === route.route_id ? { ...r, driver_id: null, driver_name: null, status: 'generated' } : r))}
                      className="text-gray-500 hover:text-red-400 text-sm"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <select
                    onChange={(e) => e.target.value && handleAssignDriver(route.route_id, e.target.value)}
                    defaultValue=""
                    disabled={driversLoading}
                    className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="" disabled>{driversLoading ? 'Loading drivers...' : 'Select a driver...'}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.mpg} MPG)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Navigation URL */}
              {route.navigation_url && (
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href={route.navigation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    Open in HERE Maps
                  </a>
                  <button
                    onClick={() => printRouteSheet(route)}
                    className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1 hover:border-gray-500 transition-colors"
                  >
                    🖨 Print Route Sheet
                  </button>
                </div>
              )}
              {!route.navigation_url && (
                <button
                  onClick={() => printRouteSheet(route)}
                  className="mt-3 text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1 hover:border-gray-500 transition-colors"
                >
                  🖨 Print Route Sheet
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Route Map Visualization */}
      {routes.length > 0 && (
        <div className="bg-gray-900/60 backdrop-blur rounded-xl p-4 border border-gray-800">
          <h3 className="text-white font-semibold mb-3 text-sm">Route Map</h3>
          <ClusterMap routes={routes} height="380px" />
        </div>
      )}

      {routes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-white mb-2">No Routes Generated</h3>
          <p className="text-gray-400">Go back to Filter Orders and generate zones first</p>
        </div>
      )}
    </div>
  );
};

// ============================================================
//  TAB 3 - Route Dispatch
// ============================================================
const RouteDispatchTab = ({ routes, setRoutes }) => {
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [error, setError] = useState('');

  const assignedRoutes = routes.filter(r => r.driver_id);
  const dispatchedRoutes = routes.filter(r => r.status === 'dispatched');

  const handleDispatch = async () => {
    const routesToDispatch = assignedRoutes.filter(r => r.status !== 'dispatched');
    if (routesToDispatch.length === 0) {
      setError('No assigned routes to dispatch');
      return;
    }
    setDispatching(true);
    setError('');
    try {
      const routeIds = routesToDispatch.map(r => r.route_id);
      const data = await ordersAPI.dispatchRoutes(routeIds);
      if (data.success) {
        setDispatchResult(data);
        setRoutes(prev => prev.map(r =>
          routeIds.includes(r.route_id) ? { ...r, status: 'dispatched' } : r
        ));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Dispatch Routes</h2>
          <p className="text-gray-400 text-sm">{assignedRoutes.length} routes ready, {dispatchedRoutes.length} dispatched</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-200 font-bold">&times;</button>
        </div>
      )}

      {dispatchResult && (
        <div className="bg-green-500/20 border border-green-500/40 text-green-300 px-4 py-3 rounded-lg text-sm">
          {dispatchResult.message}
        </div>
      )}

      {/* Route Dispatch Cards */}
      <div className="space-y-3">
        {routes.map((route, i) => (
          <div key={route.route_id} className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{backgroundColor: route.zone_color || ZONE_COLORS[i % ZONE_COLORS.length]}} />
                <div>
                  <h3 className="text-white font-bold text-sm">{route.route_name}</h3>
                  <p className="text-gray-400 text-xs">
                    {route.total_orders} orders  {formatDistance(route.total_distance_km)}  {formatDuration(route.estimated_duration_minutes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {route.driver_name && (
                  <span className="text-gray-300 text-sm">{route.driver_name}</span>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  route.status === 'dispatched' ? 'bg-green-500/20 text-green-400' :
                  route.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                  route.status === 'in_progress' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {route.status === 'dispatched' ? 'Dispatched' :
                   route.status === 'assigned' ? 'Ready' :
                   route.status === 'in_progress' ? 'In Progress' :
                   'Not Assigned'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dispatch Button */}
      {assignedRoutes.length > 0 && dispatchedRoutes.length < routes.length && (
        <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6 text-center">
          <p className="text-gray-400 mb-4">
            Ready to dispatch {assignedRoutes.filter(r => r.status !== 'dispatched').length} routes to drivers
          </p>
          <button
            onClick={handleDispatch}
            disabled={dispatching}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-green-500/20"
          >
            {dispatching ? 'Dispatching...' : 'Dispatch All Routes'}
          </button>
        </div>
      )}

      {/* All Dispatched */}
      {dispatchedRoutes.length > 0 && dispatchedRoutes.length === routes.length && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-400 mb-2">All Routes Dispatched!</h3>
          <p className="text-gray-400">Drivers can now view their assigned routes in the Driver Routes tab</p>
        </div>
      )}

      {routes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📤</div>
          <h3 className="text-xl font-bold text-white mb-2">No Routes to Dispatch</h3>
          <p className="text-gray-400">Generate routes and assign drivers first</p>
        </div>
      )}
    </div>
  );
};

// ============================================================
//  MAIN ORDERS COMPONENT
// ============================================================
const Orders = ({ onNavigateBack, onNavigateToRouteDetail }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Shared state across tabs
  const [orders, setOrders] = useState([]);
  const [postcodeOptions, setPostcodeOptions] = useState([]);
  const [selectedPostcodes, setSelectedPostcodes] = useState([]);
  const [zones, setZones] = useState([]);
  const [routes, setRoutes] = useState([]);

  const tabs = [
    { id: 0, label: 'Filter Orders', icon: '📋' },
    { id: 1, label: 'Route Review', icon: '🗺️' },
    { id: 2, label: 'Dispatch', icon: '🚛' },
  ];

  return (
    <div className="bg-[#0D0B1F] min-h-screen text-white pb-24">
      {/* Header */}
      <div className="bg-[#0D0B1F] border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Orders Management</h1>
              <p className="text-gray-400 text-sm">Manage orders, generate routes, and dispatch to drivers</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 1 && routes.length > 0 && (
                  <span className="bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded-full">{routes.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 0 && (
          <FilterOrdersTab
            orders={orders}
            setOrders={setOrders}
            postcodeOptions={postcodeOptions}
            setPostcodeOptions={setPostcodeOptions}
            selectedPostcodes={selectedPostcodes}
            setSelectedPostcodes={setSelectedPostcodes}
            zones={zones}
            setZones={setZones}
            onProceedToRoutes={() => setActiveTab(1)}
          />
        )}
        {activeTab === 1 && (
          <RouteReviewTab
            zones={zones}
            routes={routes}
            setRoutes={setRoutes}
            onProceedToDispatch={() => setActiveTab(2)}
          />
        )}
        {activeTab === 2 && (
          <RouteDispatchTab
            routes={routes}
            setRoutes={setRoutes}
          />
        )}
      </div>
    </div>
  );
};

export default Orders;

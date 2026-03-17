import React, { useEffect, useRef, useState } from 'react';

// Depot location (Warrington Distribution Centre)
const DEPOT = { lat: 53.3808256, lng: -2.575416, label: 'Depot' };

const ZONE_COLORS = [
  '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF6F61', '#88D8B0',
];

/**
 * ClusterMap – renders an interactive Leaflet map showing:
 *   • Depot pin
 *   • Order markers, colour-coded by zone/cluster
 *   • Optional route polyline(s)
 *
 * Props:
 *   zones   – array of zone objects with `orders`, `color_hex`, `zone_name`
 *   routes  – array of route objects with `orders`, `zone_color`, `route_name`
 *   height  – CSS height string (default "350px")
 *   showLegend – show/hide the colour legend
 */
const ClusterMap = ({ zones = [], routes = [], height = '350px', showLegend = true }) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const [mapError, setMapError] = useState(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Resolve orders + colour from zones OR routes prop
  const resolvedItems = React.useMemo(() => {
    if (zones.length > 0) {
      return zones.map((z, i) => ({
        label: z.zone_name,
        color: z.color_hex || ZONE_COLORS[i % ZONE_COLORS.length],
        orders: z.orders || [],
      }));
    }
    if (routes.length > 0) {
      return routes.map((r, i) => ({
        label: r.route_name,
        color: r.zone_color || ZONE_COLORS[i % ZONE_COLORS.length],
        orders: r.orders || [],
      }));
    }
    return [];
  }, [zones, routes]);

  // All orders with valid coordinates
  const allOrders = React.useMemo(
    () =>
      resolvedItems
        .flatMap((item) =>
          (item.orders || [])
            .filter((o) => o.latitude && o.longitude)
            .map((o) => ({ ...o, _color: item.color, _label: item.label }))
        ),
    [resolvedItems]
  );

  // Load Leaflet CSS and JS dynamically (avoids SSR issues)
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs=';
    script.crossOrigin = '';
    script.onload = () => setLeafletLoaded(true);
    script.onerror = () => setMapError('Failed to load map library');
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // Initialise / update the map whenever data or Leaflet availability changes
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !window.L) return;
    const L = window.L;

    try {
      // Remove previous markers and lines
      markersRef.current.forEach((m) => m.remove());
      polylinesRef.current.forEach((p) => p.remove());
      markersRef.current = [];
      polylinesRef.current = [];

      // Create map if it doesn't exist yet
      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapRef.current, {
          center: [DEPOT.lat, DEPOT.lng],
          zoom: 13,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(leafletMapRef.current);
      }

      const map = leafletMapRef.current;

      // Depot marker (white house icon)
      const depotIcon = L.divIcon({
        html: `<div style="background:#1e293b;border:3px solid #f97316;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏭</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const depotMarker = L.marker([DEPOT.lat, DEPOT.lng], { icon: depotIcon })
        .bindPopup('<b>Depot</b><br>Warrington Distribution Centre')
        .addTo(map);
      markersRef.current.push(depotMarker);

      if (allOrders.length === 0) {
        map.setView([DEPOT.lat, DEPOT.lng], 13);
        return;
      }

      // Order markers
      const bounds = [[DEPOT.lat, DEPOT.lng]];

      allOrders.forEach((order, idx) => {
        const lat = parseFloat(order.latitude);
        const lng = parseFloat(order.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        bounds.push([lat, lng]);

        const orderIcon = L.divIcon({
          html: `<div style="background:${order._color};border:2px solid white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${idx + 1}</div>`,
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const popup = `
          <div style="min-width:160px">
            <b>${order.customer_name || 'Unknown'}</b><br>
            <span style="color:#666;font-size:12px">${order.delivery_address || ''}</span><br>
            <span style="background:${order._color};color:white;padding:2px 6px;border-radius:10px;font-size:11px">${order._label}</span>
            ${order.order_value ? `<br><span style="color:#333">£${Number(order.order_value).toFixed(2)}</span>` : ''}
            ${order.special_instructions ? `<br><i style="color:#666;font-size:11px">${order.special_instructions}</i>` : ''}
          </div>`;

        const marker = L.marker([lat, lng], { icon: orderIcon })
          .bindPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Draw route polylines (if routes provided)
      if (routes.length > 0) {
        routes.forEach((route, ri) => {
          const color = route.zone_color || ZONE_COLORS[ri % ZONE_COLORS.length];
          const pts = [[DEPOT.lat, DEPOT.lng]];
          (route.orders || []).forEach((o) => {
            const lat = parseFloat(o.latitude);
            const lng = parseFloat(o.longitude);
            if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng]);
          });
          pts.push([DEPOT.lat, DEPOT.lng]); // return to depot

          if (pts.length > 2) {
            const line = L.polyline(pts, {
              color,
              weight: 3,
              opacity: 0.7,
              dashArray: '6,4',
            }).addTo(map);
            polylinesRef.current.push(line);
          }
        });
      }

      // Fit map to all markers
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch (err) {
      console.error('Map render error:', err);
      setMapError('Map rendering failed: ' + err.message);
    }
  }, [leafletLoaded, allOrders, routes]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  if (mapError) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded-xl border border-gray-700" style={{ height }}>
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded-xl border border-gray-700" style={{ height }}>
        <div className="text-center text-gray-400">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <p className="text-sm">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-700">
      {/* Leaflet map container */}
      <div ref={mapRef} style={{ height, width: '100%' }} />

      {/* Legend overlay */}
      {showLegend && resolvedItems.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[999] bg-gray-900/90 backdrop-blur rounded-lg p-2 border border-gray-700 max-w-[160px]">
          <p className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">Zones</p>
          {resolvedItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-gray-300 text-xs truncate">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Order count badge */}
      {allOrders.length > 0 && (
        <div className="absolute top-3 left-3 z-[999] bg-gray-900/90 backdrop-blur rounded-lg px-2 py-1 border border-gray-700">
          <span className="text-gray-300 text-xs">{allOrders.length} stops · {resolvedItems.length} zone{resolvedItems.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
};

export default ClusterMap;

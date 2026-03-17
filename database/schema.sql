-- =========================================================
-- xRuto Delivery Routing System - Supabase Schema
-- Run this in Supabase SQL Editor to set up the database
-- =========================================================

-- =========================================================
-- SETTINGS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drivers_today_count INTEGER NOT NULL DEFAULT 5,
  include_admin_as_driver BOOLEAN NOT NULL DEFAULT false,
  navigation_app_preference VARCHAR(20) NOT NULL DEFAULT 'here' CHECK (navigation_app_preference IN ('here', 'google')),
  enable_stock_refill BOOLEAN NOT NULL DEFAULT false,
  max_deliveries_per_route INTEGER NOT NULL DEFAULT 25,
  max_routes_per_day INTEGER NOT NULL DEFAULT 10,
  default_fuel_price DECIMAL(6,3) NOT NULL DEFAULT 1.45,
  enable_help_tooltips BOOLEAN NOT NULL DEFAULT true,
  auto_assign_routes BOOLEAN NOT NULL DEFAULT true,
  route_optimization_method VARCHAR(20) NOT NULL DEFAULT 'distance' CHECK (route_optimization_method IN ('distance', 'time', 'balanced')),
  customer_notifications BOOLEAN NOT NULL DEFAULT true,
  driver_app_enabled BOOLEAN NOT NULL DEFAULT true,
  woocommerce_integration_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_frequency_minutes INTEGER NOT NULL DEFAULT 15,
  enable_real_time_tracking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- DEPOTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS depots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100),
  postcode VARCHAR(20),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 500,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contact_phone VARCHAR(30),
  contact_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- DRIVERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  mpg DECIMAL(6,2) NOT NULL DEFAULT 30.0,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'van',
  vehicle_capacity INTEGER NOT NULL DEFAULT 50,
  license_plate VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available_today BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- WOOCOMMERCE STORES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS woocommerce_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255),
  url VARCHAR(500) NOT NULL,
  consumer_key VARCHAR(500) NOT NULL,
  consumer_secret VARCHAR(500) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- ORDERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR(100),                             -- links to woocommerce_stores.store_id
  wc_order_id VARCHAR(100),                          -- original WooCommerce order ID
  wc_status VARCHAR(50),                             -- WooCommerce order status (e.g. processing)
  source VARCHAR(50) DEFAULT 'manual',               -- 'woocommerce', 'pdf', 'manual', etc.
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30),
  delivery_address VARCHAR(500) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  city VARCHAR(100),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  delivery_date DATE NOT NULL,
  delivery_notes TEXT,
  special_instructions TEXT,
  order_value DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  weight DECIMAL(8,2),
  item_count INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'assigned', 'in_route', 'clustered',
    'dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned'
  )),
  delivery_status VARCHAR(30),                       -- driver-facing delivery status
  failure_reason TEXT,                               -- reason when delivery fails
  route_id UUID,                                     -- set when assigned to a route
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  sequence_number INTEGER,                           -- stop order within a route
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_postcode ON orders(postcode);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_wc_order_id ON orders(wc_order_id);

-- =========================================================
-- ROUTES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name VARCHAR(255) NOT NULL,
  zone_color VARCHAR(10) DEFAULT '#FF6B35',
  depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'generated' CHECK (status IN (
    'generated', 'assigned', 'confirmed', 'dispatched', 'in_progress', 'completed', 'cancelled'
  )),
  total_orders INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  total_distance_km DECIMAL(8,3),
  total_distance_miles DECIMAL(8,3),
  estimated_duration_minutes INTEGER,
  estimated_fuel_cost DECIMAL(8,2),
  actual_fuel_cost DECIMAL(8,2),
  route_efficiency_score DECIMAL(5,2),
  navigation_url TEXT,
  optimization_method VARCHAR(30) DEFAULT 'kmeans',
  depot_returns_needed INTEGER NOT NULL DEFAULT 1,
  route_segments JSONB,                              -- stores segment breakdown
  dispatched_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routes_delivery_date ON routes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_routes_driver_id ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- =========================================================
-- USERS TABLE (for auth beyond hardcoded dev credentials)
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver', 'staff')),
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- SEED DATA - default settings row
-- =========================================================
INSERT INTO settings (
  drivers_today_count, include_admin_as_driver, navigation_app_preference,
  enable_stock_refill, max_deliveries_per_route, max_routes_per_day,
  default_fuel_price, enable_help_tooltips, auto_assign_routes,
  route_optimization_method, customer_notifications, driver_app_enabled,
  woocommerce_integration_enabled, sync_frequency_minutes, enable_real_time_tracking
) VALUES (
  5, false, 'here',
  false, 25, 10,
  1.45, true, true,
  'distance', true, true,
  false, 15, false
) ON CONFLICT DO NOTHING;

-- Seed default depot (Warrington)
INSERT INTO depots (name, address, city, postcode, latitude, longitude, capacity, is_primary, is_active)
VALUES (
  'Warrington Distribution Center',
  'Milton Grove, Latchford, Warrington',
  'Warrington', 'WA4 1EG',
  53.3808256, -2.575416,
  1000, true, true
) ON CONFLICT DO NOTHING;

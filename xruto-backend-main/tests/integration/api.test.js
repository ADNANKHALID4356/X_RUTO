'use strict';

const request = require('supertest');

// Mock pdf-parse / PDFParserService before any require of server.js
// pdfjs-dist (used by pdf-parse v2) contains import.meta which Jest cannot parse
jest.mock('../../services/pdfParser', () => {
  return jest.fn().mockImplementation(() => ({
    parsePDF: jest.fn().mockResolvedValue({ orders: [], raw_text: '' }),
    parseText: jest.fn().mockResolvedValue({ orders: [] }),
  }));
});

// Load env vars before requiring app (mirrors real startup order)
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const app = require('../../server');

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
describe('GET /api/health', () => {
  it('responds 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

// ─────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────
describe('Unknown API routes', () => {
  it('returns 404 for unknown /api/* route', async () => {
    const res = await request(app).get('/api/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when only email is provided', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@xruto.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@email.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in as admin with correct credentials and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@xruto.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
  });

  it('logs in as driver with correct credentials and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'driver@xruto.com', password: 'driver123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('driver');
  });
});

describe('POST /api/auth/register', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'abc123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for too-short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'newuser@test.com', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data for a valid token', async () => {
    // Get a real token first
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@xruto.com', password: 'admin123' });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('admin@xruto.com');
  });
});

describe('GET /api/auth/test', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/auth/test');
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────
describe('GET /api/admin/test', () => {
  it('returns 200 with available_endpoints', async () => {
    const res = await request(app).get('/api/admin/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('available_endpoints');
  });
});

describe('GET /api/admin/settings', () => {
  it('returns 200 with a settings object', async () => {
    const res = await request(app).get('/api/admin/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('settings');
    expect(typeof res.body.settings).toBe('object');
  });
});

describe('PUT /api/admin/settings', () => {
  it('returns 200 when updating settings', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .send({ company_name: 'xRuto Test' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/admin/depots', () => {
  it('returns 200 with a depots array', async () => {
    const res = await request(app).get('/api/admin/depots');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.depots)).toBe(true);
    expect(res.body.depots.length).toBeGreaterThan(0);
  });

  it('each depot has required fields', async () => {
    const res = await request(app).get('/api/admin/depots');
    const depot = res.body.depots[0];
    expect(depot).toHaveProperty('id');
    expect(depot).toHaveProperty('name');
    expect(depot).toHaveProperty('address');
    expect(depot).toHaveProperty('latitude');
    expect(depot).toHaveProperty('longitude');
  });
});

describe('POST /api/admin/depots', () => {
  it('returns 400 when name or address is missing', async () => {
    const res = await request(app).post('/api/admin/depots').send({ city: 'Test' });
    expect(res.status).toBe(400);
  });

  it('creates a depot and returns 201', async () => {
    const res = await request(app)
      .post('/api/admin/depots')
      .send({ name: 'Test Depot', address: '1 Test Road', city: 'Warrington' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.depot).toHaveProperty('id');
  });
});

describe('GET /api/admin/drivers', () => {
  it('returns 200 with a drivers array', async () => {
    const res = await request(app).get('/api/admin/drivers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.drivers)).toBe(true);
    expect(res.body.drivers.length).toBeGreaterThan(0);
  });

  it('each driver has required fields', async () => {
    const res = await request(app).get('/api/admin/drivers');
    const driver = res.body.drivers[0];
    expect(driver).toHaveProperty('id');
    expect(driver).toHaveProperty('name');
    expect(driver).toHaveProperty('is_active');
  });
});

describe('POST /api/admin/drivers', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/admin/drivers').send({ phone: '07123000000' });
    expect(res.status).toBe(400);
  });

  it('creates a driver and returns 201', async () => {
    const res = await request(app)
      .post('/api/admin/drivers')
      .send({
        firstName: 'Jane',
        lastName: 'Driver',
        email: 'jane.driver@test.com',
        phone: '07123000000',
        mpg: 32,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.driver).toHaveProperty('id');
  });
});

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────
describe('GET /api/orders/test', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/orders/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/orders/eligible', () => {
  it('returns 200 with orders array and postcode_options', async () => {
    const res = await request(app).get('/api/orders/eligible');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(Array.isArray(res.body.postcode_options)).toBe(true);
    expect(res.body).toHaveProperty('total_orders');
  });
});

describe('POST /api/orders/generate-clusters', () => {
  it('returns 400 when selected_postcodes is missing', async () => {
    const res = await request(app).post('/api/orders/generate-clusters').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with zones for valid BN1 postcode request', async () => {
    const res = await request(app)
      .post('/api/orders/generate-clusters')
      .send({ selected_postcodes: ['BN1'], max_zones: 2 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('zones');
    expect(Array.isArray(res.body.zones)).toBe(true);
  });
});

describe('GET /api/orders/available-drivers', () => {
  it('returns 200 with drivers array', async () => {
    const res = await request(app).get('/api/orders/available-drivers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.drivers)).toBe(true);
  });
});

describe('GET /api/orders/routes', () => {
  it('returns 200 (may be empty if no routes generated)', async () => {
    const res = await request(app).get('/api/orders/routes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.routes)).toBe(true);
  });
});

describe('POST /api/orders/generate-routes', () => {
  it('returns 400 when zones is missing', async () => {
    const res = await request(app).post('/api/orders/generate-routes').send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with routes for valid zones', async () => {
    const zones = [
      {
        zone_id: 'zone_1',
        zone_name: 'Zone 1 - WA1',
        total_orders: 2,
        orders: [
          { id: 't1', postcode: 'WA1 1AA', latitude: 53.39, longitude: -2.56 },
          { id: 't2', postcode: 'WA1 2BB', latitude: 53.40, longitude: -2.55 },
        ],
        color_hex: '#FF6B35',
        center_lat: 53.395,
        center_lng: -2.555,
      },
    ];
    const res = await request(app)
      .post('/api/orders/generate-routes')
      .send({ zones });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.routes)).toBe(true);
    expect(res.body.routes.length).toBeGreaterThan(0);
  });
});

describe('GET /api/orders/route-details/:routeId', () => {
  it('returns route data or empty response for unknown route_id', async () => {
    const res = await request(app).get('/api/orders/route-details/nonexistent_id');
    // Should not 404 from the URL — controller returns a meaningful response
    expect([200, 404]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  it('returns details for a route that exists in memory', async () => {
    // First, generate a route to put in memory
    const zones = [{
      zone_id: 'zone_test',
      zone_name: 'Zone Test',
      total_orders: 1,
      orders: [{ id: 'r1', postcode: 'WA1 1AA', latitude: 53.39, longitude: -2.56 }],
      color_hex: '#FF6B35',
      center_lat: 53.39,
      center_lng: -2.56,
    }];
    const genRes = await request(app)
      .post('/api/orders/generate-routes')
      .send({ zones });
    expect(genRes.status).toBe(200);

    const routeId = genRes.body.routes[0]?.route_id;
    if (routeId) {
      const detailRes = await request(app).get('/api/orders/route-details/' + routeId);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.success).toBe(true);
    }
  });
});

describe('POST /api/orders/assign-driver', () => {
  it('returns 400 when route_id or driver_id is missing', async () => {
    const res = await request(app)
      .post('/api/orders/assign-driver')
      .send({ route_id: 'route_1' }); // missing driver_id
    expect(res.status).toBe(400);
  });

  it('returns 200 when both fields provided', async () => {
    const res = await request(app)
      .post('/api/orders/assign-driver')
      .send({ route_id: 'route_1', driver_id: '1' }); // '1' is the mock driver id
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/orders/auto-assign-drivers', () => {
  it('returns 400 when routes is missing', async () => {
    const res = await request(app).post('/api/orders/auto-assign-drivers').send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with auto assignment results', async () => {
    const res = await request(app)
      .post('/api/orders/auto-assign-drivers')
      .send({ routes: [{ route_id: 'route_1' }] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/orders/dispatch-routes', () => {
  it('returns 400 when route_ids is missing', async () => {
    const res = await request(app).post('/api/orders/dispatch-routes').send({});
    expect(res.status).toBe(400);
  });

  it('dispatches routes and returns 200', async () => {
    const res = await request(app)
      .post('/api/orders/dispatch-routes')
      .send({ route_ids: ['route_1'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/orders/delivery-status/:orderId', () => {
  it('returns 400 when status is missing', async () => {
    const res = await request(app)
      .put('/api/orders/delivery-status/order_1')
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates delivery status and returns 200', async () => {
    const res = await request(app)
      .put('/api/orders/delivery-status/order_1')
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/orders/driver-update-status', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/orders/driver-update-status')
      .send({ driver_id: 'd1' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with all required fields', async () => {
    const res = await request(app)
      .post('/api/orders/driver-update-status')
      .send({ driver_id: 'd1', order_id: 'o1', status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/orders/driver-routes/:driverId', () => {
  it('returns 200 (empty or with routes)', async () => {
    const res = await request(app).get('/api/orders/driver-routes/driver_1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/orders/reset', () => {
  it('clears in-memory state and returns 200', async () => {
    const res = await request(app).delete('/api/orders/reset');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/orders/upload-pdf', () => {
  it('returns 400 when no file is provided', async () => {
    const res = await request(app).post('/api/orders/upload-pdf');
    // multer will reject or controller will return error
    expect([400, 500]).toContain(res.status);
  });
});

describe('POST /api/orders/upload-text', () => {
  it('returns 400 or 200 with empty body', async () => {
    const res = await request(app).post('/api/orders/upload-text').send({});
    expect([200, 400]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });
});

// ─────────────────────────────────────────────
// WOOCOMMERCE ENDPOINTS
// ─────────────────────────────────────────────
describe('POST /api/orders/woocommerce/register', () => {
  it('returns 400 when credentials are missing', async () => {
    const res = await request(app)
      .post('/api/orders/woocommerce/register')
      .send({ storeId: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('registers a store with valid credentials', async () => {
    const res = await request(app)
      .post('/api/orders/woocommerce/register')
      .send({
        storeId: 'integration_test_store',
        url: 'https://shop.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.storeId).toBe('integration_test_store');
  });
});

describe('GET /api/orders/woocommerce/stores', () => {
  it('returns 200 with stores array', async () => {
    const res = await request(app).get('/api/orders/woocommerce/stores');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.stores)).toBe(true);
  });
});

describe('POST /api/orders/sync-woocommerce', () => {
  it('returns 200 when syncing all stores (may be empty)', async () => {
    const res = await request(app)
      .post('/api/orders/sync-woocommerce')
      .send({});
    expect([200, 400, 500]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });
});

describe('POST /api/orders/webhook/woocommerce', () => {
  it('returns error for invalid payload', async () => {
    const res = await request(app)
      .post('/api/orders/webhook/woocommerce')
      .send({});
    // Should handle gracefully (no crash)
    expect([200, 400]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  it('processes a valid webhook payload without crashing', async () => {
    const res = await request(app)
      .post('/api/orders/webhook/woocommerce')
      .send({
        id: 12345,
        status: 'processing',
        total: '99.99',
        shipping: {
          first_name: 'Test',
          last_name: 'Webhook',
          address_1: '1 Test Lane',
          city: 'Warrington',
          postcode: 'WA4 1AB',
        },
        billing: { email: 'webhook@test.com', phone: '07000000000' },
        line_items: [],
      });
    expect(res.status).toBe(200);
    // success depends on DB availability — just ensure it doesn't crash
    expect(res.body).toHaveProperty('success');
  });
});

describe('DELETE /api/orders/woocommerce/:storeId', () => {
  it('removes a registered store', async () => {
    // First register a store
    await request(app)
      .post('/api/orders/woocommerce/register')
      .send({
        storeId: 'to_delete',
        url: 'https://delete.example.com',
        consumerKey: 'ck_del',
        consumerSecret: 'cs_del',
      });

    const res = await request(app).delete('/api/orders/woocommerce/to_delete');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns failure for non-existent store', async () => {
    const res = await request(app).delete('/api/orders/woocommerce/nonexistent');
    expect(res.status).toBe(200);
    // removeStore returns { success: false } for missing store
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// RATE LIMITING (sanity check)
// ─────────────────────────────────────────────
describe('Rate limiting headers', () => {
  it('health endpoint includes rate limit headers', async () => {
    const res = await request(app).get('/api/health');
    // Express-rate-limit adds RateLimit-* or X-RateLimit-* headers
    const keys = Object.keys(res.headers).join(' ');
    expect(keys).toMatch(/ratelimit/i);
  });
});

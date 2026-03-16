const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer config for PDF uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// Import orders controller
let ordersController;
try {
  ordersController = require('../controllers/ordersController');
  console.log('✅ Orders controller loaded successfully');
} catch (error) {
  console.error('❌ Failed to load orders controller:', error.message);
  throw error;
}

// Validation middleware
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    next();
  };
};

// ===== TAB 1: FILTER ORDERS ROUTES =====

router.get('/eligible', ordersController.getEligibleOrders);

router.post('/generate-clusters',
  validateRequired(['selected_postcodes']),
  ordersController.generateClusters
);

// ===== TAB 2: ROUTE REVIEW ROUTES =====

router.post('/generate-routes',
  validateRequired(['zones']),
  ordersController.generateRoutes
);

router.get('/routes', ordersController.getRoutes);

router.get('/available-drivers', ordersController.getAvailableDrivers);

router.post('/assign-driver',
  validateRequired(['route_id', 'driver_id']),
  ordersController.assignDriver
);

router.post('/auto-assign-drivers',
  validateRequired(['routes']),
  ordersController.autoAssignDrivers
);

// ===== ANALYTICS ROUTE =====

router.get('/analytics', ordersController.getAnalytics);

// ===== TAB 3: ROUTE DISPATCH ROUTES =====

router.post('/dispatch-routes',
  validateRequired(['route_ids']),
  ordersController.dispatchRoutes
);

router.get('/route-details/:routeId', ordersController.getRouteDetails);

router.put('/delivery-status/:orderId',
  validateRequired(['status']),
  ordersController.updateDeliveryStatus
);

// ===== DRIVER APP ROUTES =====

router.get('/driver-routes/:driverId', ordersController.getDriverRoutes);

router.post('/driver-update-status',
  validateRequired(['driver_id', 'order_id', 'status']),
  ordersController.driverUpdateStatus
);

// ===== ORDER UPLOAD ROUTES =====

router.post('/upload-pdf', upload.single('pdf'), ordersController.uploadPDF);

router.post('/test-pdf-parsing', ordersController.testPDFParsing);

router.post('/upload-text', ordersController.uploadText);

router.delete('/reset', ordersController.resetOrders);

// ===== WOOCOMMERCE INTEGRATION =====

let wooCommerceService;
try {
  wooCommerceService = require('../services/woocommerce');
  console.log('✅ WooCommerce service loaded');
} catch (error) {
  console.warn('⚠️ WooCommerce service not available:', error.message);
}

// Register a WooCommerce store
router.post('/woocommerce/register', async (req, res) => {
  try {
    const { storeId, name, url, consumerKey, consumerSecret } = req.body;
    if (!storeId || !url || !consumerKey || !consumerSecret) {
      return res.status(400).json({ success: false, message: 'Missing required fields: storeId, url, consumerKey, consumerSecret' });
    }
    const result = wooCommerceService.registerStore(storeId, { name, url, consumerKey, consumerSecret });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List registered stores
router.get('/woocommerce/stores', async (req, res) => {
  try {
    const stores = wooCommerceService.listStores();
    res.json({ success: true, stores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync orders from a specific store (or all stores)
router.post('/sync-woocommerce', async (req, res) => {
  try {
    const { storeId } = req.body;
    if (storeId) {
      const result = await wooCommerceService.syncStore(storeId);
      return res.json(result);
    }
    const results = await wooCommerceService.syncAllStores();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// WooCommerce webhook receiver
router.post('/webhook/woocommerce', async (req, res) => {
  try {
    const storeId = req.headers['x-wc-store-id'] || req.query.storeId || 'default';
    const signature = req.headers['x-wc-webhook-signature'] || '';
    const result = await wooCommerceService.handleWebhook(storeId, req.body, signature);
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(200).json({ received: true, error: error.message });
  }
});

// Remove a registered store
router.delete('/woocommerce/:storeId', async (req, res) => {
  try {
    const result = wooCommerceService.removeStore(req.params.storeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== TESTING ROUTES =====

router.get('/test-here-api', async (req, res) => {
  try {
    const hereAPI = require('../services/hereAPI');
    const testAddress = 'Latchford, Warrington WA4 1HY, UK';
    const coords = await hereAPI.geocodeAddress(testAddress);

    res.json({
      success: true,
      message: 'HERE API is working correctly',
      test_results: {
        geocoding: { address: testAddress, coordinates: coords },
        api_key_status: process.env.HERE_API_KEY ? 'Configured' : 'Missing'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'HERE API test failed',
      error: error.message,
      api_key_status: process.env.HERE_API_KEY ? 'Configured' : 'Missing'
    });
  }
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Orders routes are working correctly',
    timestamp: new Date().toISOString(),
    available_endpoints: {
      eligible: 'GET /api/orders/eligible',
      generateClusters: 'POST /api/orders/generate-clusters',
      generateRoutes: 'POST /api/orders/generate-routes',
      getRoutes: 'GET /api/orders/routes',
      availableDrivers: 'GET /api/orders/available-drivers',
      assignDriver: 'POST /api/orders/assign-driver',
      autoAssignDrivers: 'POST /api/orders/auto-assign-drivers',
      dispatchRoutes: 'POST /api/orders/dispatch-routes',
      routeDetails: 'GET /api/orders/route-details/:route_id',
      deliveryStatus: 'PUT /api/orders/delivery-status/:order_id',
      driverRoutes: 'GET /api/orders/driver-routes/:driverId',
      driverUpdateStatus: 'POST /api/orders/driver-update-status',
      uploadPDF: 'POST /api/orders/upload-pdf',
      uploadText: 'POST /api/orders/upload-text',
      resetOrders: 'DELETE /api/orders/reset'
    }
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Orders route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error in orders module',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

console.log('✅ Orders routes configured successfully');

module.exports = router;
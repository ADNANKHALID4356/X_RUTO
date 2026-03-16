const express = require('express');
const router = express.Router();

// Import admin controller
let adminController;
try {
  adminController = require('../controllers/adminController');
  console.log('✅ Admin controller loaded successfully');
} catch (error) {
  console.error('❌ Failed to load admin controller:', error.message);
  throw error;
}

// ===== SETTINGS =====
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// ===== DEPOTS =====
router.get('/depots', adminController.getDepots);
router.post('/depots', adminController.addDepot);
router.put('/depots/:id', adminController.updateDepot);
router.delete('/depots/:id', adminController.removeDepot);

// ===== DRIVERS =====
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', adminController.addDriver);
router.put('/drivers/:id', adminController.updateDriver);
router.delete('/drivers/:id', adminController.removeDriver);

// ===== TEST =====
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working correctly',
    timestamp: new Date().toISOString(),
    available_endpoints: {
      getSettings: 'GET /api/admin/settings',
      updateSettings: 'PUT /api/admin/settings',
      getDepots: 'GET /api/admin/depots',
      addDepot: 'POST /api/admin/depots',
      updateDepot: 'PUT /api/admin/depots/:id',
      removeDepot: 'DELETE /api/admin/depots/:id',
      getDrivers: 'GET /api/admin/drivers',
      addDriver: 'POST /api/admin/drivers',
      updateDriver: 'PUT /api/admin/drivers/:id',
      removeDriver: 'DELETE /api/admin/drivers/:id'
    }
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error in admin module',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

console.log('✅ Admin routes configured successfully');

module.exports = router;

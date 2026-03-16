const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'HERE_API_KEY'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn('Missing environment variables: ' + missingVars.join(', ') + '. Some features will use mock data.');
}

const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

app.use(generalLimiter);

// ===== CORS =====
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https:\/\/xruto-frontend.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== BODY PARSING =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== REQUEST LOGGING =====
app.use((req, res, next) => {
  console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.path);
  next();
});

// ===== ROOT ENDPOINTS =====
app.get('/', (req, res) => {
  res.json({
    message: 'xRuto Delivery Routing API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      server: 'running',
      database: process.env.SUPABASE_URL ? 'configured' : 'missing',
      here_api: process.env.HERE_API_KEY ? 'configured' : 'missing'
    }
  };

  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { getSupabase } = require('./config/supabase');
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('settings').select('*').limit(1);
        healthStatus.services.database = error ? 'error' : 'connected';
      }
    } catch (error) {
      healthStatus.services.database = 'error';
    }
  }

  res.json(healthStatus);
});

// ===== MOUNT ROUTERS =====
const adminRoutes = require('./routes/admin');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');

app.use('/api/admin', adminRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/auth', authLimiter, authRoutes);

// ===== ERROR HANDLERS =====
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint ' + req.method + ' ' + req.path + ' not found'
  });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// ===== START SERVER =====
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n xRuto Server Started Successfully!');
    console.log(' Server running on http://0.0.0.0:' + PORT);
    console.log(' Health check: http://0.0.0.0:' + PORT + '/api/health');
    console.log(' Database: ' + (process.env.SUPABASE_URL ? 'Supabase Connected' : 'Mock Data Mode'));
    console.log('\n Available route groups:');
    console.log('   /api/admin/*    -> Admin settings, depots, drivers');
    console.log('   /api/orders/*   -> Orders, clustering, routing, dispatch');
    console.log('   /api/auth/*     -> Authentication');
    console.log('\n Your React frontend should now connect successfully!');
  });
}

module.exports = app;

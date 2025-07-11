require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const integrationsRouter = require('./routes/integrations');
const tagsRouter = require('./routes/tags');
const syncScheduler = require('./utils/syncScheduler');

// Import Supabase manager for health checks
const { getSupabaseManager } = require('./config/supabase');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Global rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint with Supabase connection status
app.get('/health', async (req, res) => {
  const manager = getSupabaseManager();
  const metrics = manager.getConnectionMetrics();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: {
      type: 'supabase',
      health: metrics.health,
      lastHealthCheck: metrics.lastHealthCheck,
      circuitBreakers: {
        query: metrics.circuitBreakerStates.query.state,
        auth: metrics.circuitBreakerStates.auth.state
      },
      successRate: metrics.successRate,
      autoFixRate: metrics.autoFixRate
    }
  });
});

// API routes
app.use('/api/integrations', integrationsRouter);
app.use('/api/tags', tagsRouter);

// Initialize system tags endpoint
app.post('/api/system/initialize', async (req, res) => {
  try {
    const taggingService = require('./services/tagging/TaggingService');
    await taggingService.initializeSystemTags();
    res.json({ message: 'System initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Supabase connection
async function initializeDatabase() {
  const manager = getSupabaseManager();
  
  console.log('Checking Supabase connection...');
  const isHealthy = await manager.performHealthCheck();
  
  if (isHealthy) {
    console.log('✅ Connected to Supabase successfully');
    console.log('Connection metrics:', manager.getConnectionMetrics());
    
    // Start sync scheduler after DB connection
    syncScheduler.start();
  } else {
    console.error('❌ Failed to connect to Supabase');
    console.error('Please check your Supabase credentials in .env file');
    // Don't exit - the self-healing system will retry
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Stop sync scheduler
  syncScheduler.stop();
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  console.log(`🚀 ShipMaster Pro API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Using Supabase with self-healing capabilities`);
  
  // Initialize database connection
  await initializeDatabase();
});

// Monitor Supabase health
setInterval(async () => {
  const manager = getSupabaseManager();
  const metrics = manager.getConnectionMetrics();
  
  if (metrics.health === 'unhealthy') {
    console.warn('⚠️  Supabase connection unhealthy, self-healing in progress...');
  }
  
  // Log circuit breaker warnings
  Object.entries(metrics.circuitBreakerStates).forEach(([type, state]) => {
    if (state.state === 'OPEN') {
      console.warn(`⚠️  Circuit breaker for ${type} is OPEN - will retry in ${Math.round((state.lastFailureTime + 60000 - Date.now()) / 1000)}s`);
    }
  });
}, 30000); // Check every 30 seconds
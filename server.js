const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');
const adsRoutes = require('./routes/ads');

// Import middleware - FIX: Use destructuring
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { autoSeed } = require('./scripts/seedDatabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
    'http://localhost:3000', 
    'http://localhost:3001',
    'https://videomax-admin.onrender.com',
    'https://videomax-users.onrender.com',
    'https://videomax-frontend.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videomax', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('📊 Connected to MongoDB');
  // Auto-seed database if needed
  try {
    await autoSeed();
  } catch (error) {
    console.error('Auto-seed failed:', error);
  }
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ads', adsRoutes);

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: '🎬 Welcome to ViewMaxx API',
    version: '1.0.0',
    author: 'MiniMax Agent',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      videos: '/api/videos',
      admin: '/api/admin',
      upload: '/api/upload',
      analytics: '/api/analytics',
      ads: '/api/ads'
    }
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed.');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ViewMaxx Backend Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('\n📋 Available Endpoints:');
  console.log('   • Auth: /api/auth');
  console.log('   • Users: /api/users');
  console.log('   • Videos: /api/videos');
  console.log('   • Admin: /api/admin');
  console.log('   • Upload: /api/upload');
  console.log('   • Analytics: /api/analytics');
  console.log('   • Ads: /api/ads');
  console.log('\n✅ Server ready to handle requests!');
});

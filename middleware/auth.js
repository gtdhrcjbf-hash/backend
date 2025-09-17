const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Regular authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization');

    // Check if no token
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const actualToken = token.slice(7);

    // Verify token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.user.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Add user to request object
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    next();
  } catch (error) {
    // If auth middleware failed, the error response is already sent
    if (!res.headersSent) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization');

    if (!token || !token.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const actualToken = token.slice(7);
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');

    if (user && user.isActive && !user.isLocked) {
      req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, continue without user
    req.user = null;
    next();
  }
};

// Rate limiting middleware for authentication attempts
const rateLimitAuth = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }

    // Check current attempts
    const currentAttempts = attempts.get(key) || [];
    
    if (currentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((currentAttempts[0] + windowMs - now) / 1000)
      });
    }

    // Record this attempt if authentication fails
    const originalJson = res.json;
    res.json = function(data) {
      if (data && !data.success && (res.statusCode === 401 || res.statusCode === 400)) {
        currentAttempts.push(now);
        attempts.set(key, currentAttempts);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware to check user ownership of resource
const checkOwnership = (Model, resourceField = 'uploadedBy') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.videoId || req.params.resourceId;
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Check if user owns the resource or is admin
      const ownerId = resource[resourceField] ? resource[resourceField].toString() : null;
      
      if (ownerId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource.'
        });
      }

      // Add resource to request for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error in ownership verification'
      });
    }
  };
};

// Middleware to validate JWT token format
const validateTokenFormat = (req, res, next) => {
  const token = req.header('Authorization');
  
  if (token && !token.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token format. Use Bearer token.'
    });
  }
  
  next();
};

// Middleware to check if user can perform action based on subscription
const checkSubscriptionAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id);
    
    // Add subscription check logic here
    // For now, all authenticated users have access
    req.userSubscription = {
      type: 'free', // free, premium, pro
      features: ['basic_upload', 'basic_streaming']
    };

    next();
  } catch (error) {
    console.error('Subscription access error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in subscription verification'
    });
  }
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  rateLimitAuth,
  checkOwnership,
  validateTokenFormat,
  checkSubscriptionAccess
};

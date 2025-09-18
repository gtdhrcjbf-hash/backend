const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('provider').optional().isIn(['local', 'google', 'facebook', 'apple']).withMessage('Invalid provider'),
  body('providerId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, phone, password, provider, providerId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        email ? { email } : {},
        username ? { username } : {},
        phone ? { phone } : {},
        providerId ? { providerId } : {}
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email, username, phone, or social account'
      });
    }

    let hashedPassword = undefined;
    if (provider === 'local' || !provider) {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required for local registration' });
      }
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create user
    const user = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      provider: provider || 'local',
      providerId: providerId || null
    });

    await user.save();

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('provider').optional().isIn(['local', 'google', 'facebook', 'apple']).withMessage('Invalid provider'),
  body('providerId').optional().isString(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, phone, password, provider, providerId } = req.body;

    // Find user by email, phone, or providerId
    let user;
    if (provider && provider !== 'local') {
      user = await User.findOne({ provider, providerId });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Social account not registered' });
      }
    } else if (phone) {
      user = await User.findOne({ phone });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Phone not registered' });
      }
      if (!user.password) {
        return res.status(400).json({ success: false, message: 'Phone login not supported for social accounts' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    } else if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Email not registered' });
      }
      if (!user.password) {
        return res.status(400).json({ success: false, message: 'Email login not supported for social accounts' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Missing login credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

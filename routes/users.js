const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('subscribers', 'username avatar')
      .populate('subscriptions', 'username avatar');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  body('website').optional().isURL().withMessage('Invalid website URL')
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

    const { username, bio, website, avatar } = req.body;

    // Check if username is already taken
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, bio, website, avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/users/subscribe/:userId
// @desc    Subscribe to user
// @access  Private
router.post('/subscribe/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot subscribe to yourself'
      });
    }

    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already subscribed
    if (user.subscriptions.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already subscribed to this user'
      });
    }

    // Add subscription
    user.subscriptions.push(userId);
    targetUser.subscribers.push(req.user.id);

    await user.save();
    await targetUser.save();

    res.json({
      success: true,
      message: 'Subscribed successfully'
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/users/unsubscribe/:userId
// @desc    Unsubscribe from user
// @access  Private
router.delete('/unsubscribe/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove subscription
    user.subscriptions.pull(userId);
    targetUser.subscribers.pull(req.user.id);

    await user.save();
    await targetUser.save();

    res.json({
      success: true,
      message: 'Unsubscribed successfully'
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:userId
// @desc    Get user by ID
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -email')
      .populate('subscribers', 'username avatar')
      .populate('subscriptions', 'username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's videos
    const videos = await Video.find({ 
      uploadedBy: req.params.userId,
      isPrivate: false 
    }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        user,
        videos,
        stats: {
          totalVideos: videos.length,
          totalSubscribers: user.subscribers.length,
          totalSubscriptions: user.subscriptions.length
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private - Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: users.length,
          totalUsers: total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/users/:userId
// @desc    Delete user (Admin only)
// @access  Private - Admin
router.delete('/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also delete user's videos
    await Video.deleteMany({ uploadedBy: req.params.userId });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -preferences')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's public videos
    const videos = await Video.find({
      user: user._id,
      status: 'published',
      visibility: 'public'
    })
    .select('title thumbnail views likes createdAt duration')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

    res.json({
      success: true,
      user: {
        ...user,
        videoCount: videos.length
      },
      videos
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { bio: { $regex: q, $options: 'i' } }
          ]
        },
        { isActive: true },
        { role: 'user' } // Only show regular users in search
      ]
    })
    .select('name avatar bio subscriberCount totalViews')
    .sort({ subscriberCount: -1, totalViews: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

    const total = await User.countDocuments({
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { bio: { $regex: q, $options: 'i' } }
          ]
        },
        { isActive: true },
        { role: 'user' }
      ]
    });

    res.json({
      success: true,
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
});

module.exports = router;

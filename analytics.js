const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Check admin role
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

// @route   GET /api/analytics/overview
// @desc    Get platform overview analytics
// @access  Admin
router.get('/overview', [auth, adminAuth], async (req, res) => {
  try {
    const [userStats, videoStats] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            }
          }
        }
      ]),
      
      // Video statistics  
      Video.aggregate([
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            publishedVideos: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' }
          }
        }
      ])
    ]);

    // Get recent activity
    const recentVideos = await Video.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title views likes createdAt user');

    const topVideos = await Video.find({ status: 'published' })
      .populate('user', 'name')
      .sort({ views: -1 })
      .limit(5)
      .select('title views likes user');

    res.json({
      success: true,
      analytics: {
        overview: {
          userStats: userStats[0] || {
            totalUsers: 0,
            activeUsers: 0
          },
          videoStats: videoStats[0] || {
            totalVideos: 0,
            publishedVideos: 0,
            totalViews: 0,
            totalLikes: 0
          }
        },
        recentVideos,
        topVideos
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

// @route   GET /api/analytics/user
// @desc    Get analytics for current user's content
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const userVideos = await Video.find({ user: req.user._id })
      .select('title views likes createdAt status')
      .sort({ createdAt: -1 });

    const stats = await Video.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          publishedVideos: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        stats: stats[0] || {
          totalVideos: 0,
          totalViews: 0,
          totalLikes: 0,
          publishedVideos: 0
        },
        videos: userVideos
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user analytics'
    });
  }
});

// @route   GET /api/analytics/video/:id
// @desc    Get analytics for specific video
// @access  Private (video owner or admin)
router.get('/video/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      analytics: {
        video: {
          id: video._id,
          title: video.title,
          views: video.views,
          likes: video.likes,
          status: video.status,
          publishedAt: video.publishedAt,
          createdAt: video.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Video analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching video analytics'
    });
  }
});

module.exports = router;

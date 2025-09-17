const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/videos/:videoId
// @desc    Get analytics for a specific video
// @access  Private
router.get('/videos/:videoId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('uploadedBy', 'username');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (video.uploadedBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this video'
      });
    }

    const analytics = {
      videoId: video._id,
      title: video.title,
      views: video.views,
      likes: video.likes.length,
      dislikes: video.dislikes.length,
      comments: video.comments.length,
      uploadDate: video.createdAt,
      duration: video.duration || 0,
      category: video.category,
      tags: video.tags,
      engagement: {
        likeRatio: video.views > 0 ? ((video.likes.length / video.views) * 100).toFixed(2) : 0,
        commentRatio: video.views > 0 ? ((video.comments.length / video.views) * 100).toFixed(2) : 0,
        engagementScore: video.views > 0 ? (((video.likes.length + video.comments.length) / video.views) * 100).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get video analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/user/overview
// @desc    Get user's channel analytics overview
// @access  Private
router.get('/user/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's videos
    const videos = await Video.find({ uploadedBy: userId });

    // Calculate analytics
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
    const totalLikes = videos.reduce((sum, video) => sum + video.likes.length, 0);
    const totalComments = videos.reduce((sum, video) => sum + video.comments.length, 0);

    // Get subscriber count
    const user = await User.findById(userId).select('subscribers');
    const subscriberCount = user.subscribers.length;

    // Most viewed video
    const mostViewedVideo = videos.reduce((max, video) => 
      video.views > (max?.views || 0) ? video : max, null);

    // Recent performance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVideos = videos.filter(video => video.createdAt >= thirtyDaysAgo);
    const recentViews = recentVideos.reduce((sum, video) => sum + video.views, 0);

    // Category breakdown
    const categoryBreakdown = videos.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      overview: {
        totalVideos,
        totalViews,
        totalLikes,
        totalComments,
        subscriberCount,
        avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
        avgLikesPerVideo: totalVideos > 0 ? Math.round(totalLikes / totalVideos) : 0
      },
      recentPerformance: {
        videosLast30Days: recentVideos.length,
        viewsLast30Days: recentViews
      },
      topVideo: mostViewedVideo ? {
        id: mostViewedVideo._id,
        title: mostViewedVideo.title,
        views: mostViewedVideo.views,
        likes: mostViewedVideo.likes.length
      } : null,
      categoryBreakdown
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/user/videos
// @desc    Get analytics for all user's videos
// @access  Private
router.get('/user/videos', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt'; // views, likes, comments, createdAt
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    let sortObject = {};
    if (sortBy === 'likes') {
      // For likes, we need to sort by array length, which requires aggregation
      const videos = await Video.aggregate([
        { $match: { uploadedBy: userId } },
        { $addFields: { likesCount: { $size: '$likes' } } },
        { $sort: { likesCount: sortOrder } },
        { $skip: skip },
        { $limit: limit }
      ]);

      const total = await Video.countDocuments({ uploadedBy: userId });

      const analyticsData = videos.map(video => ({
        id: video._id,
        title: video.title,
        views: video.views,
        likes: video.likes.length,
        dislikes: video.dislikes.length,
        comments: video.comments.length,
        createdAt: video.createdAt,
        category: video.category,
        isPrivate: video.isPrivate,
        thumbnailUrl: video.thumbnailUrl
      }));

      return res.json({
        success: true,
        data: {
          videos: analyticsData,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: analyticsData.length,
            totalVideos: total
          }
        }
      });
    } else {
      // For other fields, use regular sorting
      sortObject[sortBy] = sortOrder;
      
      const videos = await Video.find({ uploadedBy: userId })
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .select('title views likes dislikes comments createdAt category isPrivate thumbnailUrl');

      const total = await Video.countDocuments({ uploadedBy: userId });

      const analyticsData = videos.map(video => ({
        id: video._id,
        title: video.title,
        views: video.views,
        likes: video.likes.length,
        dislikes: video.dislikes.length,
        comments: video.comments.length,
        createdAt: video.createdAt,
        category: video.category,
        isPrivate: video.isPrivate,
        thumbnailUrl: video.thumbnailUrl
      }));

      res.json({
        success: true,
        data: {
          videos: analyticsData,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: analyticsData.length,
            totalVideos: total
          }
        }
      });
    }
  } catch (error) {
    console.error('Get user videos analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/admin/platform
// @desc    Get platform-wide analytics (Admin only)
// @access  Private - Admin
router.get('/admin/platform', adminAuth, async (req, res) => {
  try {
    const timeRange = req.query.range || '30d'; // 7d, 30d, 90d, 1y, all
    
    let dateFilter = {};
    const now = new Date();
    
    if (timeRange !== 'all') {
      switch (timeRange) {
        case '7d':
          dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
          break;
        case '30d':
          dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) } };
          break;
        case '90d':
          dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 90)) } };
          break;
        case '1y':
          dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
          break;
      }
    }

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments(dateFilter);
    const activeUsers = await User.countDocuments({ isActive: true });

    // Video statistics
    const totalVideos = await Video.countDocuments();
    const newVideos = await Video.countDocuments(dateFilter);
    
    const totalViews = await Video.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    const viewsInRange = await Video.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    // Category popularity
    const categoryStats = await Video.aggregate([
      { $group: { 
        _id: '$category', 
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        avgViews: { $avg: '$views' }
      }},
      { $sort: { count: -1 } }
    ]);

    // Top creators
    const topCreators = await Video.aggregate([
      { $group: { 
        _id: '$uploadedBy',
        videoCount: { $sum: 1 },
        totalViews: { $sum: '$views' }
      }},
      { $sort: { totalViews: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        username: '$user.username',
        videoCount: 1,
        totalViews: 1
      }}
    ]);

    const analytics = {
      timeRange,
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
      },
      videos: {
        total: totalVideos,
        new: newVideos,
        totalViews: totalViews[0]?.total || 0,
        viewsInRange: viewsInRange[0]?.total || 0,
        avgViewsPerVideo: totalVideos > 0 ? Math.round((totalViews[0]?.total || 0) / totalVideos) : 0
      },
      categoryStats,
      topCreators
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/trending
// @desc    Get trending content analytics
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const period = req.query.period || '24h'; // 24h, 7d, 30d
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now.setHours(now.getHours() - 24)) } };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) } };
        break;
    }

    const trendingVideos = await Video.find({
      ...dateFilter,
      isPrivate: false
    })
    .populate('uploadedBy', 'username avatar')
    .sort({ views: -1, likes: -1 })
    .limit(20)
    .select('title views likes comments createdAt category thumbnailUrl');

    const trendingCategories = await Video.aggregate([
      { $match: { ...dateFilter, isPrivate: false } },
      { $group: { 
        _id: '$category',
        videoCount: { $sum: 1 },
        totalViews: { $sum: '$views' },
        avgViews: { $avg: '$views' }
      }},
      { $sort: { totalViews: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        trendingVideos,
        trendingCategories
      }
    });
  } catch (error) {
    console.error('Get trending analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

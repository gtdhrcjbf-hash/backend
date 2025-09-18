const express = require('express');
const { body, validationResult } = require('express-validator');
const Video = require('../models/Video');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// @route   GET /api/videos
// @desc    Get all public videos
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    let filter = { isPrivate: false };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const videos = await Video.find(filter)
      .populate('uploadedBy', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(filter);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: videos.length,
          totalVideos: total
        }
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Get video by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || video.isPrivate) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch video' });
  }
});

// @route   GET /api/videos/search
// @desc    Search videos by title, tags, or category
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    } : {};
    const videos = await Video.find({ ...query, isPrivate: false });
    res.json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// @route   POST /api/videos
// @desc    Upload new video
// @access  Private
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('videoUrl').isURL().withMessage('Invalid video URL'),
  body('thumbnailUrl').optional().isURL().withMessage('Invalid thumbnail URL'),
  body('category').isIn(['gaming', 'music', 'sports', 'news', 'entertainment', 'education', 'technology', 'other']).withMessage('Invalid category')
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

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      category,
      tags,
      isPrivate = false
    } = req.body;

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnailUrl,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPrivate,
      uploadedBy: req.user.id
    });

    await video.save();

    await video.populate('uploadedBy', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: video
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters')
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

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video'
      });
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'username avatar');

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: updatedVideo
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video or is admin
    if (video.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video'
      });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/videos/:id/like
// @desc    Like/Unlike video
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const userId = req.user.id;
    const likeIndex = video.likes.indexOf(userId);
    const dislikeIndex = video.dislikes.indexOf(userId);

    if (likeIndex > -1) {
      // Already liked, remove like
      video.likes.splice(likeIndex, 1);
    } else {
      // Add like
      video.likes.push(userId);
      // Remove dislike if exists
      if (dislikeIndex > -1) {
        video.dislikes.splice(dislikeIndex, 1);
      }
    }

    await video.save();

    res.json({
      success: true,
      message: 'Video like status updated',
      data: {
        likes: video.likes.length,
        dislikes: video.dislikes.length,
        userLiked: video.likes.includes(userId),
        userDisliked: video.dislikes.includes(userId)
      }
    });
  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/videos/:id/dislike
// @desc    Dislike/Remove dislike video
// @access  Private
router.post('/:id/dislike', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const userId = req.user.id;
    const likeIndex = video.likes.indexOf(userId);
    const dislikeIndex = video.dislikes.indexOf(userId);

    if (dislikeIndex > -1) {
      // Already disliked, remove dislike
      video.dislikes.splice(dislikeIndex, 1);
    } else {
      // Add dislike
      video.dislikes.push(userId);
      // Remove like if exists
      if (likeIndex > -1) {
        video.likes.splice(likeIndex, 1);
      }
    }

    await video.save();

    res.json({
      success: true,
      message: 'Video dislike status updated',
      data: {
        likes: video.likes.length,
        dislikes: video.dislikes.length,
        userLiked: video.likes.includes(userId),
        userDisliked: video.dislikes.includes(userId)
      }
    });
  } catch (error) {
    console.error('Dislike video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/videos/:id/comment
// @desc    Add comment to video
// @access  Private
router.post('/:id/comment', [
  auth,
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters')
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

    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const newComment = {
      user: req.user.id,
      text: req.body.text,
      createdAt: new Date()
    };

    video.comments.unshift(newComment);
    await video.save();

    await video.populate('comments.user', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: video.comments[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/videos/:videoId/comment/:commentId
// @desc    Delete comment
// @access  Private
router.delete('/:videoId/comment/:commentId', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const comment = video.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    comment.remove();
    await video.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/videos/trending
// @desc    Get trending videos
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const videos = await Video.find({ isPrivate: false })
      .populate('uploadedBy', 'username avatar')
      .sort({ views: -1, likes: -1 })
      .limit(20);

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    console.error('Get trending videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/videos/:id/hls/:resolution/index.m3u8
// @desc    Serve HLS playlist for a video resolution
// @access  Public
router.get('/:id/hls/:resolution/index.m3u8', async (req, res) => {
  try {
    const { id, resolution } = req.params;
    const video = await Video.findById(id);
    if (!video || video.isPrivate) {
      return res.status(404).send('Video not found');
    }
    const hlsPath = path.join(__dirname, `../uploads/converted/${video.filename.split('.')[0]}/${resolution}_hls/index.m3u8`);
    if (!fs.existsSync(hlsPath)) {
      return res.status(404).send('HLS playlist not found');
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    fs.createReadStream(hlsPath).pipe(res);
  } catch (error) {
    res.status(500).send('Failed to serve HLS playlist');
  }
});

// @route   GET /api/videos/:id/hls/:resolution/:segment
// @desc    Serve HLS segment (.ts) for a video resolution
// @access  Public
router.get('/:id/hls/:resolution/:segment', async (req, res) => {
  try {
    const { id, resolution, segment } = req.params;
    const video = await Video.findById(id);
    if (!video || video.isPrivate) {
      return res.status(404).send('Video not found');
    }
    const segmentPath = path.join(__dirname, `../uploads/converted/${video.filename.split('.')[0]}/${resolution}_hls/${segment}`);
    if (!fs.existsSync(segmentPath)) {
      return res.status(404).send('Segment not found');
    }
    res.setHeader('Content-Type', 'video/MP2T');
    fs.createReadStream(segmentPath).pipe(res);
  } catch (error) {
    res.status(500).send('Failed to serve HLS segment');
  }
});

module.exports = router;

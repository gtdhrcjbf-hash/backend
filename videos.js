const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/videos
// @desc    Get all published videos
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const videos = await Video.find({ status: 'published' })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Video.countDocuments({ status: 'published' });

    res.json({
      success: true,
      videos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalVideos: total
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching videos'
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Get single video
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('user', 'name avatar subscriberCount');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching video'
    });
  }
});

// @route   POST /api/videos
// @desc    Create new video
// @access  Private
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('videoUrl').isURL().withMessage('Valid video URL is required'),
  body('thumbnailUrl').optional().isURL()
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

    const { title, description, videoUrl, thumbnailUrl, category } = req.body;

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnailUrl,
      category: category || 'Other',
      user: req.user._id
    });

    await video.save();
    await video.populate('user', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      video
    });
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating video'
    });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video
// @access  Private (own videos only)
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
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

    const { title, description, category } = req.body;

    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (category) video.category = category;

    await video.save();

    res.json({
      success: true,
      message: 'Video updated successfully',
      video
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating video'
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video
// @access  Private (own videos only)
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
    if (video.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
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
      message: 'Server error while deleting video'
    });
  }
});

module.exports = router;

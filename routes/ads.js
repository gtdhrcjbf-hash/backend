const express = require('express');
const { body, validationResult } = require('express-validator');
const Ad = require('../models/Ad');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/ads
// @desc    Get all active ads
// @access  Public
router.get('/', async (req, res) => {
  try {
    const ads = await Ad.find({ 
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: ads
    });
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/ads/position/:position
// @desc    Get ads by position
// @access  Public
router.get('/position/:position', async (req, res) => {
  try {
    const { position } = req.params;
    
    const ads = await Ad.find({ 
      position,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: ads
    });
  } catch (error) {
    console.error('Get ads by position error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ads
// @desc    Create new ad (Admin only)
// @access  Private - Admin
router.post('/', [
  adminAuth,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('imageUrl').isURL().withMessage('Invalid image URL'),
  body('targetUrl').isURL().withMessage('Invalid target URL'),
  body('position').isIn(['banner', 'sidebar', 'popup', 'video-overlay']).withMessage('Invalid position'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1-10')
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
      imageUrl,
      targetUrl,
      position,
      startDate,
      endDate,
      priority = 5
    } = req.body;

    // Check if end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const ad = new Ad({
      title,
      description,
      imageUrl,
      targetUrl,
      position,
      startDate,
      endDate,
      priority,
      createdBy: req.user.id
    });

    await ad.save();

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      data: ad
    });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/ads/:id
// @desc    Update ad (Admin only)
// @access  Private - Admin
router.put('/:id', [
  adminAuth,
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
  body('targetUrl').optional().isURL().withMessage('Invalid target URL'),
  body('position').optional().isIn(['banner', 'sidebar', 'popup', 'video-overlay']).withMessage('Invalid position'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1-10')
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

    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      message: 'Ad updated successfully',
      data: ad
    });
  } catch (error) {
    console.error('Update ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/ads/:id
// @desc    Delete ad (Admin only)
// @access  Private - Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ads/:id/click
// @desc    Track ad click
// @access  Public
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Increment click count
    ad.clicks = (ad.clicks || 0) + 1;
    await ad.save();

    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Track ad click error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ads/:id/impression
// @desc    Track ad impression
// @access  Public
router.post('/:id/impression', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Increment impression count
    ad.impressions = (ad.impressions || 0) + 1;
    await ad.save();

    res.json({
      success: true,
      message: 'Impression tracked successfully'
    });
  } catch (error) {
    console.error('Track ad impression error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/ads/admin/all
// @desc    Get all ads for admin (including inactive)
// @access  Private - Admin
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ads = await Ad.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ad.countDocuments();

    res.json({
      success: true,
      data: {
        ads,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: ads.length,
          totalAds: total
        }
      }
    });
  } catch (error) {
    console.error('Get all ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PATCH /api/ads/:id/toggle
// @desc    Toggle ad active status (Admin only)
// @access  Private - Admin
router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    ad.isActive = !ad.isActive;
    await ad.save();

    res.json({
      success: true,
      message: `Ad ${ad.isActive ? 'activated' : 'deactivated'} successfully`,
      data: ad
    });
  } catch (error) {
    console.error('Toggle ad status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

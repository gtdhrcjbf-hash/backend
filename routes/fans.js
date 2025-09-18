const express = require('express');
const { auth } = require('../middleware/auth');
const FanSupport = require('../models/FanSupport');
const Subscription = require('../models/Subscription');

const router = express.Router();

// @route   POST /api/fans/support
// @desc    Send tip/donation to creator
// @access  Private
router.post('/support', auth, async (req, res) => {
  try {
    const { creator, amount, message, method } = req.body;
    if (!creator || !amount || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const support = new FanSupport({
      creator,
      supporter: req.user.id,
      amount,
      message,
      method
    });
    await support.save();
    res.status(201).json({ success: true, data: support });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send support' });
  }
});

// @route   POST /api/fans/subscribe
// @desc    Subscribe to creator (premium or regular)
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { creator, isPremium, paymentMethod } = req.body;
    if (!creator) {
      return res.status(400).json({ success: false, message: 'Creator required' });
    }
    const subscription = new Subscription({
      user: req.user.id,
      creator,
      isPremium: !!isPremium,
      paymentMethod
    });
    await subscription.save();
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

// @route   GET /api/fans/my-support
// @desc    Get my sent supports
// @access  Private
router.get('/my-support', auth, async (req, res) => {
  try {
    const supports = await FanSupport.find({ supporter: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: supports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch supports' });
  }
});

// @route   GET /api/fans/my-subscriptions
// @desc    Get my subscriptions
// @access  Private
router.get('/my-subscriptions', auth, async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.user.id }).sort({ startDate: -1 });
    res.json({ success: true, data: subs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

module.exports = router;

const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Payout = require('../models/Payout');

const router = express.Router();

// @route   POST /api/payouts/request
// @desc    Request payout (mid-month or monthly)
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Qualification: 100+ fans, 10,000+ views in last 30 days
    const fans = user.subscribers.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentViews = await User.aggregate([
      { $match: { _id: user._id } },
      { $project: { recentViews: { $filter: { input: '$viewsHistory', as: 'view', cond: { $gte: ['$$view.date', thirtyDaysAgo] } } } } }
    ]);
    const views = recentViews[0]?.recentViews?.reduce((sum, v) => sum + v.count, 0) || 0;
    if (fans < 100 || views < 10000) {
      return res.status(400).json({ success: false, message: 'Not eligible for payout (need 100+ fans and 10,000+ views in 30 days)' });
    }

    const { amount, method, details } = req.body;
    if (!amount || !method) {
      return res.status(400).json({ success: false, message: 'Amount and method required' });
    }

    const payout = new Payout({
      creator: user._id,
      amount,
      method,
      details
    });
    await payout.save();
    res.status(201).json({ success: true, message: 'Payout requested', data: payout });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request payout' });
  }
});

// @route   GET /api/payouts/my
// @desc    Get my payout requests
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const payouts = await Payout.find({ creator: req.user.id }).sort({ requestedAt: -1 });
    res.json({ success: true, data: payouts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
});

module.exports = router;

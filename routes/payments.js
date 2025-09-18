const express = require('express');
const { auth } = require('../middleware/auth');
const Payment = require('../models/Payment');

const router = express.Router();

// @route   POST /api/payments/initiate
// @desc    Initiate payment (Stripe, PayPal, Mobile Money, Crypto)
// @access  Private
router.post('/initiate', auth, async (req, res) => {
  try {
    const { amount, currency, provider, details } = req.body;
    if (!amount || !provider) {
      return res.status(400).json({ success: false, message: 'Amount and provider required' });
    }
    // Placeholder: integrate with actual payment APIs here
    const payment = new Payment({
      user: req.user.id,
      amount,
      currency,
      provider,
      details
    });
    await payment.save();
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});

// @route   GET /api/payments/my
// @desc    Get my payments
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

module.exports = router;

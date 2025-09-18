const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['paypal', 'bank', 'mobile_money', 'crypto'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date,
    default: null
  },
  details: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model('Payout', payoutSchema);

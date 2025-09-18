const mongoose = require('mongoose');

const fanSupportSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    maxlength: 250
  },
  method: {
    type: String,
    enum: ['paypal', 'stripe', 'mobile_money', 'crypto'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FanSupport', fanSupportSchema);

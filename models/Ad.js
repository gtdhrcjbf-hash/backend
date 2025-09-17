const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  imageUrl: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true,
    enum: ['banner', 'sidebar', 'popup', 'video-overlay'],
    default: 'banner'
  },
  type: {
    type: String,
    enum: ['image', 'video', 'carousel', 'text'],
    default: 'image'
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  targetAudience: {
    ageGroups: [{
      type: String,
      enum: ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
    }],
    interests: [{
      type: String,
      enum: ['gaming', 'music', 'sports', 'news', 'entertainment', 'education', 'technology', 'lifestyle']
    }],
    regions: [{
      type: String // country codes
    }],
    languages: [{
      type: String
    }]
  },
  budget: {
    total: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    },
    daily: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  metrics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    reach: {
      type: Number,
      default: 0
    },
    frequency: {
      type: Number,
      default: 0
    }
  },
  pricing: {
    model: {
      type: String,
      enum: ['cpm', 'cpc', 'cpa', 'fixed'],
      default: 'cpm'
    },
    rate: {
      type: Number,
      default: 0
    },
    minBid: {
      type: Number,
      default: 0
    },
    maxBid: {
      type: Number,
      default: 0
    }
  },
  schedule: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    hours: {
      start: {
        type: Number,
        min: 0,
        max: 23,
        default: 0
      },
      end: {
        type: Number,
        min: 0,
        max: 23,
        default: 23
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  advertiser: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    website: String,
    company: String,
    phone: String
  },
  content: {
    headline: String,
    subtext: String,
    callToAction: {
      type: String,
      default: 'Learn More'
    },
    videoUrl: String, // for video ads
    carouselImages: [String], // for carousel ads
    additionalText: String
  },
  tracking: {
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    conversionPixel: String,
    customEvents: [{
      name: String,
      value: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'requires_changes'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date,
    rejectionReason: String,
    reviewNotes: String
  },
  performance: {
    ctr: {
      type: Number,
      default: 0 // click-through rate
    },
    cpm: {
      type: Number,
      default: 0 // cost per mille
    },
    cpc: {
      type: Number,
      default: 0 // cost per click
    },
    cpa: {
      type: Number,
      default: 0 // cost per acquisition
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
adSchema.index({ isActive: 1 });
adSchema.index({ position: 1 });
adSchema.index({ startDate: 1, endDate: 1 });
adSchema.index({ priority: -1 });
adSchema.index({ createdBy: 1 });
adSchema.index({ 'approval.status': 1 });
adSchema.index({ createdAt: -1 });

// Virtual for CTR (Click-Through Rate)
adSchema.virtual('ctr').get(function() {
  if (this.metrics.impressions === 0) return 0;
  return (this.metrics.clicks / this.metrics.impressions) * 100;
});

// Virtual for conversion rate
adSchema.virtual('conversionRate').get(function() {
  if (this.metrics.clicks === 0) return 0;
  return (this.metrics.conversions / this.metrics.clicks) * 100;
});

// Virtual for cost per click
adSchema.virtual('actualCPC').get(function() {
  if (this.metrics.clicks === 0) return 0;
  return this.budget.spent / this.metrics.clicks;
});

// Virtual for cost per mille
adSchema.virtual('actualCPM').get(function() {
  if (this.metrics.impressions === 0) return 0;
  return (this.budget.spent / this.metrics.impressions) * 1000;
});

// Virtual to check if ad is currently active
adSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         this.endDate >= now &&
         this.approval.status === 'approved';
});

// Virtual to check if budget is exhausted
adSchema.virtual('isBudgetExhausted').get(function() {
  return this.budget.spent >= this.budget.total;
});

// Instance method to record impression
adSchema.methods.recordImpression = function() {
  this.metrics.impressions += 1;
  return this.save();
};

// Instance method to record click
adSchema.methods.recordClick = function() {
  this.metrics.clicks += 1;
  // Update CTR
  this.performance.ctr = (this.metrics.clicks / this.metrics.impressions) * 100;
  return this.save();
};

// Instance method to record conversion
adSchema.methods.recordConversion = function() {
  this.metrics.conversions += 1;
  // Update conversion rate
  this.performance.conversionRate = (this.metrics.conversions / this.metrics.clicks) * 100;
  return this.save();
};

// Instance method to add spend
adSchema.methods.addSpend = function(amount) {
  this.budget.spent += amount;
  // Update cost metrics
  if (this.metrics.clicks > 0) {
    this.performance.cpc = this.budget.spent / this.metrics.clicks;
  }
  if (this.metrics.impressions > 0) {
    this.performance.cpm = (this.budget.spent / this.metrics.impressions) * 1000;
  }
  return this.save();
};

// Instance method to approve ad
adSchema.methods.approve = function(reviewerId, notes = '') {
  this.approval.status = 'approved';
  this.approval.reviewedBy = reviewerId;
  this.approval.reviewDate = new Date();
  this.approval.reviewNotes = notes;
  return this.save();
};

// Instance method to reject ad
adSchema.methods.reject = function(reviewerId, reason, notes = '') {
  this.approval.status = 'rejected';
  this.approval.reviewedBy = reviewerId;
  this.approval.reviewDate = new Date();
  this.approval.rejectionReason = reason;
  this.approval.reviewNotes = notes;
  return this.save();
};

// Static method to find active ads by position
adSchema.statics.findActiveByPosition = function(position) {
  const now = new Date();
  return this.find({
    position: position,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    'approval.status': 'approved'
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to find ads pending approval
adSchema.statics.findPendingApproval = function() {
  return this.find({
    'approval.status': 'pending'
  }).sort({ createdAt: 1 });
};

// Static method to get performance statistics
adSchema.statics.getPerformanceStats = function(dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalImpressions: { $sum: '$metrics.impressions' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalConversions: { $sum: '$metrics.conversions' },
        totalSpent: { $sum: '$budget.spent' },
        avgCTR: { $avg: '$performance.ctr' },
        avgCPC: { $avg: '$performance.cpc' },
        avgCPM: { $avg: '$performance.cpm' }
      }
    }
  ]);
};

// Pre-save middleware
adSchema.pre('save', function(next) {
  // Validate date range
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  
  // Auto-generate UTM parameters if not provided
  if (!this.tracking.utmSource) {
    this.tracking.utmSource = 'viewmaxx_ads';
  }
  if (!this.tracking.utmMedium) {
    this.tracking.utmMedium = this.position;
  }
  
  next();
});

// Ensure virtual fields are serialized
adSchema.set('toJSON', {
  virtuals: true
});

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad;

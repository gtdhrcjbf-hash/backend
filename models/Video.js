const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  convertedVideos: {
    type: Object,
    default: {}
  },
  hlsStreams: {
    type: Object,
    default: {}
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  duration: {
    type: Number, // duration in seconds
    default: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['gaming', 'music', 'sports', 'news', 'entertainment', 'education', 'technology', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  isPrivate: {
    type: Boolean,
    default: false
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: null
  },
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '1440p', '4k'],
    default: '720p'
  },
  fileSize: {
    type: Number, // file size in bytes
    default: 0
  },
  filename: {
    type: String,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },
  uploadProgress: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  metadata: {
    resolution: {
      width: Number,
      height: Number
    },
    frameRate: Number,
    bitrate: Number,
    codec: String
  },
  analytics: {
    watchTime: {
      type: Number,
      default: 0 // total watch time in seconds
    },
    averageWatchTime: {
      type: Number,
      default: 0 // average watch time per view
    },
    completionRate: {
      type: Number,
      default: 0 // percentage of viewers who watched till end
    },
    clickThroughRate: {
      type: Number,
      default: 0 // percentage of impressions that resulted in views
    },
    impressions: {
      type: Number,
      default: 0 // how many times video was shown in search/recommendations
    }
  },
  monetization: {
    isMonetized: {
      type: Boolean,
      default: false
    },
    adRevenue: {
      type: Number,
      default: 0
    },
    sponsorships: [{
      sponsor: String,
      amount: Number,
      startDate: Date,
      endDate: Date
    }]
  },
  restrictions: {
    ageRestricted: {
      type: Boolean,
      default: false
    },
    regions: [{
      type: String // country codes where video is blocked
    }],
    contentWarnings: [{
      type: String,
      enum: ['violence', 'language', 'adult', 'sensitive']
    }]
  }
}, {
  timestamps: true
});

// Indexes for better performance
videoSchema.index({ uploadedBy: 1 });
videoSchema.index({ category: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ isPrivate: 1 });
videoSchema.index({ isBlocked: 1 });
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for like count
videoSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for dislike count
videoSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

// Virtual for comment count
videoSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for engagement score
videoSchema.virtual('engagementScore').get(function() {
  if (this.views === 0) return 0;
  return ((this.likes.length + this.comments.length) / this.views) * 100;
});

// Virtual for like ratio
videoSchema.virtual('likeRatio').get(function() {
  const totalReactions = this.likes.length + this.dislikes.length;
  if (totalReactions === 0) return 0;
  return (this.likes.length / totalReactions) * 100;
});

// Instance method to check if user liked the video
videoSchema.methods.isLikedBy = function(userId) {
  return this.likes.includes(userId);
};

// Instance method to check if user disliked the video
videoSchema.methods.isDislikedBy = function(userId) {
  return this.dislikes.includes(userId);
};

// Instance method to increment view count
videoSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to add watch time
videoSchema.methods.addWatchTime = function(seconds) {
  this.analytics.watchTime += seconds;
  if (this.views > 0) {
    this.analytics.averageWatchTime = this.analytics.watchTime / this.views;
  }
  return this.save();
};

// Instance method to get public data
videoSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    videoUrl: this.videoUrl,
    thumbnailUrl: this.thumbnailUrl,
    duration: this.duration,
    category: this.category,
    tags: this.tags,
    uploadedBy: this.uploadedBy,
    views: this.views,
    likeCount: this.likes.length,
    dislikeCount: this.dislikes.length,
    commentCount: this.comments.length,
    quality: this.quality,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find trending videos
videoSchema.statics.findTrending = function(limit = 20) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.find({
    isPrivate: false,
    isBlocked: false,
    createdAt: { $gte: sevenDaysAgo }
  })
  .sort({ views: -1, likes: -1 })
  .limit(limit)
  .populate('uploadedBy', 'username avatar');
};

// Static method to find videos by category
videoSchema.statics.findByCategory = function(category, limit = 20) {
  return this.find({
    category: category,
    isPrivate: false,
    isBlocked: false
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('uploadedBy', 'username avatar');
};

// Pre-save middleware
videoSchema.pre('save', function(next) {
  // Auto-generate thumbnail URL if not provided
  if (!this.thumbnailUrl && this.videoUrl) {
    // This is a placeholder - in production, you'd generate actual thumbnails
    this.thumbnailUrl = this.videoUrl.replace(/\.[^/.]+$/, '_thumb.jpg');
  }
  
  // Ensure tags are lowercase and trimmed
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }
  
  next();
});

// Post-save middleware to update user's video count
videoSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    const videoCount = await mongoose.model('Video').countDocuments({
      uploadedBy: doc.uploadedBy,
      isPrivate: false
    });
    
    await User.findByIdAndUpdate(doc.uploadedBy, {
      totalVideos: videoCount
    });
  } catch (error) {
    console.error('Error updating user video count:', error);
  }
});

// Ensure virtual fields are serialized
videoSchema.set('toJSON', {
  virtuals: true
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;

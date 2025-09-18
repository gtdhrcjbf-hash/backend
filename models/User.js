const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    unique: false,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    unique: false,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple'],
    default: 'local'
  },
  providerId: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  website: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalVideos: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String,
    tiktok: String
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      newSubscribers: {
        type: Boolean,
        default: true
      },
      videoComments: {
        type: Boolean,
        default: true
      },
      videoLikes: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showSubscriptions: {
        type: Boolean,
        default: true
      },
      allowMessaging: {
        type: Boolean,
        default: true
      }
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name if needed in future
userSchema.virtual('subscriberCount').get(function() {
  return this.subscribers.length;
});

userSchema.virtual('subscriptionCount').get(function() {
  return this.subscriptions.length;
});

// Check if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to handle subscriber counts
userSchema.pre('save', function(next) {
  // You can add logic here if needed
  next();
});

// Instance method to check if user is subscribed to another user
userSchema.methods.isSubscribedTo = function(userId) {
  return this.subscriptions.includes(userId);
};

// Instance method to get public profile
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    website: this.website,
    subscriberCount: this.subscribers.length,
    subscriptionCount: this.subscriptions.length,
    totalVideos: this.totalVideos,
    totalViews: this.totalViews,
    socialLinks: this.socialLinks,
    createdAt: this.createdAt
  };
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role: role, isActive: true });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpire;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;

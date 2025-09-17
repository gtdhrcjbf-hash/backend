const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Video = require('../models/Video');
const Ad = require('../models/Ad');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - only for development)
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      await Video.deleteMany({});
      await Ad.deleteMany({});
      console.log('📝 Cleared existing data');
    }

    // Create admin user
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const admin = new User({
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@viewmaxx.com',
      password: adminPassword,
      role: 'admin',
      isEmailVerified: true,
      bio: 'Platform Administrator',
      isActive: true
    });

    await admin.save();
    console.log('👑 Admin user created');

    // Create sample users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const password = await bcrypt.hash(`user${i}123`, 10);
      const user = new User({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: password,
        role: 'user',
        isEmailVerified: true,
        bio: `Sample user ${i} bio`,
        isActive: true,
        totalVideos: 0,
        totalViews: 0
      });
      
      const savedUser = await user.save();
      users.push(savedUser);
    }
    console.log('👥 Sample users created');

    // Create sample videos
    const sampleVideos = [
      {
        title: 'Welcome to ViewMaxx',
        description: 'A comprehensive guide to using ViewMaxx platform',
        category: 'education',
        tags: ['tutorial', 'guide', 'viewmaxx'],
        views: 1250,
        uploadedBy: users[0]._id
      },
      {
        title: 'Gaming Highlights 2025',
        description: 'Best gaming moments from this year',
        category: 'gaming',
        tags: ['gaming', 'highlights', '2025'],
        views: 890,
        uploadedBy: users[1]._id
      },
      {
        title: 'Tech News Weekly',
        description: 'Latest technology updates and reviews',
        category: 'technology',
        tags: ['tech', 'news', 'reviews'],
        views: 567,
        uploadedBy: users[2]._id
      },
      {
        title: 'Music Production Basics',
        description: 'Learn the fundamentals of music production',
        category: 'music',
        tags: ['music', 'production', 'tutorial'],
        views: 423,
        uploadedBy: users[3]._id
      },
      {
        title: 'Sports Commentary',
        description: 'Analysis of recent sports events',
        category: 'sports',
        tags: ['sports', 'commentary', 'analysis'],
        views: 334,
        uploadedBy: users[4]._id
      }
    ];

    for (const videoData of sampleVideos) {
      const video = new Video({
        ...videoData,
        videoUrl: `https://example.com/videos/${videoData.title.toLowerCase().replace(/\s+/g, '-')}.mp4`,
        thumbnailUrl: `https://example.com/thumbnails/${videoData.title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        duration: Math.floor(Math.random() * 600) + 60, // Random duration between 1-10 minutes
        isPrivate: false,
        isProcessing: false,
        processingStatus: 'completed',
        quality: '720p',
        fileSize: Math.floor(Math.random() * 100000000) + 10000000, // Random file size
        mimeType: 'video/mp4'
      });

      // Add some random likes and comments
      const likeCount = Math.floor(Math.random() * 50) + 5;
      for (let j = 0; j < likeCount; j++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        if (!video.likes.includes(randomUser._id)) {
          video.likes.push(randomUser._id);
        }
      }

      // Add some comments
      const commentCount = Math.floor(Math.random() * 10) + 1;
      for (let j = 0; j < commentCount; j++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        video.comments.push({
          user: randomUser._id,
          text: `This is a sample comment ${j + 1} on ${video.title}`,
          createdAt: new Date()
        });
      }

      await video.save();
    }
    console.log('🎥 Sample videos created');

    // Create sample ads
    const sampleAds = [
      {
        title: 'ViewMaxx Premium',
        description: 'Upgrade to ViewMaxx Premium for ad-free experience',
        imageUrl: 'https://example.com/ads/premium-banner.jpg',
        targetUrl: 'https://viewmaxx.com/premium',
        position: 'banner',
        priority: 8,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: admin._id,
        advertiser: {
          name: 'ViewMaxx',
          email: 'ads@viewmaxx.com',
          company: 'ViewMaxx Inc.'
        },
        approval: {
          status: 'approved',
          reviewedBy: admin._id,
          reviewDate: new Date()
        }
      },
      {
        title: 'Creator Tools',
        description: 'Powerful tools for content creators',
        imageUrl: 'https://example.com/ads/creator-tools.jpg',
        targetUrl: 'https://viewmaxx.com/creator-tools',
        position: 'sidebar',
        priority: 6,
        startDate: new Date(),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        createdBy: admin._id,
        advertiser: {
          name: 'ViewMaxx',
          email: 'ads@viewmaxx.com',
          company: 'ViewMaxx Inc.'
        },
        approval: {
          status: 'approved',
          reviewedBy: admin._id,
          reviewDate: new Date()
        }
      }
    ];

    for (const adData of sampleAds) {
      const ad = new Ad(adData);
      await ad.save();
    }
    console.log('📢 Sample ads created');

    // Add some subscriptions between users
    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < users.length; j++) {
        if (i !== j && Math.random() > 0.6) { // 40% chance of subscription
          if (!users[i].subscriptions.includes(users[j]._id)) {
            users[i].subscriptions.push(users[j]._id);
            users[j].subscribers.push(users[i]._id);
          }
        }
      }
      await users[i].save();
    }
    console.log('🔔 User subscriptions created');

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Created: ${users.length + 1} users, ${sampleVideos.length} videos, ${sampleAds.length} ads`);
    
    return {
      success: true,
      message: 'Database seeded successfully',
      data: {
        users: users.length + 1,
        videos: sampleVideos.length,
        ads: sampleAds.length
      }
    };

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

// Function to check if database needs seeding
const shouldSeed = async () => {
  try {
    const userCount = await User.countDocuments();
    const videoCount = await Video.countDocuments();
    
    // Seed if there are no users or very few users
    return userCount === 0 || videoCount === 0;
  } catch (error) {
    console.error('Error checking if database should be seeded:', error);
    return false;
  }
};

// Auto-seed function that only seeds if needed
const autoSeed = async () => {
  try {
    if (await shouldSeed()) {
      console.log('🔍 Database appears to be empty, starting auto-seed...');
      await seedDatabase();
    } else {
      console.log('📊 Database already has data, skipping auto-seed');
    }
  } catch (error) {
    console.error('Auto-seed failed:', error);
    // Don't throw error here, let the app continue even if seeding fails
  }
};

// Function to reset database (development only)
const resetDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Database reset is only allowed in development environment');
  }

  try {
    console.log('🔄 Resetting database...');
    await User.deleteMany({});
    await Video.deleteMany({});
    await Ad.deleteMany({});
    console.log('🗑️ Database cleared');
    
    await seedDatabase();
    console.log('✅ Database reset and seeded successfully!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
};

module.exports = {
  seedDatabase,
  autoSeed,
  shouldSeed,
  resetDatabase
};

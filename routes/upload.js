const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const Video = require('../models/Video');
const { convertVideo, resolutions } = require('../services/videoProcessor');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadsDir;
    
    if (file.fieldname === 'video') {
      uploadPath = path.join(uploadsDir, 'videos');
    } else if (file.fieldname === 'thumbnail') {
      uploadPath = path.join(uploadsDir, 'thumbnails');
    } else if (file.fieldname === 'avatar') {
      uploadPath = path.join(uploadsDir, 'avatars');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for different file types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  } else if (file.fieldname === 'thumbnail' || file.fieldname === 'avatar') {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  } else {
    cb(new Error('Invalid field name'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: fileFilter
});

// @route   POST /api/upload/video
// @desc    Upload video file
// @access  Private
router.post('/video', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: videoUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video'
    });
  }
});

// @route   POST /api/upload/thumbnail
// @desc    Upload thumbnail image
// @access  Private
router.post('/thumbnail', auth, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail file uploaded'
      });
    }

    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: thumbnailUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload thumbnail'
    });
  }
});

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file uploaded'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: avatarUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
});

// @route   POST /api/upload/complete
// @desc    Complete video upload with metadata and convert to multiple resolutions
// @access  Private
router.post('/complete', auth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, tags, category, isPrivate } = req.body;

    if (!req.files || !req.files.video) {
      return res.status(400).json({
        success: false,
        message: 'Video file is required'
      });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const videoUrl = `/uploads/videos/${videoFile.filename}`;
    const thumbnailUrl = thumbnailFile ? `/uploads/thumbnails/${thumbnailFile.filename}` : null;

    // Convert video to multiple resolutions
    const convertedDir = path.join(uploadsDir, 'converted', videoFile.filename.split('.')[0]);
    await new Promise((resolve, reject) => {
      convertVideo(videoFile.path, convertedDir, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Build converted video URLs
    const convertedVideos = {};
    resolutions.forEach(res => {
      convertedVideos[res.name] = `/uploads/converted/${videoFile.filename.split('.')[0]}/${res.name}.mp4`;
    });

    // Create video document
    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnailUrl,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      category,
      isPrivate: isPrivate === 'true',
      uploadedBy: req.user.id,
      filename: videoFile.filename,
      fileSize: videoFile.size,
      mimeType: videoFile.mimetype,
      convertedVideos // new field for adaptive streaming
    });

    await video.save();

    res.status(201).json({
      success: true,
      message: 'Video uploaded, converted, and saved successfully',
      data: video
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    // Clean up uploaded files if database save fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to complete upload'
    });
  }
});

// @route   DELETE /api/upload/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete('/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { type } = req.query; // video, thumbnail, or avatar

    let filePath;
    switch (type) {
      case 'video':
        filePath = path.join(uploadsDir, 'videos', filename);
        break;
      case 'thumbnail':
        filePath = path.join(uploadsDir, 'thumbnails', filename);
        break;
      case 'avatar':
        filePath = path.join(uploadsDir, 'avatars', filename);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid file type'
        });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// @route   GET /api/upload/progress/:uploadId
// @desc    Get upload progress (placeholder for future implementation)
// @access  Private
router.get('/progress/:uploadId', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Upload progress tracking not implemented yet',
    data: {
      uploadId: req.params.uploadId,
      progress: 100,
      status: 'completed'
    }
  });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 500MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
  }
  
  res.status(400).json({
    success: false,
    message: error.message || 'Upload error occurred'
  });
});

module.exports = router;

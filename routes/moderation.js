const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Report = require('../models/Report');

const router = express.Router();

// @route   POST /api/moderation/report
// @desc    Report content (video, comment, user)
// @access  Private
router.post('/report', auth, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ success: false, message: 'Missing report fields' });
    }
    const report = new Report({
      reportedBy: req.user.id,
      targetType,
      targetId,
      reason
    });
    await report.save();
    res.status(201).json({ success: true, message: 'Report submitted', data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
});

// @route   GET /api/moderation/reports
// @desc    List all reports (admin)
// @access  Admin
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// @route   POST /api/moderation/reports/:id/resolve
// @desc    Resolve a report (admin)
// @access  Admin
router.post('/reports/:id/resolve', adminAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.moderator = req.user.id;
    await report.save();
    res.json({ success: true, message: 'Report resolved', data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
});

module.exports = router;

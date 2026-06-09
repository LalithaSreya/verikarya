const mongoose = require('mongoose');
const Review = require('../models/Review');
const Task = require('../models/Task');
const Visit = require('../models/Visit');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get all reviews (Filterable by status, default: pending)
// @route   GET /api/reviews
// @access  Private (Manager only)
const getReviews = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    
    // Fetch reviews
    const reviews = await Review.find({ status })
      .populate('reviewer', 'name email')
      .sort({ reviewedAt: -1 });

    // Manually populate the task/visit/attendance details and assignee
    const populatedReviews = await Promise.all(
      reviews.map(async (review) => {
        let details = null;
        
        if (review.type === 'task') {
          details = await Task.findById(review.referenceId)
            .populate('assignedTo', 'name email')
            .populate('evidence');
        } else if (review.type === 'visit') {
          details = await Visit.findById(review.referenceId)
            .populate('assignedTo', 'name email')
            .populate('evidence');
        } else if (review.type === 'attendance_checkin' || review.type === 'attendance_checkout') {
          const att = await Attendance.findById(review.referenceId)
            .populate('user', 'name email');
          
          if (att) {
            // Adapt the attendance schema to fit the general review structure in the frontend
            details = {
              _id: att._id,
              title: review.type === 'attendance_checkin' ? 'Daily Clock-In Verification' : 'Daily Clock-Out Verification',
              description: `Verification for daily attendance on ${att.date}`,
              assignedTo: att.user,
              verificationCode: review.type === 'attendance_checkin' ? att.checkInCode : att.checkOutCode,
              evidence: {
                photoPath: review.type === 'attendance_checkin' ? att.checkInPhoto : att.checkOutPhoto,
                timestamp: review.type === 'attendance_checkin' ? att.checkIn : att.checkOut,
                notes: review.type === 'attendance_checkin' ? `Clocked in today at date: ${att.date}` : `Clocked out today at date: ${att.date}`
              }
            };
          }
        }

        return {
          _id: review._id,
          reviewer: review.reviewer,
          referenceId: review.referenceId,
          type: review.type,
          status: review.status,
          comments: review.comments,
          reviewedAt: review.reviewedAt,
          details
        };
      })
    );

    // Filter out reviews where the details/item was deleted
    const filteredReviews = populatedReviews.filter(r => r.details !== null);

    res.status(200).json({
      success: true,
      count: filteredReviews.length,
      data: filteredReviews
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Submit approval or rejection for a task/visit/attendance evidence
// @route   POST /api/reviews/:id
// @access  Private (Manager only)
const submitReview = async (req, res) => {
  try {
    const { status, comments } = req.body; // status: 'approved' | 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Please submit a valid status (approved or rejected)' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review record not found' });
    }

    review.status = status;
    review.comments = comments || '';
    review.reviewer = req.user.id;
    review.reviewedAt = new Date();
    await review.save();

    // If it's an attendance review, update the Attendance collection fields too
    if (review.type === 'attendance_checkin') {
      const att = await Attendance.findById(review.referenceId);
      if (att) {
        att.checkInReviewStatus = status;
        att.checkInComments = comments || '';
        await att.save();
      }
    } else if (review.type === 'attendance_checkout') {
      const att = await Attendance.findById(review.referenceId);
      if (att) {
        att.checkOutReviewStatus = status;
        att.checkOutComments = comments || '';
        await att.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Submission successfully ${status}`,
      data: review
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get dashboard analytics metrics
// @route   GET /api/reviews/analytics
// @access  Private (Manager only)
const getAnalytics = async (req, res) => {
  try {
    const todayStr = getLocalDateString();

    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const presentToday = await Attendance.countDocuments({ date: todayStr });
    
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const pendingTasks = await Task.countDocuments({ status: { $ne: 'completed' } });

    const totalVisits = await Visit.countDocuments();
    const submittedVisits = await Visit.countDocuments({ status: 'submitted' });

    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedActivities = await Review.countDocuments({ status: 'approved' });
    const rejectedActivities = await Review.countDocuments({ status: 'rejected' });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks
        },
        visits: {
          total: totalVisits,
          submitted: submittedVisits
        },
        reviews: {
          pending: pendingReviews,
          approved: approvedActivities,
          rejected: rejectedActivities
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all simulated WhatsApp logs
// @route   GET /api/reviews/whatsapp-logs
// @access  Private (Manager only)
const getWhatsAppLogs = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, error: 'Database not connected' });
    }
    const logs = await mongoose.connection.db
      .collection('whatsapp_logs')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getReviews,
  submitReview,
  getAnalytics,
  getWhatsAppLogs
};

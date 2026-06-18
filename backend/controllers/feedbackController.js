const Feedback = require('../models/Feedback');
const Task = require('../models/Task');
const Visit = require('../models/Visit');

// @desc    Submit customer feedback/review
// @route   POST /api/feedback/submit
// @access  Public (Client rating submission page)
const submitFeedback = async (req, res) => {
  try {
    const { referenceId, refModel, rating, comments } = req.body;

    if (!referenceId || !refModel || !rating) {
      return res.status(400).json({ success: false, error: 'Please provide reference ID, type, and rating' });
    }

    if (!['Task', 'Visit'].includes(refModel)) {
      return res.status(400).json({ success: false, error: 'Invalid reference model type' });
    }

    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be a number between 1 and 5' });
    }

    let technicianId = null;
    let clientName = '';
    let clientPhone = '';

    // Find technician and client details from referenced Task or Visit
    if (refModel === 'Task') {
      const task = await Task.findById(referenceId);
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task reference not found' });
      }
      technicianId = task.assignedTo;
      clientName = 'Corporate Client';
      clientPhone = task.clientPhone || '';
    } else {
      const visit = await Visit.findById(referenceId);
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit reference not found' });
      }
      technicianId = visit.assignedTo;
      clientName = visit.clientName;
      clientPhone = visit.clientPhone || '';
    }

    // Check if feedback already exists for this reference
    let feedback = await Feedback.findOne({ referenceId, refModel });

    if (feedback) {
      feedback.rating = ratingVal;
      feedback.comments = comments || '';
      await feedback.save();
    } else {
      feedback = await Feedback.create({
        referenceId,
        refModel,
        rating: ratingVal,
        comments: comments || '',
        clientName,
        clientPhone,
        technician: technicianId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: feedback
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all feedback/reviews
// @route   GET /api/feedback
// @access  Private (Manager only)
const getFeedbackLogs = async (req, res) => {
  try {
    const feedbackList = await Feedback.find({})
      .populate('technician', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbackList.length,
      data: feedbackList
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get basic task/visit details for public feedback page
// @route   GET /api/feedback/details/:type/:id
// @access  Public
const getFeedbackDetails = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['Task', 'Visit'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid reference type' });
    }

    let details = {};
    if (type === 'Task') {
      const task = await Task.findById(id).populate('assignedTo', 'name');
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
      details = {
        clientName: 'Corporate Client',
        purpose: task.title,
        technicianName: task.assignedTo ? task.assignedTo.name : 'Technician'
      };
    } else {
      const visit = await Visit.findById(id).populate('assignedTo', 'name');
      if (!visit) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
      details = {
        clientName: visit.clientName,
        purpose: visit.purpose,
        technicianName: visit.assignedTo ? visit.assignedTo.name : 'Technician'
      };
    }

    res.status(200).json({
      success: true,
      data: details
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback record not found' });
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDeleteFeedback = async (req, res) => {
  try {
    const { feedbackIds } = req.body;
    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of feedback IDs to delete' });
    }

    await Feedback.deleteMany({ _id: { $in: feedbackIds } });

    res.status(200).json({
      success: true,
      message: `${feedbackIds.length} feedback logs deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  submitFeedback,
  getFeedbackLogs,
  getFeedbackDetails,
  deleteFeedback,
  bulkDeleteFeedback
};

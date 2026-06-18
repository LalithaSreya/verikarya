const express = require('express');
const {
  submitFeedback,
  getFeedbackLogs,
  getFeedbackDetails,
  deleteFeedback,
  bulkDeleteFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/submit', submitFeedback);
router.get('/details/:type/:id', getFeedbackDetails);
router.get('/', protect, authorize('manager'), getFeedbackLogs);
router.delete('/:id', protect, authorize('manager'), deleteFeedback);
router.delete('/', protect, authorize('manager'), bulkDeleteFeedback);

module.exports = router;

const express = require('express');
const {
  submitFeedback,
  getFeedbackLogs,
  getFeedbackDetails
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/submit', submitFeedback);
router.get('/details/:type/:id', getFeedbackDetails);
router.get('/', protect, authorize('manager'), getFeedbackLogs);

module.exports = router;

const express = require('express');
const {
  getReviews,
  submitReview,
  getAnalytics,
  getWhatsAppLogs,
  deleteReview,
  bulkDeleteReviews,
  deleteWhatsAppLog,
  bulkDeleteWhatsAppLogs
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes protected
router.use(authorize('manager')); // Only managers can access these routes

router.get('/whatsapp-logs', getWhatsAppLogs);
router.delete('/whatsapp-logs/:id', deleteWhatsAppLog);
router.delete('/whatsapp-logs', bulkDeleteWhatsAppLogs);
router.get('/analytics', getAnalytics);
router.get('/', getReviews);
router.delete('/:id', deleteReview);
router.delete('/', bulkDeleteReviews);
router.post('/:id', submitReview);

module.exports = router;

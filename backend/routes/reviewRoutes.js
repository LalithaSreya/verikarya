const express = require('express');
const {
  getReviews,
  submitReview,
  getAnalytics
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes protected
router.use(authorize('manager')); // Only managers can access these routes

router.get('/', getReviews);
router.post('/:id', submitReview);
router.get('/analytics', getAnalytics);

module.exports = router;

const express = require('express');
const {
  getProductivityAnalytics,
  getExecutiveAnalytics
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('manager'));

router.get('/productivity', getProductivityAnalytics);
router.get('/executive', getExecutiveAnalytics);

module.exports = router;

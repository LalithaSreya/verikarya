const express = require('express');
const {
  requestAttendanceCode,
  checkIn,
  checkOut,
  getTodayStatus,
  getAttendanceHistory
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes are protected

router.post('/request-code', requestAttendanceCode);
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/today', getTodayStatus);
router.get('/history', getAttendanceHistory);

module.exports = router;

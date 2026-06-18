const express = require('express');
const {
  requestAttendanceCode,
  checkIn,
  checkOut,
  getTodayStatus,
  getAttendanceHistory,
  deleteAttendance,
  bulkDeleteAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes are protected

router.post('/request-code', requestAttendanceCode);
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/today', getTodayStatus);
router.get('/history', getAttendanceHistory);
router.delete('/:id', authorize('manager'), deleteAttendance);
router.delete('/', authorize('manager'), bulkDeleteAttendance);

module.exports = router;

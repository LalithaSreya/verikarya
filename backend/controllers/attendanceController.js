const Attendance = require('../models/Attendance');
const VerificationCode = require('../models/VerificationCode');
const Review = require('../models/Review');
const User = require('../models/User');
const { generateVerificationCode } = require('../utils/codeGenerator');
const { saveImage } = require('../services/storageService');
const { isWithinGeofence } = require('../services/locationService');

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Request verification code for Attendance Clock In / Out
// @route   POST /api/attendance/request-code
// @access  Private (Employee only)
const requestAttendanceCode = async (req, res) => {
  try {
    const { action } = req.body; // 'checkin' or 'checkout'

    if (!action || !['checkin', 'checkout'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Please specify a valid action (checkin or checkout)' });
    }

    const type = action === 'checkin' ? 'attendance_checkin' : 'attendance_checkout';
    const codeString = generateVerificationCode();

    // Clean up any previously generated unused attendance codes for this user
    await VerificationCode.deleteMany({ referenceId: req.user.id, type });

    // Store in DB
    await VerificationCode.create({
      code: codeString,
      referenceId: req.user.id,
      type,
      generatedFor: req.user.id
    });

    res.status(200).json({
      success: true,
      code: codeString
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Check-in for today (verified with Camera, Code & GPS)
// @route   POST /api/attendance/checkin
// @access  Private (Employee only)
const checkIn = async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    const { photo, verificationCode, location } = req.body;

    if (!photo || !verificationCode) {
      return res.status(400).json({ success: false, error: 'Please provide camera photo proof and check-in verification code' });
    }

    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Current GPS coordinates are required to clock in.' });
    }
    
    // Check if there is an active session
    const activeSession = await Attendance.findOne({ user: req.user.id, checkOut: null });
    if (activeSession) {
      return res.status(400).json({ success: false, error: 'You are already checked in. Please check out first before clocking in again.' });
    }

    // Verify GPS Geofence (100 meters range from assigned office premises)
    const employee = await User.findById(req.user.id);
    const officeLoc = employee.officeLocation || { lat: 12.9715987, lng: 77.5945627 };

    const geofenceResult = isWithinGeofence(
      location.lat,
      location.lng,
      officeLoc.lat,
      officeLoc.lng,
      100 // 100 meters geofence
    );

    if (!geofenceResult.isWithin) {
      return res.status(400).json({
        success: false,
        error: `Clock-in rejected. You are currently ${geofenceResult.distance} meters away from your assigned office premises. You must be within 100 meters to clock in.`,
        distance: geofenceResult.distance
      });
    }

    // Verify verification code
    const codeRecord = await VerificationCode.findOne({
      code: verificationCode,
      referenceId: req.user.id,
      type: 'attendance_checkin',
      isUsed: false
    });

    if (!codeRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired check-in verification code' });
    }

    // Save image
    const photoPath = await saveImage(photo, 'checkin');

    // Create attendance record
    const attendance = await Attendance.create({
      user: req.user.id,
      date: todayStr,
      checkIn: new Date(),
      checkInPhoto: photoPath,
      checkInCode: verificationCode,
      checkInLocation: location,
      checkInDistance: geofenceResult.distance,
      checkInReviewStatus: 'pending'
    });

    // Mark code as used
    codeRecord.isUsed = true;
    await codeRecord.save();

    // Find manager to assign the review
    const manager = await User.findOne({ role: 'manager' });
    if (manager) {
      await Review.create({
        reviewer: manager._id,
        referenceId: attendance._id,
        type: 'attendance_checkin',
        status: 'pending'
      });
    }

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Check-out (verified with Camera, Code & GPS)
// @route   POST /api/attendance/checkout
// @access  Private (Employee only)
const checkOut = async (req, res) => {
  try {
    const { photo, verificationCode, location } = req.body;

    if (!photo || !verificationCode) {
      return res.status(400).json({ success: false, error: 'Please provide camera photo proof and check-out verification code' });
    }

    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Current GPS coordinates are required to clock out.' });
    }
    
    // Find the active check-in record
    const attendance = await Attendance.findOne({ user: req.user.id, checkOut: null });
    
    if (!attendance) {
      return res.status(400).json({ success: false, error: 'You are not checked in. Please clock in first.' });
    }

    // Verify GPS Geofence (100 meters range from office)
    const employee = await User.findById(req.user.id);
    const officeLoc = employee.officeLocation || { lat: 12.9715987, lng: 77.5945627 };

    const geofenceResult = isWithinGeofence(
      location.lat,
      location.lng,
      officeLoc.lat,
      officeLoc.lng,
      100
    );

    if (!geofenceResult.isWithin) {
      return res.status(400).json({
        success: false,
        error: `Clock-out rejected. You are currently ${geofenceResult.distance} meters away from your assigned office premises. You must be within 100 meters to clock out.`,
        distance: geofenceResult.distance
      });
    }

    // Verify verification code
    const codeRecord = await VerificationCode.findOne({
      code: verificationCode,
      referenceId: req.user.id,
      type: 'attendance_checkout',
      isUsed: false
    });

    if (!codeRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired check-out verification code' });
    }

    // Save image
    const photoPath = await saveImage(photo, 'checkout');

    // Update attendance record
    attendance.checkOut = new Date();
    attendance.checkOutPhoto = photoPath;
    attendance.checkOutCode = verificationCode;
    attendance.checkOutLocation = location;
    attendance.checkOutDistance = geofenceResult.distance;
    attendance.checkOutReviewStatus = 'pending';
    await attendance.save();

    // Mark code as used
    codeRecord.isUsed = true;
    await codeRecord.save();

    // Create review for check-out
    const manager = await User.findOne({ role: 'manager' });
    if (manager) {
      await Review.create({
        reviewer: manager._id,
        referenceId: attendance._id,
        type: 'attendance_checkout',
        status: 'pending'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current attendance status
// @route   GET /api/attendance/today
// @access  Private
const getTodayStatus = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({ user: req.user.id }).sort({ checkIn: -1 });
    
    res.status(200).json({
      success: true,
      data: attendance || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
// @access  Private
const getAttendanceHistory = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role !== 'manager') {
      query.user = req.user.id;
    }

    const history = await Attendance.find(query)
      .populate('user', 'name email role officeLocation')
      .sort({ checkIn: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }

    // Clean up dependent resources (reviews)
    await Review.deleteMany({ referenceId: attendance._id });

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDeleteAttendance = async (req, res) => {
  try {
    const { attendanceIds } = req.body;
    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of attendance IDs to delete' });
    }

    // Clean up dependent resources
    await Review.deleteMany({ referenceId: { $in: attendanceIds } });

    await Attendance.deleteMany({ _id: { $in: attendanceIds } });

    res.status(200).json({
      success: true,
      message: `${attendanceIds.length} attendance records deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  requestAttendanceCode,
  checkIn,
  checkOut,
  getTodayStatus,
  getAttendanceHistory,
  deleteAttendance,
  bulkDeleteAttendance
};

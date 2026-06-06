const Visit = require('../models/Visit');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const Evidence = require('../models/Evidence');
const Review = require('../models/Review');
const { isWithinGeofence } = require('../services/locationService');
const { generateVerificationCode } = require('../utils/codeGenerator');
const { saveImage } = require('../services/storageService');

// @desc    Create a new field visit
// @route   POST /api/visits
// @access  Private (Manager only)
const createVisit = async (req, res) => {
  try {
    const { clientName, purpose, assignedTo, targetLocation, deadline } = req.body;

    if (!clientName || !purpose || !assignedTo || !targetLocation || !deadline) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    if (targetLocation.lat === undefined || targetLocation.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Please provide valid latitude and longitude coordinates' });
    }

    // Verify assignee is an employee
    const employee = await User.findById(assignedTo);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ success: false, error: 'Assignee must be a valid employee' });
    }

    const visit = await Visit.create({
      clientName,
      purpose,
      assignedTo,
      assignedBy: req.user.id,
      targetLocation,
      deadline
    });

    res.status(201).json({
      success: true,
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all visits (Manager sees all, Employee sees assigned)
// @route   GET /api/visits
// @access  Private
const getVisits = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const visits = await Visit.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('evidence')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single visit details
// @route   GET /api/visits/:id
// @access  Private
const getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('evidence');

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (req.user.role === 'employee' && visit.assignedTo.id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this visit' });
    }

    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Start a field visit (Capture start location and time)
// @route   POST /api/visits/:id/start
// @access  Private (Employee assignee only)
const startVisit = async (req, res) => {
  try {
    const { location } = req.body; // { lat, lng }

    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Location coordinates are required to start a visit' });
    }

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (visit.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to start this visit' });
    }

    if (visit.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot start a visit that is in status: ${visit.status}` });
    }

    visit.status = 'started';
    visit.startedAt = new Date();
    visit.startLocation = location;
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit started successfully',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Request verification code for visit submission
// @route   POST /api/visits/:id/request-code
// @access  Private (Employee assignee only)
const requestVisitCode = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (visit.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit verification for this visit' });
    }

    const codeString = generateVerificationCode();

    // Remove any previously generated codes for this visit to keep DB clean
    await VerificationCode.deleteMany({ referenceId: visit._id, type: 'visit' });

    await VerificationCode.create({
      code: codeString,
      referenceId: visit._id,
      type: 'visit',
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

// @desc    Submit visit evidence (Enforce GPS coordinates within 100 meters)
// @route   POST /api/visits/:id/submit
// @access  Private (Employee assignee only)
const submitVisitEvidence = async (req, res) => {
  try {
    const { location, photo, verificationCode, notes } = req.body;

    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Current GPS coordinates are required to submit the visit' });
    }

    if (!photo || !verificationCode) {
      return res.status(400).json({ success: false, error: 'Camera photo proof and verification code are required' });
    }

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (visit.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit evidence for this visit' });
    }

    if (visit.status !== 'started') {
      return res.status(400).json({ success: false, error: 'Visit must be started before it can be submitted' });
    }

    // Validate GPS Geofence (100 meters range)
    const geofenceResult = isWithinGeofence(
      location.lat,
      location.lng,
      visit.targetLocation.lat,
      visit.targetLocation.lng,
      100 // 100 meters
    );

    if (!geofenceResult.isWithin) {
      return res.status(400).json({
        success: false,
        error: `GPS validation failed. You are ${geofenceResult.distance} meters away from the client. You must be within 100 meters to submit.`,
        distance: geofenceResult.distance
      });
    }

    // Validate verification code
    const codeRecord = await VerificationCode.findOne({
      code: verificationCode,
      referenceId: visit._id,
      type: 'visit',
      isUsed: false
    });

    if (!codeRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    // Save base64 photo
    const photoPath = await saveImage(photo, 'visit-evidence');

    // Create evidence
    const evidence = await Evidence.create({
      user: req.user.id,
      type: 'visit',
      referenceId: visit._id,
      photoPath,
      verificationCode,
      location,
      distance: geofenceResult.distance,
      notes
    });

    // Mark code as used
    codeRecord.isUsed = true;
    await codeRecord.save();

    // Update visit status
    visit.status = 'submitted';
    visit.submitLocation = location;
    visit.distanceToTarget = geofenceResult.distance;
    visit.verificationCode = verificationCode;
    visit.evidence = evidence._id;
    await visit.save();

    // Create pending review record
    await Review.create({
      reviewer: visit.assignedBy,
      referenceId: visit._id,
      type: 'visit',
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      message: 'Field visit evidence submitted successfully. GPS and code validated.',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bypass visit geofence for testing (Set target location to current location)
// @route   PUT /api/visits/:id/bypass-location
// @access  Private (Employee assignee only)
const bypassVisitLocation = async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Location coordinates are required' });
    }

    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }

    if (visit.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this visit' });
    }

    visit.targetLocation = location;
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit target location updated successfully for testing bypass',
      data: visit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createVisit,
  getVisits,
  getVisitById,
  startVisit,
  requestVisitCode,
  submitVisitEvidence,
  bypassVisitLocation
};


const Task = require('../models/Task');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const Evidence = require('../models/Evidence');
const Review = require('../models/Review');
const { generateVerificationCode } = require('../utils/codeGenerator');
const { saveImage } = require('../services/storageService');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Manager only)
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline } = req.body;

    if (!title || !description || !assignedTo || !deadline) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    // Verify assigned user exists and is an employee
    const employee = await User.findById(assignedTo);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ success: false, error: 'Assignee must be a valid employee' });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      priority,
      deadline
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all tasks (Manager sees all, Employee sees assigned)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('evidence')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get a single task details
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('evidence');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Authorization check
    if (req.user.role === 'employee' && task.assignedTo.id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this task' });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update task status (e.g., to In Progress)
// @route   PUT /api/tasks/:id/status
// @access  Private (Employee assignee only)
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'in_progress'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status update. Use completion flow for Completed status' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Request a unique verification code for task submission
// @route   POST /api/tasks/:id/request-code
// @access  Private (Employee assignee only)
const requestTaskCode = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to request verification for this task' });
    }

    // Generate new code
    const codeString = generateVerificationCode();

    // Check if code exists, delete if existing for this task (avoid piling up unused codes)
    await VerificationCode.deleteMany({ referenceId: task._id, type: 'task' });

    // Store in DB
    const verificationCode = await VerificationCode.create({
      code: codeString,
      referenceId: task._id,
      type: 'task',
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

// @desc    Submit task evidence & complete task
// @route   POST /api/tasks/:id/submit
// @access  Private (Employee assignee only)
const submitTaskEvidence = async (req, res) => {
  try {
    const { photo, verificationCode, notes } = req.body;

    if (!verificationCode) {
      return res.status(400).json({ success: false, error: 'Please provide the verification code' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit evidence for this task' });
    }

    // Verify verification code
    const codeRecord = await VerificationCode.findOne({
      code: verificationCode,
      referenceId: task._id,
      type: 'task',
      isUsed: false
    });

    if (!codeRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    // Save image to storage service if provided
    let photoPath = '';
    if (photo) {
      photoPath = await saveImage(photo, 'task-evidence');
    }

    // Create evidence
    const evidence = await Evidence.create({
      user: req.user.id,
      type: 'task',
      referenceId: task._id,
      photoPath: photoPath || undefined,
      verificationCode,
      notes
    });

    // Mark code as used
    codeRecord.isUsed = true;
    await codeRecord.save();

    // Update task status and link evidence
    task.status = 'completed';
    task.verificationCode = verificationCode;
    task.evidence = evidence._id;
    await task.save();

    // Create pending review record
    await Review.create({
      reviewer: task.assignedBy,
      referenceId: task._id,
      type: 'task',
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      message: 'Task evidence submitted successfully',
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  requestTaskCode,
  submitTaskEvidence
};

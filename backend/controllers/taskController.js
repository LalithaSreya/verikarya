const Task = require('../models/Task');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const Evidence = require('../models/Evidence');
const Review = require('../models/Review');
const { generateVerificationCode } = require('../utils/codeGenerator');
const { saveImage } = require('../services/storageService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Manager only)
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline, clientPhone, requireCode } = req.body;

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
      deadline,
      clientPhone,
      requireCode: requireCode !== undefined ? requireCode : true
    });

    // Automatically send task assignment notification to customer via WhatsApp if clientPhone exists
    if (clientPhone) {
      try {
        const formattedTime = new Date(deadline).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        const msg = `Your service request for '${title}' has been assigned to ${employee.name} (Contact: ${employee.phone || 'N/A'}). He/She is expected to reach your location within ${formattedTime}.`;
        await sendWhatsAppMessage(clientPhone, msg);
        console.log(`[WHATSAPP] Sent task assignment notification to customer ${clientPhone}`);
      } catch (err) {
        console.error('Failed to send task assignment WhatsApp message to customer:', err.message);
      }
    }

    // Automatically notify employee/technician via WhatsApp if employee.phone exists
    if (employee.phone) {
      try {
        const msg = `Hello ${employee.name}, a new task '${title}' has been assigned to you by Manager. Deadline: ${new Date(deadline).toLocaleDateString()}. Please check your VeriKarya dashboard for details.`;
        await sendWhatsAppMessage(employee.phone, msg);
        console.log(`[WHATSAPP] Sent assignment alert to employee ${employee.phone}`);
      } catch (err) {
        console.error('Failed to send assignment alert WhatsApp message to employee:', err.message);
      }
    }

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

    // Automatically send verification code to customer via WhatsApp if clientPhone exists
    if (task.clientPhone) {
      try {
        const msg = `Hello! Your verification code for the task '${task.title}' is: ${codeString}. Please share this code with the employee to verify task completion.`;
        await sendWhatsAppMessage(task.clientPhone, msg);
        console.log(`[WHATSAPP] Sent verification code ${codeString} to customer ${task.clientPhone}`);
      } catch (err) {
        console.error('Failed to send verification code WhatsApp message to customer:', err.message);
      }
    }

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

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit evidence for this task' });
    }

    let codeRecord = null;
    const isCodeRequired = task.requireCode !== false; // defaults to true if undefined

    if (isCodeRequired) {
      if (!verificationCode) {
        return res.status(400).json({ success: false, error: 'Please provide the verification code' });
      }

      // Verify verification code
      codeRecord = await VerificationCode.findOne({
        code: verificationCode,
        referenceId: task._id,
        type: 'task',
        isUsed: false
      });

      if (!codeRecord) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      }
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
      verificationCode: isCodeRequired ? verificationCode : undefined,
      notes
    });

    // Mark code as used if applicable
    if (isCodeRequired && codeRecord) {
      codeRecord.isUsed = true;
      await codeRecord.save();
    }

    // Update task status and link evidence
    task.status = 'completed';
    if (isCodeRequired) {
      task.verificationCode = verificationCode;
    }
    task.evidence = evidence._id;
    await task.save();

    // Create pending review record
    await Review.create({
      reviewer: task.assignedBy,
      referenceId: task._id,
      type: 'task',
      status: 'pending'
    });

    // Send WhatsApp notification automatically to both Customer and Manager
    const employeeName = req.user.name || 'our employee';
    
    // 1. Notify Customer
    if (task.clientPhone) {
      try {
        const backendUrl = process.env.BACKEND_URL || 'https://verikarya.onrender.com';
        const attachmentUrl = photoPath ? `${backendUrl}${photoPath}` : 'No attachment';
        const msg = `Hello! The task '${task.title}' assigned by VeriKarya has been completed and submitted by ${employeeName} for verification.\nSubmission Notes: ${notes || 'No notes provided'}\nAttachment: ${attachmentUrl}`;
        await sendWhatsAppMessage(task.clientPhone, msg);
      } catch (err) {
        console.error('Failed to dispatch WhatsApp message to customer:', err.message);
      }
    }

    // 2. Notify Manager
    try {
      const manager = await User.findById(task.assignedBy);
      if (manager && manager.phone) {
        const msg = `Hello Manager ${manager.name}, the employee ${employeeName} has completed and submitted the task: '${task.title}'. Verification code is: ${verificationCode}. Please review and approve it.`;
        await sendWhatsAppMessage(manager.phone, msg);
      }
    } catch (err) {
      console.error('Failed to dispatch WhatsApp message to manager:', err.message);
    }

    res.status(200).json({
      success: true,
      message: 'Task evidence submitted successfully',
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Save partial progress on a task
// @route   POST /api/tasks/:id/progress
// @access  Private (Employee assignee only)
const saveTaskProgress = async (req, res) => {
  try {
    const { photo, notes } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to submit progress for this task' });
    }

    // Save image to storage if provided
    let photoPath = '';
    if (photo) {
      photoPath = await saveImage(photo, 'task-progress');
    }

    // Add progress update to history
    task.progressHistory.push({
      photoPath: photoPath || undefined,
      notes: notes || '',
      timestamp: new Date()
    });

    // Update status to in_progress if currently pending
    if (task.status === 'pending') {
      task.status = 'in_progress';
    }

    await task.save();

    // Automatically send task progress notification to customer via WhatsApp if clientPhone exists
    if (task.clientPhone) {
      try {
        const backendUrl = process.env.BACKEND_URL || 'https://verikarya.onrender.com';
        const attachmentUrl = photoPath ? `${backendUrl}${photoPath}` : 'No attachment';
        const msg = `Hello! The progress for task '${task.title}' has been updated.\nProgress Notes: ${notes || 'No notes provided'}\nAttachment: ${attachmentUrl}`;
        await sendWhatsAppMessage(task.clientPhone, msg);
        console.log(`[WHATSAPP] Sent task progress update to customer ${task.clientPhone}`);
      } catch (err) {
        console.error('Failed to send task progress WhatsApp message to customer:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task progress saved successfully',
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Clean up dependent resources
    await VerificationCode.deleteMany({ referenceId: task._id });
    await Review.deleteMany({ referenceId: task._id });
    await Evidence.deleteMany({ referenceId: task._id });

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDeleteTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of task IDs to delete' });
    }

    // Clean up dependent resources
    await VerificationCode.deleteMany({ referenceId: { $in: taskIds } });
    await Review.deleteMany({ referenceId: { $in: taskIds } });
    await Evidence.deleteMany({ referenceId: { $in: taskIds } });

    await Task.deleteMany({ _id: { $in: taskIds } });

    res.status(200).json({
      success: true,
      message: `${taskIds.length} tasks deleted successfully`
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
  submitTaskEvidence,
  saveTaskProgress,
  deleteTask,
  bulkDeleteTasks
};

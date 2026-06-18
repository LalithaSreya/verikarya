const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  requestTaskCode,
  submitTaskEvidence,
  saveTaskProgress,
  deleteTask,
  bulkDeleteTasks
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes protected

router.post('/', authorize('manager'), createTask);
router.get('/', getTasks);
router.delete('/', authorize('manager', 'employee'), bulkDeleteTasks);
router.get('/:id', getTaskById);
router.delete('/:id', authorize('manager', 'employee'), deleteTask);
router.put('/:id/status', authorize('employee'), updateTaskStatus);
router.post('/:id/request-code', authorize('employee'), requestTaskCode);
router.post('/:id/progress', authorize('employee'), saveTaskProgress);
router.post('/:id/submit', authorize('employee'), submitTaskEvidence);

module.exports = router;

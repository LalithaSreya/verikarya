const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  requestTaskCode,
  submitTaskEvidence
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes protected

router.post('/', authorize('manager'), createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id/status', authorize('employee'), updateTaskStatus);
router.post('/:id/request-code', authorize('employee'), requestTaskCode);
router.post('/:id/submit', authorize('employee'), submitTaskEvidence);

module.exports = router;

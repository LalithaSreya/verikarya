const express = require('express');
const {
  createVisit,
  getVisits,
  getVisitById,
  startVisit,
  requestVisitCode,
  submitVisitEvidence,
  bypassVisitLocation,
  saveVisitProgress
} = require('../controllers/visitController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes protected

router.post('/', authorize('manager'), createVisit);
router.get('/', getVisits);
router.get('/:id', getVisitById);
router.post('/:id/start', authorize('employee'), startVisit);
router.post('/:id/request-code', authorize('employee'), requestVisitCode);
router.post('/:id/progress', authorize('employee'), saveVisitProgress);
router.post('/:id/submit', authorize('employee'), submitVisitEvidence);
router.put('/:id/bypass-location', authorize('employee'), bypassVisitLocation);

module.exports = router;


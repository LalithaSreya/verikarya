const express = require('express');
const {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription,
  bulkDeleteSubscriptions
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('manager'));

router.route('/')
  .get(getSubscriptions)
  .post(createSubscription)
  .delete(bulkDeleteSubscriptions);

router.route('/:id')
  .put(updateSubscription)
  .delete(deleteSubscription);

module.exports = router;

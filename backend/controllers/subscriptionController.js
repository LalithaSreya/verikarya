const Subscription = require('../models/Subscription');

// @desc    Create a new subscription (AMC)
// @route   POST /api/subscriptions
// @access  Private (Manager only)
const createSubscription = async (req, res) => {
  try {
    const { clientName, clientPhone, plan, startDate, endDate } = req.body;

    if (!clientName || !clientPhone || !plan || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Please fill in all required fields' });
    }

    const prioritySupport = plan === 'Premium';

    const subscription = await Subscription.create({
      clientName,
      clientPhone,
      plan,
      startDate,
      endDate,
      prioritySupport
    });

    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
// @access  Private (Manager only)
const getSubscriptions = async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { clientPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const subscriptions = await Subscription.find(query).sort({ endDate: 1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a subscription (Renew or modify details)
// @route   PUT /api/subscriptions/:id
// @access  Private (Manager only)
const updateSubscription = async (req, res) => {
  try {
    const { clientName, clientPhone, plan, startDate, endDate, status, preventiveVisitsCount } = req.body;

    let subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const updateData = {};
    if (clientName) updateData.clientName = clientName;
    if (clientPhone) updateData.clientPhone = clientPhone;
    if (plan) {
      updateData.plan = plan;
      updateData.prioritySupport = plan === 'Premium';
    }
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (status) updateData.status = status;
    if (preventiveVisitsCount !== undefined) updateData.preventiveVisitsCount = preventiveVisitsCount;

    subscription = await Subscription.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a subscription
// @route   DELETE /api/subscriptions/:id
// @access  Private (Manager only)
const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    await subscription.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk delete subscriptions
// @route   DELETE /api/subscriptions
// @access  Private (Manager only)
const bulkDeleteSubscriptions = async (req, res) => {
  try {
    const { subscriptionIds } = req.body;
    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of subscription IDs to delete' });
    }

    await Subscription.deleteMany({ _id: { $in: subscriptionIds } });

    res.status(200).json({
      success: true,
      message: `${subscriptionIds.length} subscriptions deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  deleteSubscription,
  bulkDeleteSubscriptions
};

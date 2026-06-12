const User = require('../models/User');
const Task = require('../models/Task');
const Visit = require('../models/Visit');
const Feedback = require('../models/Feedback');
const Subscription = require('../models/Subscription');
const Review = require('../models/Review');

// @desc    Get employee productivity metrics and rankings
// @route   GET /api/analytics/productivity
// @access  Private (Manager only)
const getProductivityAnalytics = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    
    const statsList = await Promise.all(employees.map(async (emp) => {
      // Task stats
      const totalTasks = await Task.countDocuments({ assignedTo: emp._id });
      const completedTasks = await Task.countDocuments({ assignedTo: emp._id, status: 'completed' });
      
      // Visit stats
      const totalVisits = await Visit.countDocuments({ assignedTo: emp._id });
      const completedVisits = await Visit.countDocuments({ assignedTo: emp._id, status: 'submitted' });

      // Feedback stats
      const feedback = await Feedback.find({ technician: emp._id });
      const avgRating = feedback.length > 0 
        ? parseFloat((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1))
        : 5.0; // default to 5.0

      // GPS geofence stats
      const visitsWithDistance = await Visit.find({ assignedTo: emp._id, status: 'submitted', distanceToTarget: { $exists: true } });
      const avgDistance = visitsWithDistance.length > 0
        ? Math.round(visitsWithDistance.reduce((sum, v) => sum + v.distanceToTarget, 0) / visitsWithDistance.length)
        : 0;

      // Completion score calculation
      const totalAssigned = totalTasks + totalVisits;
      const totalCompleted = completedTasks + completedVisits;
      const completionRate = totalAssigned > 0 
        ? Math.round((totalCompleted / totalAssigned) * 100)
        : 100;

      // Final productivity index (weighted average of completion rate and customer rating)
      // Index = (Completion Rate * 0.7) + (Rating * 20 * 0.3)
      const productivityScore = Math.round((completionRate * 0.7) + (avgRating * 20 * 0.3));

      return {
        id: emp._id,
        name: emp.name,
        email: emp.email,
        totalTasks,
        completedTasks,
        totalVisits,
        completedVisits,
        avgRating,
        avgDistance,
        completionRate,
        productivityScore
      };
    }));

    // Sort by productivity score descending
    statsList.sort((a, b) => b.productivityScore - a.productivityScore);

    // Identify top performer
    const topPerformer = statsList.length > 0 ? statsList[0] : null;

    res.status(200).json({
      success: true,
      count: statsList.length,
      data: {
        leaderboard: statsList,
        topPerformer
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get high-level executive business intelligence summary
// @route   GET /api/analytics/executive
// @access  Private (Manager only)
const getExecutiveAnalytics = async (req, res) => {
  try {
    // 1. Active Customer / AMC Stats
    const activeSubscriptions = await Subscription.countDocuments({ status: 'Active' });
    const subscriptions = await Subscription.find({ status: 'Active' });
    
    // Estimate MRR (Monthly Recurring Revenue)
    // Basic = 5,000 INR, Standard = 15,000 INR, Premium = 30,000 INR
    let mrr = 0;
    subscriptions.forEach(sub => {
      if (sub.plan === 'Basic') mrr += 5000;
      else if (sub.plan === 'Standard') mrr += 15000;
      else if (sub.plan === 'Premium') mrr += 30000;
    });

    // AMC Renewals Expiring in next 30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const expiringSubscriptions = await Subscription.countDocuments({
      status: 'Active',
      endDate: { $lte: nextMonth, $gte: new Date() }
    });

    // 2. Customer Satisfaction Trend
    const allFeedback = await Feedback.find({});
    const totalFeedbackCount = allFeedback.length;
    const avgSatisfactionIndex = totalFeedbackCount > 0
      ? parseFloat((allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedbackCount).toFixed(1))
      : 5.0;

    // 3. Operational Request Monitoring
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const totalVisits = await Visit.countDocuments();
    const submittedVisits = await Visit.countDocuments({ status: 'submitted' });

    res.status(200).json({
      success: true,
      data: {
        customers: {
          activeAMCs: activeSubscriptions,
          expiringAMCs: expiringSubscriptions,
          estimatedMRR: mrr
        },
        satisfaction: {
          index: avgSatisfactionIndex,
          totalReviews: totalFeedbackCount
        },
        operations: {
          pendingReviews,
          tasks: {
            total: totalTasks,
            completed: completedTasks
          },
          visits: {
            total: totalVisits,
            submitted: submittedVisits
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getProductivityAnalytics,
  getExecutiveAnalytics
};

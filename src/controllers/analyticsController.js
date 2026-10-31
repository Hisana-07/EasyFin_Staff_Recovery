const RecoveryReport = require('../models/RecoveryReport');
const Assignment = require('../models/Assignment');
const RecoverySession = require('../models/RecoverySession');
const memoryStore = require('../services/store');
const { getIsConnected } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const staffId = req.staff._id.toString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (getIsConnected()) {
      const assignments = await Assignment.find({ staffId });
      const todayReports = await RecoveryReport.find({
        staffId,
        submittedAt: { $gte: today }
      });
      const allReports = await RecoveryReport.find({ staffId });

      const totalAssigned = assignments.length;
      const pendingCases = assignments.filter(a => a.recoveryStatus === 'PENDING').length;
      const completedCases = assignments.filter(a =>
        ['COMPLETED', 'PAYMENT_COLLECTED'].includes(a.recoveryStatus)
      ).length;
      const inProgressCases = assignments.filter(a => a.recoveryStatus === 'IN_PROGRESS').length;

      // Recovered totals from persisted reports
      const todayRecoveredAmount = todayReports.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
      const totalRecoveredAmount = allReports.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
      const followUpsRequired = assignments.filter(a => a.recoveryStatus === 'FOLLOW_UP_REQUIRED').length;

      return res.status(200).json({
        success: true,
        stats: {
          totalAssigned,
          pendingCases,
          completedCases,
          inProgressCases,
          followUpsRequired,
          todayRecoveredAmount,
          totalRecoveredAmount,
          todayVisitsCount: todayReports.length,
          totalVisitsCount: allReports.length
        }
      });
    } else {
      await memoryStore.initDefaults();
      const assignments = memoryStore.assignments.filter(a => a.staffId === staffId);
      const reports = memoryStore.reports.filter(r => r.staffId === staffId);

      const todayReports = reports.filter(r => new Date(r.submittedAt) >= today);

      const totalAssigned = assignments.length;
      const pendingCases = assignments.filter(a => a.recoveryStatus === 'PENDING').length;
      const completedCases = assignments.filter(a =>
        ['COMPLETED', 'PAYMENT_COLLECTED'].includes(a.recoveryStatus)
      ).length;
      const inProgressCases = assignments.filter(a => a.recoveryStatus === 'IN_PROGRESS').length;
      const followUpsRequired = assignments.filter(a => a.recoveryStatus === 'FOLLOW_UP_REQUIRED').length;

      const todayRecoveredAmount = todayReports.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
      const totalRecoveredAmount = reports.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

      return res.status(200).json({
        success: true,
        stats: {
          totalAssigned,
          pendingCases,
          completedCases,
          inProgressCases,
          followUpsRequired,
          todayRecoveredAmount,
          totalRecoveredAmount,
          todayVisitsCount: todayReports.length,
          totalVisitsCount: reports.length
        }
      });
    }
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard metrics.'
    });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const staffId = req.staff._id.toString();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (getIsConnected()) {
      const reports = await RecoveryReport.find({
        staffId,
        submittedAt: { $gte: startOfMonth }
      }).sort({ submittedAt: 1 });

      const outcomeBreakdown = {
        PAYMENT_COLLECTED: 0,
        PAYMENT_PROMISED: 0,
        CUSTOMER_CONTACTED: 0,
        CUSTOMER_UNAVAILABLE: 0,
        FOLLOW_UP_REQUIRED: 0
      };

      let monthlyTotalCollected = 0;
      let totalDistance = 0;
      let totalDuration = 0;

      reports.forEach(r => {
        if (outcomeBreakdown[r.recoveryOutcome] !== undefined) {
          outcomeBreakdown[r.recoveryOutcome]++;
        }
        monthlyTotalCollected += r.paymentAmount || 0;
        totalDistance += r.distanceMeters || 0;
        totalDuration += r.durationSeconds || 0;
      });

      return res.status(200).json({
        success: true,
        summary: {
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          totalVisits: reports.length,
          monthlyTotalCollected,
          totalDistanceMeters: totalDistance,
          totalDurationSeconds: totalDuration,
          outcomeBreakdown,
          reports
        }
      });
    } else {
      await memoryStore.initDefaults();
      const reports = memoryStore.reports
        .filter(r => r.staffId === staffId && new Date(r.submittedAt) >= startOfMonth)
        .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

      const outcomeBreakdown = {
        PAYMENT_COLLECTED: 0,
        PAYMENT_PROMISED: 0,
        CUSTOMER_CONTACTED: 0,
        CUSTOMER_UNAVAILABLE: 0,
        FOLLOW_UP_REQUIRED: 0
      };

      let monthlyTotalCollected = 0;
      let totalDistance = 0;
      let totalDuration = 0;

      reports.forEach(r => {
        if (outcomeBreakdown[r.recoveryOutcome] !== undefined) {
          outcomeBreakdown[r.recoveryOutcome]++;
        }
        monthlyTotalCollected += r.paymentAmount || 0;
        totalDistance += r.distanceMeters || 0;
        totalDuration += r.durationSeconds || 0;
      });

      return res.status(200).json({
        success: true,
        summary: {
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          totalVisits: reports.length,
          monthlyTotalCollected,
          totalDistanceMeters: totalDistance,
          totalDurationSeconds: totalDuration,
          outcomeBreakdown,
          reports
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly recovery summary.'
    });
  }
};

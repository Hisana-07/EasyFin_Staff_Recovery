const Assignment = require('../models/Assignment');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const memoryStore = require('../services/store');
const { getIsConnected } = require('../config/db');

exports.getAssignedCases = async (req, res) => {
  try {
    const staffId = req.staff._id.toString();
    const { search, status, priority } = req.query;

    if (getIsConnected()) {
      let query = { staffId };
      if (status && status !== 'ALL') {
        query.recoveryStatus = status;
      }
      if (priority && priority !== 'ALL') {
        query.priority = priority;
      }

      let assignments = await Assignment.find(query)
        .populate('customerId')
        .populate('loanId')
        .sort({ priority: 1, assignedDate: -1 });

      let cases = assignments.map(a => ({
        assignmentId: a.assignmentId,
        id: a._id,
        priority: a.priority,
        recoveryStatus: a.recoveryStatus,
        notes: a.notes,
        assignedDate: a.assignedDate,
        lastVisitDate: a.lastVisitDate,
        customer: {
          id: a.customerId?._id,
          customerId: a.customerId?.customerId,
          name: a.customerId?.name,
          phone: a.customerId?.phone,
          alternatePhone: a.customerId?.alternatePhone,
          address: a.customerId?.address,
          landmark: a.customerId?.landmark,
          city: a.customerId?.city,
          latitude: a.customerId?.latitude,
          longitude: a.customerId?.longitude
        },
        loan: {
          id: a.loanId?._id,
          loanId: a.loanId?.loanId,
          loanType: a.loanId?.loanType,
          totalAmount: a.loanId?.totalAmount,
          outstandingAmount: a.loanId?.outstandingAmount,
          overdueAmount: a.loanId?.overdueAmount,
          emiAmount: a.loanId?.emiAmount,
          overdueDays: a.loanId?.overdueDays,
          status: a.loanId?.status
        }
      }));

      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        cases = cases.filter(c => 
          c.customer.name.toLowerCase().includes(q) ||
          c.customer.phone.includes(q) ||
          c.loan.loanId.toLowerCase().includes(q)
        );
      }

      return res.status(200).json({ success: true, count: cases.length, cases });
    } else {
      // Memory Store fallback
      await memoryStore.initDefaults();
      let assignments = memoryStore.assignments.filter(a => a.staffId === staffId);

      if (status && status !== 'ALL') {
        assignments = assignments.filter(a => a.recoveryStatus === status);
      }
      if (priority && priority !== 'ALL') {
        assignments = assignments.filter(a => a.priority === priority);
      }

      let cases = assignments.map(a => {
        const customer = memoryStore.customers.find(c => c._id === a.customerId) || {};
        const loan = memoryStore.loans.find(l => l._id === a.loanId) || {};
        return {
          assignmentId: a.assignmentId,
          id: a._id,
          priority: a.priority,
          recoveryStatus: a.recoveryStatus,
          notes: a.notes,
          assignedDate: a.assignedDate,
          lastVisitDate: a.lastVisitDate,
          customer,
          loan
        };
      });

      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        cases = cases.filter(c =>
          (c.customer.name && c.customer.name.toLowerCase().includes(q)) ||
          (c.customer.phone && c.customer.phone.includes(q)) ||
          (c.loan.loanId && c.loan.loanId.toLowerCase().includes(q))
        );
      }

      return res.status(200).json({ success: true, count: cases.length, cases });
    }
  } catch (error) {
    console.error('Error fetching cases:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned cases.'
    });
  }
};

exports.getCaseDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = req.staff._id.toString();

    if (getIsConnected()) {
      const assignment = await Assignment.findOne({
        $or: [{ _id: id }, { assignmentId: id }],
        staffId
      })
        .populate('customerId')
        .populate('loanId');

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Case not found or unauthorized to view.'
        });
      }

      return res.status(200).json({
        success: true,
        caseItem: {
          assignmentId: assignment.assignmentId,
          id: assignment._id,
          priority: assignment.priority,
          recoveryStatus: assignment.recoveryStatus,
          notes: assignment.notes,
          assignedDate: assignment.assignedDate,
          customer: assignment.customerId,
          loan: assignment.loanId
        }
      });
    } else {
      await memoryStore.initDefaults();
      const assignment = memoryStore.assignments.find(
        a => (a._id === id || a.assignmentId === id) && a.staffId === staffId
      );

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Case not found or unauthorized to view.'
        });
      }

      const customer = memoryStore.customers.find(c => c._id === assignment.customerId);
      const loan = memoryStore.loans.find(l => l._id === assignment.loanId);

      return res.status(200).json({
        success: true,
        caseItem: {
          ...assignment,
          customer,
          loan
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve case details.'
    });
  }
};

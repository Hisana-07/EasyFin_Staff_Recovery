const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class MemoryStore {
  constructor() {
    this.staffList = [];
    this.customers = [];
    this.loans = [];
    this.assignments = [];
    this.sessions = [];
    this.trackingPoints = [];
    this.stops = [];
    this.reports = [];
    this.evidences = [];
    this.initialized = false;
  }

  async initDefaults() {
    if (this.initialized) return;
    
    const hashedPassword = await bcrypt.hash('Recovery@2026', 10);
    
    // Default Staff Members
    const defaultStaff = {
      _id: 'staff_001',
      employeeId: 'EF-REC-104',
      name: 'Rohan Sharma',
      email: 'rohan.sharma@easyfin.com',
      password: hashedPassword,
      phone: '+91 98765 43210',
      assignedArea: 'South Metro Zone - Sector 12',
      role: 'field_officer',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    const secondStaff = {
      _id: 'staff_002',
      employeeId: 'EF-REC-105',
      name: 'Priya Patel',
      email: 'priya.patel@easyfin.com',
      password: hashedPassword,
      phone: '+91 98765 11223',
      assignedArea: 'North Industrial Cluster',
      role: 'field_officer',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.staffList.push(defaultStaff, secondStaff);

    // Default Customers
    const c1 = {
      _id: 'cust_001',
      customerId: 'CUST-8021',
      name: 'Vikramaditya Roy',
      phone: '+91 98234 56789',
      alternatePhone: '+91 91234 56789',
      address: 'Flat 402, Nilgiri Heights, MG Road, Sector 12',
      landmark: 'Opposite State Bank ATM',
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946
    };

    const c2 = {
      _id: 'cust_002',
      customerId: 'CUST-8022',
      name: 'Ananya Deshmukh',
      phone: '+91 98451 22334',
      alternatePhone: '+91 98451 99887',
      address: 'Plot 15, Green Glen Layout, Bellandur',
      landmark: 'Near EcoWorld Gate 2',
      city: 'Bangalore',
      latitude: 12.9298,
      longitude: 77.6848
    };

    const c3 = {
      _id: 'cust_003',
      customerId: 'CUST-8023',
      name: 'Mohammed Faizan',
      phone: '+91 97312 88491',
      alternatePhone: '+91 97312 33214',
      address: 'Shop 4, Commercial Complex, Koramangala 5th Block',
      landmark: 'Behind Sony World Signal',
      city: 'Bangalore',
      latitude: 12.9352,
      longitude: 77.6245
    };

    const c4 = {
      _id: 'cust_004',
      customerId: 'CUST-8024',
      name: 'Suresh Kumar Gupta',
      phone: '+91 99001 77665',
      alternatePhone: '+91 99001 44556',
      address: 'House 88, 3rd Cross, HSR Layout Sector 2',
      landmark: 'Next to Apollo Pharmacy',
      city: 'Bangalore',
      latitude: 12.9116,
      longitude: 77.6389
    };

    const c5 = {
      _id: 'cust_005',
      customerId: 'CUST-8025',
      name: 'Meenakshi Sundaram',
      phone: '+91 96112 55443',
      alternatePhone: '',
      address: 'No. 24, 7th Main, BTM 2nd Stage',
      landmark: 'Near Udupi Garden Signal',
      city: 'Bangalore',
      latitude: 12.9166,
      longitude: 77.6101
    };

    this.customers.push(c1, c2, c3, c4, c5);

    // Default Loans
    const l1 = {
      _id: 'loan_001',
      loanId: 'LN-2025-4401',
      customerId: 'cust_001',
      loanType: 'Micro-Business Term Loan',
      totalAmount: 250000,
      outstandingAmount: 85000,
      overdueAmount: 24500,
      emiAmount: 12250,
      overdueDays: 62,
      status: 'OVERDUE'
    };

    const l2 = {
      _id: 'loan_002',
      loanId: 'LN-2025-5512',
      customerId: 'cust_002',
      loanType: 'Two-Wheeler Easy Loan',
      totalAmount: 95000,
      outstandingAmount: 42000,
      overdueAmount: 14000,
      emiAmount: 7000,
      overdueDays: 45,
      status: 'OVERDUE'
    };

    const l3 = {
      _id: 'loan_003',
      loanId: 'LN-2025-6623',
      customerId: 'cust_003',
      loanType: 'Working Capital Loan',
      totalAmount: 500000,
      outstandingAmount: 185000,
      overdueAmount: 52000,
      emiAmount: 26000,
      overdueDays: 78,
      status: 'DEFAULTED'
    };

    const l4 = {
      _id: 'loan_004',
      loanId: 'LN-2025-7734',
      customerId: 'cust_004',
      loanType: 'Personal Emergency Loan',
      totalAmount: 120000,
      outstandingAmount: 38000,
      overdueAmount: 19000,
      emiAmount: 9500,
      overdueDays: 58,
      status: 'OVERDUE'
    };

    const l5 = {
      _id: 'loan_005',
      loanId: 'LN-2025-8845',
      customerId: 'cust_005',
      loanType: 'Consumer Durable Loan',
      totalAmount: 65000,
      outstandingAmount: 18500,
      overdueAmount: 6200,
      emiAmount: 3100,
      overdueDays: 31,
      status: 'OVERDUE'
    };

    this.loans.push(l1, l2, l3, l4, l5);

    // Default Assignments for Rohan Sharma (staff_001)
    const a1 = {
      _id: 'asgn_001',
      assignmentId: 'ASN-2026-101',
      staffId: 'staff_001',
      customerId: 'cust_001',
      loanId: 'loan_001',
      assignedDate: new Date().toISOString(),
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Customer requested evening visit after 4 PM.',
      lastVisitDate: null
    };

    const a2 = {
      _id: 'asgn_002',
      assignmentId: 'ASN-2026-102',
      staffId: 'staff_001',
      customerId: 'cust_002',
      loanId: 'loan_002',
      assignedDate: new Date().toISOString(),
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Second reminder notice dispatched. Priority collection.',
      lastVisitDate: null
    };

    const a3 = {
      _id: 'asgn_003',
      assignmentId: 'ASN-2026-103',
      staffId: 'staff_001',
      customerId: 'cust_003',
      loanId: 'loan_003',
      assignedDate: new Date().toISOString(),
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Retail shop visit required during business hours.',
      lastVisitDate: null
    };

    const a4 = {
      _id: 'asgn_004',
      assignmentId: 'ASN-2026-104',
      staffId: 'staff_001',
      customerId: 'cust_004',
      loanId: 'loan_004',
      assignedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      priority: 'MEDIUM',
      recoveryStatus: 'COMPLETED',
      notes: 'Collected partial payment of ₹9,500.',
      lastVisitDate: new Date(Date.now() - 86400000).toISOString()
    };

    const a5 = {
      _id: 'asgn_005',
      assignmentId: 'ASN-2026-105',
      staffId: 'staff_001',
      customerId: 'cust_005',
      loanId: 'loan_005',
      assignedDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      priority: 'LOW',
      recoveryStatus: 'PAYMENT_PROMISED',
      notes: 'Promised to clear overdue by end of current week.',
      lastVisitDate: new Date(Date.now() - 86400000 * 2).toISOString()
    };

    this.assignments.push(a1, a2, a3, a4, a5);

    // Initial Historical Recovery Report for Dashboard Analytics
    const completedSessionId = 'sess_hist_001';
    const pastSession = {
      _id: 'sess_hist_db_01',
      sessionId: completedSessionId,
      staffId: 'staff_001',
      assignmentId: 'asgn_004',
      customerId: 'cust_004',
      loanId: 'loan_004',
      startTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 2).toISOString(),
      endTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 1).toISOString(),
      durationSeconds: 3600,
      distanceMeters: 4850,
      status: 'COMPLETED',
      outcome: 'PAYMENT_COLLECTED',
      paymentAmount: 9500,
      promiseDate: null,
      visitNotes: 'Met customer Mr. Gupta. Collected 1 EMI installment via digital receipt.',
      isReportSubmitted: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    };
    this.sessions.push(pastSession);

    const pastReport = {
      _id: 'rep_hist_db_01',
      reportId: 'REP-2026-0001',
      sessionId: completedSessionId,
      staffId: 'staff_001',
      customerId: 'cust_004',
      loanId: 'loan_004',
      staffName: 'Rohan Sharma',
      staffEmployeeId: 'EF-REC-104',
      customerName: 'Suresh Kumar Gupta',
      customerPhone: '+91 99001 77665',
      customerAddress: 'House 88, 3rd Cross, HSR Layout Sector 2',
      loanNumber: 'LN-2025-7734',
      loanOutstandingAmount: 38000,
      loanOverdueAmount: 19000,
      recoveryDate: new Date(Date.now() - 86400000).toISOString(),
      startTime: pastSession.startTime,
      endTime: pastSession.endTime,
      durationSeconds: 3600,
      distanceMeters: 4850,
      recoveryOutcome: 'PAYMENT_COLLECTED',
      paymentAmount: 9500,
      promiseDate: null,
      visitNotes: 'Met customer Mr. Gupta. Collected 1 EMI installment via digital receipt.',
      placesVisited: [
        {
          stopIndex: 1,
          placeName: 'HSR Ring Road Junction',
          address: 'Outer Ring Rd, HSR Layout, Bengaluru',
          latitude: 12.9125,
          longitude: 77.6360,
          startTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 2 + 600000).toISOString(),
          endTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 2 + 1200000).toISOString(),
          durationSeconds: 600
        },
        {
          stopIndex: 2,
          placeName: 'Customer Residence (Suresh Gupta)',
          address: 'House 88, 3rd Cross, HSR Layout Sector 2',
          latitude: 12.9116,
          longitude: 77.6389,
          startTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 2 + 1500000).toISOString(),
          endTime: new Date(Date.now() - 86400000 * 1 - 3600000 * 1).toISOString(),
          durationSeconds: 2100
        }
      ],
      evidence: [],
      submittedAt: new Date(Date.now() - 86400000 * 1 - 3600000 * 1).toISOString()
    };
    this.reports.push(pastReport);

    this.initialized = true;
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Assignment = require('../models/Assignment');
const RecoverySession = require('../models/RecoverySession');
const RecoveryReport = require('../models/RecoveryReport');

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/easyfin_staff_recovery';
  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);

  console.log('Clearing existing collections in easyfin_staff_recovery...');
  await Staff.deleteMany({});
  await Customer.deleteMany({});
  await Loan.deleteMany({});
  await Assignment.deleteMany({});
  await RecoverySession.deleteMany({});
  await RecoveryReport.deleteMany({});

  console.log('Seeding staff...');
  const staff1 = await Staff.create({
    employeeId: 'EF-REC-104',
    name: 'Rohan Sharma',
    email: 'rohan.sharma@easyfin.com',
    password: 'Recovery@2026',
    phone: '+91 98765 43210',
    assignedArea: 'South Metro Zone - Sector 12',
    role: 'field_officer',
    isActive: true
  });

  const staff2 = await Staff.create({
    employeeId: 'EF-REC-105',
    name: 'Priya Patel',
    email: 'priya.patel@easyfin.com',
    password: 'Recovery@2026',
    phone: '+91 98765 11223',
    assignedArea: 'North Industrial Cluster',
    role: 'field_officer',
    isActive: true
  });

  console.log('Seeding customers and loans...');
  const customersData = [
    {
      customerId: 'CUST-8021',
      name: 'Vikramaditya Roy',
      phone: '+91 98234 56789',
      alternatePhone: '+91 91234 56789',
      address: 'Flat 402, Nilgiri Heights, MG Road, Sector 12',
      landmark: 'Opposite State Bank ATM',
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946
    },
    {
      customerId: 'CUST-8022',
      name: 'Ananya Deshmukh',
      phone: '+91 98451 22334',
      alternatePhone: '+91 98451 99887',
      address: 'Plot 15, Green Glen Layout, Bellandur',
      landmark: 'Near EcoWorld Gate 2',
      city: 'Bangalore',
      latitude: 12.9298,
      longitude: 77.6848
    },
    {
      customerId: 'CUST-8023',
      name: 'Mohammed Faizan',
      phone: '+91 97312 88491',
      alternatePhone: '+91 97312 33214',
      address: 'Shop 4, Commercial Complex, Koramangala 5th Block',
      landmark: 'Behind Sony World Signal',
      city: 'Bangalore',
      latitude: 12.9352,
      longitude: 77.6245
    },
    {
      customerId: 'CUST-8024',
      name: 'Suresh Kumar Gupta',
      phone: '+91 99001 77665',
      alternatePhone: '+91 99001 44556',
      address: 'House 88, 3rd Cross, HSR Layout Sector 2',
      landmark: 'Next to Apollo Pharmacy',
      city: 'Bangalore',
      latitude: 12.9116,
      longitude: 77.6389
    },
    {
      customerId: 'CUST-8025',
      name: 'Meenakshi Sundaram',
      phone: '+91 96112 55443',
      alternatePhone: '',
      address: 'No. 24, 7th Main, BTM 2nd Stage',
      landmark: 'Near Udupi Garden Signal',
      city: 'Bangalore',
      latitude: 12.9166,
      longitude: 77.6101
    }
  ];

  const createdCustomers = await Customer.insertMany(customersData);

  const loansData = [
    {
      loanId: 'LN-2025-4401',
      customerId: createdCustomers[0]._id,
      loanType: 'Micro-Business Term Loan',
      totalAmount: 250000,
      outstandingAmount: 85000,
      overdueAmount: 24500,
      emiAmount: 12250,
      overdueDays: 62,
      status: 'OVERDUE'
    },
    {
      loanId: 'LN-2025-5512',
      customerId: createdCustomers[1]._id,
      loanType: 'Two-Wheeler Easy Loan',
      totalAmount: 95000,
      outstandingAmount: 42000,
      overdueAmount: 14000,
      emiAmount: 7000,
      overdueDays: 45,
      status: 'OVERDUE'
    },
    {
      loanId: 'LN-2025-6623',
      customerId: createdCustomers[2]._id,
      loanType: 'Working Capital Loan',
      totalAmount: 500000,
      outstandingAmount: 185000,
      overdueAmount: 52000,
      emiAmount: 26000,
      overdueDays: 78,
      status: 'DEFAULTED'
    },
    {
      loanId: 'LN-2025-7734',
      customerId: createdCustomers[3]._id,
      loanType: 'Personal Emergency Loan',
      totalAmount: 120000,
      outstandingAmount: 38000,
      overdueAmount: 19000,
      emiAmount: 9500,
      overdueDays: 58,
      status: 'OVERDUE'
    },
    {
      loanId: 'LN-2025-8845',
      customerId: createdCustomers[4]._id,
      loanType: 'Consumer Durable Loan',
      totalAmount: 65000,
      outstandingAmount: 18500,
      overdueAmount: 6200,
      emiAmount: 3100,
      overdueDays: 31,
      status: 'OVERDUE'
    }
  ];

  const createdLoans = await Loan.insertMany(loansData);

  console.log('Seeding recovery assignments...');
  await Assignment.create([
    {
      assignmentId: 'ASN-2026-101',
      staffId: staff1._id,
      customerId: createdCustomers[0]._id,
      loanId: createdLoans[0]._id,
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Customer requested evening visit after 4 PM.'
    },
    {
      assignmentId: 'ASN-2026-102',
      staffId: staff1._id,
      customerId: createdCustomers[1]._id,
      loanId: createdLoans[1]._id,
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Second reminder notice dispatched. Priority collection.'
    },
    {
      assignmentId: 'ASN-2026-103',
      staffId: staff1._id,
      customerId: createdCustomers[2]._id,
      loanId: createdLoans[2]._id,
      priority: 'HIGH',
      recoveryStatus: 'PENDING',
      notes: 'Retail shop visit required during business hours.'
    },
    {
      assignmentId: 'ASN-2026-104',
      staffId: staff1._id,
      customerId: createdCustomers[3]._id,
      loanId: createdLoans[3]._id,
      priority: 'MEDIUM',
      recoveryStatus: 'COMPLETED',
      notes: 'Collected partial payment of ₹9,500.'
    },
    {
      assignmentId: 'ASN-2026-105',
      staffId: staff1._id,
      customerId: createdCustomers[4]._id,
      loanId: createdLoans[4]._id,
      priority: 'LOW',
      recoveryStatus: 'PAYMENT_PROMISED',
      notes: 'Promised to clear overdue by end of current week.'
    }
  ]);

  console.log('Database seeded successfully!');
  await mongoose.disconnect();
};

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

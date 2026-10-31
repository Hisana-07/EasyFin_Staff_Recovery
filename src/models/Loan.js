const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanId: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    loanType: { type: String, default: 'Personal Loan' },
    totalAmount: { type: Number, required: true },
    outstandingAmount: { type: Number, required: true },
    overdueAmount: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    overdueDays: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'OVERDUE', 'DEFAULTED', 'CLOSED'], default: 'OVERDUE' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);

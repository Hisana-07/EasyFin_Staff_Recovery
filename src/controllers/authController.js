
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Staff = require('../models/Staff');
const memoryStore = require('../services/store');
const { getIsConnected } = require('../config/db');

const otpStore = new Map();

const normalizePhone = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  return digits;
};

const generateToken = (staff) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in .env');
  }

  return jwt.sign(
    {
      id: staff._id.toString(),
      employeeId: staff.employeeId,
      email: staff.email,
      role: staff.role
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const findStaffByPhone = async (phone) => {
  const normalizedPhone = normalizePhone(phone);

  if (getIsConnected()) {
    const staffList = await Staff.find({ isActive: true });

    return staffList.find(
      staff => normalizePhone(staff.phone) === normalizedPhone
    );
  }

  await memoryStore.initDefaults();

  return memoryStore.staffList.find(
    staff =>
      staff.isActive &&
      normalizePhone(staff.phone) === normalizedPhone
  );
};

// STEP 1: Generate demo OTP
exports.sendOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid 10-digit Indian mobile number.'
      });
    }

    const staff = await findStaffByPhone(phone);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'No active staff account is registered with this number.'
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    // DEMO ONLY: OTP is returned so the app can display it.
    return res.status(200).json({
      success: true,
      message: 'Demo OTP generated successfully.',
      demoOtp: otp
    });
  } catch (error) {
    console.error('Send OTP error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to generate OTP.'
    });
  }
};

// STEP 2: Verify OTP and issue JWT
exports.verifyOtp = async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || '').trim();

    if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number or OTP.'
      });
    }

    const savedOtp = otpStore.get(phone);

    if (!savedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please request a new OTP.'
      });
    }

    if (Date.now() > savedOtp.expiresAt) {
      otpStore.delete(phone);

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.'
      });
    }

    savedOtp.attempts += 1;

    if (savedOtp.attempts > 5) {
      otpStore.delete(phone);

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Request a new OTP.'
      });
    }

    if (savedOtp.otp !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect OTP. Please try again.'
      });
    }

    otpStore.delete(phone);

    const staff = await findStaffByPhone(phone);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found or inactive.'
      });
    }

    const token = generateToken(staff);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      staff: typeof staff.toJSON === 'function'
        ? staff.toJSON()
        : (() => {
            const safeStaff = { ...staff };
            delete safeStaff.password;
            return safeStaff;
          })()
    });
  } catch (error) {
    console.error('Verify OTP error:', error);

    return res.status(500).json({
      success: false,
      message: 'OTP verification failed.'
    });
  }
};

// Existing password login retained
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID or email and password are required.'
      });
    }

    const trimmed = identifier.trim().toLowerCase();
    let staff;

    if (getIsConnected()) {
      staff = await Staff.findOne({
        $or: [
          { email: trimmed },
          { employeeId: trimmed.toUpperCase() }
        ]
      });

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or staff member not found.'
        });
      }

      const isMatch = await staff.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.'
        });
      }
    } else {
      await memoryStore.initDefaults();

      staff = memoryStore.staffList.find(
        s =>
          s.email.toLowerCase() === trimmed ||
          s.employeeId.toLowerCase() === trimmed
      );

      if (!staff || !(await bcrypt.compare(password, staff.password))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.'
        });
      }
    }

    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token: generateToken(staff),
      staff: typeof staff.toJSON === 'function'
        ? staff.toJSON()
        : (() => {
            const safeStaff = { ...staff };
            delete safeStaff.password;
            return safeStaff;
          })()
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

exports.getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    staff: req.staff
  });
};

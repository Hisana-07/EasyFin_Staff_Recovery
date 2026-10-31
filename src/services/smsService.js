const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase();

const sendOtpSms = async (phone, otp) => {
  if (provider === 'none') {
    // No SMS provider configured: log it and let the app show the demo OTP
    console.log(`[SMS disabled] OTP for ${phone}: ${otp}`);
    return { sent: false, demo: true };
  }

  // Real providers get added here in the next step
  throw new Error(`SMS provider "${provider}" is not set up yet.`);
};

module.exports = { sendOtpSms };
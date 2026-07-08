const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpay;

if (!keyId || !keySecret) {
  console.warn('WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not defined in environment variables.');

  razorpay = new Proxy({}, {
    get: function (target, prop) {
      return function () {
        throw new Error('Razorpay client is not fully configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment/Vercel settings.');
      };
    }
  });
} else {
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
}

module.exports = razorpay;

const express = require('express');
const crypto = require('crypto');
const razorpay = require('../utils/razorpay');
const supabase = require('../utils/supabase');
const { auth } = require('../middleware/auth');

const router = express.Router();

const PLAN_AMOUNTS = { basic: 299, standard: 599, premium: 999 };

function genReviewId() {
  return 'REV-' + Date.now().toString(36).toUpperCase();
}

// ── PUBLIC KEY (for frontend checkout) ─────────────────────────
router.get('/key', auth, (req, res) => {
  res.json({ key_id: process.env.RAZORPAY_KEY_ID || '' });
});

// ── CREATE ORDER ────────────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  try {
    const { petition_id, plan } = req.body;

    if (!petition_id || !plan) return res.status(400).json({ error: 'Petition ID and plan are required' });
    if (!PLAN_AMOUNTS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    // Verify petition belongs to user
    const { data: petition, error: petErr } = await supabase
      .from('petitions').select('id').eq('id', petition_id).eq('user_id', req.user.id).single();
    if (petErr || !petition) return res.status(404).json({ error: 'Petition not found' });

    const amount = PLAN_AMOUNTS[plan] * 100; // paise

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: 'rcpt_' + petition_id.slice(0, 8) + '_' + Date.now(),
      notes: { petition_id, plan, user_id: req.user.id }
    });

    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID || '' });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ── VERIFY PAYMENT & CREATE REVIEW REQUEST ──────────────────────
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      petition_id, plan, client_phone, client_email, client_notes
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }
    if (!petition_id || !plan || !client_phone || !client_email) {
      return res.status(400).json({ error: 'Petition ID, plan, phone and email are required' });
    }
    if (!PLAN_AMOUNTS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    // Verify petition belongs to user
    const { data: petition, error: petErr } = await supabase
      .from('petitions').select('id, case_label').eq('id', petition_id).eq('user_id', req.user.id).single();
    if (petErr || !petition) return res.status(404).json({ error: 'Petition not found' });

    // Prevent double-processing of the same payment
    const { data: existing } = await supabase
      .from('review_requests').select('id').eq('razorpay_payment_id', razorpay_payment_id).single();
    if (existing) return res.status(409).json({ error: 'This payment has already been processed' });

    const review_id = genReviewId();
    const { data: review, error } = await supabase.from('review_requests').insert({
      review_id,
      petition_id,
      user_id: req.user.id,
      plan,
      amount_paid: PLAN_AMOUNTS[plan],
      client_phone,
      client_email,
      client_notes,
      status: 'pending',
      payment_status: 'paid',
      razorpay_order_id,
      razorpay_payment_id
    }).select().single();

    if (error) throw error;

    // Update petition status
    await supabase.from('petitions').update({ status: 'review_requested' }).eq('id', petition_id);

    // Notify admin
    const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
    if (admin) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        type: 'review_request',
        title: 'New review request',
        message: `${petition.case_label} — ${plan} plan (₹${PLAN_AMOUNTS[plan]}) paid, needs lawyer assignment.`,
        metadata: { review_id: review.id }
      });
    }

    res.status(201).json({ message: 'Payment verified. An advocate will be assigned within 24 hours.', review_id, id: review.id });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;

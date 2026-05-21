const express = require('express');
const supabase = require('../utils/supabase');
const { sendEmail } = require('../utils/email');
const { auth, requireLawyer } = require('../middleware/auth');

const router = express.Router();

const PLAN_AMOUNTS = { basic: 299, standard: 599, premium: 999 };

function genReviewId() {
  return 'REV-' + Date.now().toString(36).toUpperCase();
}

// ── SUBMIT REVIEW REQUEST ─────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { petition_id, plan, client_phone, client_email, client_notes } = req.body;

    if (!petition_id || !plan || !client_phone || !client_email) {
      return res.status(400).json({ error: 'Petition ID, plan, phone and email are required' });
    }
    if (!PLAN_AMOUNTS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    // Verify petition belongs to user
    const { data: petition, error: petErr } = await supabase
      .from('petitions').select('id, case_label, draft_text').eq('id', petition_id).eq('user_id', req.user.id).single();
    if (petErr || !petition) return res.status(404).json({ error: 'Petition not found' });

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
      status: 'pending'
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
        message: `${petition.case_label} — ${plan} plan (₹${PLAN_AMOUNTS[plan]}) needs lawyer assignment.`,
        metadata: { review_id: review.id }
      });
    }

    res.status(201).json({ message: 'Review request submitted. An advocate will be assigned within 24 hours.', review_id, id: review.id });
  } catch (err) {
    console.error('Review request error:', err);
    res.status(500).json({ error: 'Failed to submit review request' });
  }
});

// ── GET USER'S REVIEW REQUESTS ────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('review_requests')
      .select(`*, petition:petitions(case_id, case_label, case_type), lawyer:lawyers(name, email, avg_rating)`)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ reviews: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── GET LAWYER'S ASSIGNED REVIEWS ────────────────────────────
router.get('/assigned', auth, requireLawyer, async (req, res) => {
  try {
    // Get lawyer record
    const { data: lawyer } = await supabase.from('lawyers').select('id').eq('user_id', req.user.id).single();
    if (!lawyer) return res.status(404).json({ error: 'Lawyer profile not found' });

    const { data, error } = await supabase
      .from('review_requests')
      .select(`*, petition:petitions(case_id, case_label, case_type, draft_text, complainant, opponent, court, facts, relief)`)
      .eq('lawyer_id', lawyer.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ reviews: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned reviews' });
  }
});

// ── LAWYER: SAVE NOTES ────────────────────────────────────────
router.put('/:id/notes', auth, requireLawyer, async (req, res) => {
  try {
    const { lawyer_notes } = req.body;
    const { data: lawyer } = await supabase.from('lawyers').select('id').eq('user_id', req.user.id).single();

    const { error } = await supabase.from('review_requests')
      .update({ lawyer_notes })
      .eq('id', req.params.id)
      .eq('lawyer_id', lawyer.id);

    if (error) throw error;
    res.json({ message: 'Notes saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// ── LAWYER: MARK COMPLETE ─────────────────────────────────────
router.put('/:id/complete', auth, requireLawyer, async (req, res) => {
  try {
    const { lawyer_notes } = req.body;
    const { data: lawyer } = await supabase.from('lawyers').select('id').eq('user_id', req.user.id).single();

    const { data: review, error } = await supabase.from('review_requests')
      .update({ lawyer_notes, status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('lawyer_id', lawyer.id)
      .select('*, petition:petitions(case_label)')
      .single();

    if (error) throw error;

    // Update petition status
    await supabase.from('petitions').update({ status: 'complete' }).eq('id', review.petition_id);

    // Notify user
    const { data: user } = await supabase.from('users').select('id, email, fname').eq('id', review.user_id).single();
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'review_complete',
        title: 'Your petition review is ready',
        message: `Your ${review.petition?.case_label} review has been completed. Download your reviewed draft.`,
        metadata: { review_id: review.id }
      });
      await sendEmail(user.email, 'reviewComplete', user, review);
    }

    res.json({ message: 'Review marked complete' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete review' });
  }
});

// ── RATE A REVIEW ─────────────────────────────────────────────
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'Score must be 1-5' });

    const { data: review } = await supabase.from('review_requests')
      .select('lawyer_id, status').eq('id', req.params.id).eq('user_id', req.user.id).single();

    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.status !== 'complete') return res.status(400).json({ error: 'Can only rate completed reviews' });

    // Check not already rated
    const { data: existing } = await supabase.from('ratings')
      .select('id').eq('review_id', req.params.id).eq('user_id', req.user.id).single();
    if (existing) return res.status(409).json({ error: 'Already rated this review' });

    await supabase.from('ratings').insert({ review_id: req.params.id, lawyer_id: review.lawyer_id, user_id: req.user.id, score, comment });

    res.json({ message: 'Rating submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// ── FILE COMPLAINT ────────────────────────────────────────────
router.post('/:id/complaint', auth, async (req, res) => {
  try {
    const { reason, details } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const { data: review } = await supabase.from('review_requests')
      .select('lawyer_id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await supabase.from('complaints').insert({ review_id: req.params.id, lawyer_id: review.lawyer_id, user_id: req.user.id, reason, details });

    // Increment complaint count on lawyer
    await supabase.rpc('increment_complaint', { lawyer_id: review.lawyer_id });

    // Notify admin
    const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
    if (admin) {
      await supabase.from('notifications').insert({
        user_id: admin.id, type: 'complaint', title: 'New complaint filed',
        message: `A complaint has been filed against a lawyer for review ${req.params.id}.`,
        metadata: { review_id: req.params.id }
      });
    }

    res.json({ message: 'Complaint submitted. Admin will review within 48 hours.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to file complaint' });
  }
});

module.exports = router;

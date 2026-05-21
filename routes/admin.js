const express = require('express');
const supabase = require('../utils/supabase');
const { sendEmail } = require('../utils/email');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin role
router.use(auth, requireAdmin);

// ── DASHBOARD STATS ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [petitions, reviews, lawyers, complaints] = await Promise.all([
      supabase.from('petitions').select('id', { count: 'exact', head: true }),
      supabase.from('review_requests').select('id, plan, amount_paid, status', { count: 'exact' }),
      supabase.from('lawyers').select('id, status', { count: 'exact' }),
      supabase.from('complaints').select('id, status', { count: 'exact' })
    ]);

    const revenue = reviews.data?.filter(r => r.status === 'complete').reduce((s, r) => s + (r.amount_paid || 0), 0) || 0;
    const pending_reviews = reviews.data?.filter(r => r.status === 'pending').length || 0;
    const verified_lawyers = lawyers.data?.filter(l => l.status === 'verified').length || 0;
    const pending_lawyers = lawyers.data?.filter(l => l.status === 'under_review').length || 0;
    const open_complaints = complaints.data?.filter(c => c.status === 'open').length || 0;

    res.json({
      total_petitions: petitions.count || 0,
      total_reviews: reviews.count || 0,
      pending_reviews,
      total_lawyers: lawyers.count || 0,
      verified_lawyers,
      pending_lawyers,
      revenue,
      open_complaints
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET ALL LAWYERS (with filters) ───────────────────────────
router.get('/lawyers', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('lawyers').select('*, user:users(email, phone, created_at)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ lawyers: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lawyers' });
  }
});

// ── GET SINGLE LAWYER WITH DOCUMENTS ─────────────────────────
router.get('/lawyers/:id', async (req, res) => {
  try {
    const { data: lawyer, error } = await supabase
      .from('lawyers').select('*, user:users(email, phone, created_at)').eq('id', req.params.id).single();
    if (error || !lawyer) return res.status(404).json({ error: 'Lawyer not found' });

    // Generate signed URLs for documents (valid 1 hour)
    const bucket = process.env.STORAGE_BUCKET || 'lawyer-documents';
    const getUrl = async (path) => {
      if (!path) return null;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      return data?.signedUrl;
    };

    const [idCardUrl, enrolmentUrl, govtIdUrl] = await Promise.all([
      getUrl(lawyer.id_card_url),
      getUrl(lawyer.enrolment_cert_url),
      getUrl(lawyer.govt_id_url)
    ]);

    res.json({ lawyer: { ...lawyer, id_card_signed_url: idCardUrl, enrolment_cert_signed_url: enrolmentUrl, govt_id_signed_url: govtIdUrl } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lawyer' });
  }
});

// ── APPROVE LAWYER ────────────────────────────────────────────
router.post('/lawyers/:id/approve', async (req, res) => {
  try {
    const { data: lawyer, error } = await supabase.from('lawyers')
      .update({
        status: 'verified',
        verified_by: req.user.id,
        verified_at: new Date().toISOString(),
        re_verify_due: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Notify lawyer
    await sendEmail(lawyer.email, 'lawyerApproved', lawyer);
    await supabase.from('notifications').insert({
      user_id: (await supabase.from('users').select('id').eq('email', lawyer.email).single()).data?.id,
      type: 'lawyer_approved',
      title: 'Your account is verified',
      message: 'Your advocate account has been verified. You can now receive review assignments.',
      metadata: {}
    });

    res.json({ message: `Lawyer ${lawyer.name} approved and notified` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve lawyer' });
  }
});

// ── REJECT LAWYER ─────────────────────────────────────────────
router.post('/lawyers/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

    const { data: lawyer, error } = await supabase.from('lawyers')
      .update({ status: 'rejected', rejection_reason: reason, verified_by: req.user.id })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    await sendEmail(lawyer.email, 'lawyerRejected', lawyer, reason);

    res.json({ message: `Lawyer ${lawyer.name} rejected with reason: ${reason}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject lawyer' });
  }
});

// ── SUSPEND LAWYER ────────────────────────────────────────────
router.post('/lawyers/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    await supabase.from('lawyers').update({ status: 'suspended' }).eq('id', req.params.id);
    res.json({ message: 'Lawyer suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend lawyer' });
  }
});

// ── GET ALL REVIEW REQUESTS ───────────────────────────────────
router.get('/reviews', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('review_requests')
      .select(`*, petition:petitions(case_id, case_label, case_type), lawyer:lawyers(name, email, bar_reg_no)`)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ reviews: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── ASSIGN REVIEW TO LAWYER ───────────────────────────────────
router.post('/reviews/:id/assign', async (req, res) => {
  try {
    const { lawyer_id } = req.body;
    if (!lawyer_id) return res.status(400).json({ error: 'Lawyer ID required' });

    // Confirm lawyer is verified
    const { data: lawyer, error: lawErr } = await supabase
      .from('lawyers').select('id, name, email, status').eq('id', lawyer_id).single();
    if (lawErr || !lawyer) return res.status(404).json({ error: 'Lawyer not found' });
    if (lawyer.status !== 'verified') return res.status(400).json({ error: 'Lawyer must be verified before assignment' });

    const { data: review, error } = await supabase.from('review_requests')
      .update({ lawyer_id, status: 'assigned', assigned_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, petition:petitions(case_label, case_type)')
      .single();

    if (error) throw error;

    // Update petition status
    await supabase.from('petitions').update({ status: 'under_review' }).eq('id', review.petition_id);

    // Notify lawyer by email
    await sendEmail(lawyer.email, 'reviewAssigned', lawyer, {
      case_type: review.petition?.case_type,
      plan: review.plan,
      amount_paid: review.amount_paid,
      client_phone: review.client_phone,
      client_email: review.client_email
    });

    // Notify lawyer in-app
    const { data: lawyerUser } = await supabase.from('users').select('id').eq('email', lawyer.email).single();
    if (lawyerUser) {
      await supabase.from('notifications').insert({
        user_id: lawyerUser.id,
        type: 'review_assigned',
        title: 'New review assigned',
        message: `${review.petition?.case_label} review (${review.plan} — ₹${review.amount_paid}) has been assigned to you.`,
        metadata: { review_id: review.id }
      });
    }

    res.json({ message: `Review assigned to ${lawyer.name}` });
  } catch (err) {
    console.error('Assign error:', err);
    res.status(500).json({ error: 'Failed to assign review' });
  }
});

// ── GET ALL PETITIONS ─────────────────────────────────────────
router.get('/petitions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('petitions')
      .select('id, case_id, case_label, case_type, status, strength_score, created_at, user:users(fname, lname, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ petitions: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch petitions' });
  }
});

// ── GET ALL COMPLAINTS ────────────────────────────────────────
router.get('/complaints', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select(`*, lawyer:lawyers(name, bar_reg_no), user:users(fname, email), review:review_requests(review_id, plan)`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ complaints: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// ── RESOLVE COMPLAINT ─────────────────────────────────────────
router.post('/complaints/:id/resolve', async (req, res) => {
  try {
    const { action } = req.body; // 'resolved' or 'dismissed'
    await supabase.from('complaints').update({
      status: action === 'dismissed' ? 'dismissed' : 'resolved',
      resolved_by: req.user.id,
      resolved_at: new Date().toISOString()
    }).eq('id', req.params.id);
    res.json({ message: `Complaint ${action}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve complaint' });
  }
});

// ── GET ALL USERS ─────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, fname, lname, email, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── SUSPEND / REACTIVATE USER ─────────────────────────────────
router.post('/users/:id/toggle', async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('is_active').eq('id', req.params.id).single();
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', req.params.id);
    res.json({ message: `User ${user.is_active ? 'suspended' : 'reactivated'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ── GET NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ notifications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

module.exports = router;

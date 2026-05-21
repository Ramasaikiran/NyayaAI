const express = require('express');
const supabase = require('../utils/supabase');
const { auth, requireLawyer } = require('../middleware/auth');

const router = express.Router();

// ── GET LAWYER PROFILE + STATS ────────────────────────────────
router.get('/profile', auth, requireLawyer, async (req, res) => {
  try {
    const { data: lawyer, error } = await supabase
      .from('lawyers')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !lawyer) return res.status(404).json({ error: 'Lawyer profile not found' });

    // Stats
    const [reviews, ratings, complaints] = await Promise.all([
      supabase.from('review_requests').select('id, status, plan, amount_paid').eq('lawyer_id', lawyer.id),
      supabase.from('ratings').select('score').eq('lawyer_id', lawyer.id),
      supabase.from('complaints').select('id, status').eq('lawyer_id', lawyer.id)
    ]);

    const completed = reviews.data?.filter(r => r.status === 'complete') || [];
    const earnings = completed.reduce((s, r) => s + (r.amount_paid || 0), 0);
    const pending = reviews.data?.filter(r => ['assigned', 'in_review'].includes(r.status)) || [];

    res.json({
      lawyer,
      stats: {
        total_reviews: reviews.data?.length || 0,
        completed: completed.length,
        pending: pending.length,
        earnings,
        avg_rating: lawyer.avg_rating,
        complaint_count: complaints.data?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── UPDATE PROFILE ────────────────────────────────────────────
router.put('/profile', auth, requireLawyer, async (req, res) => {
  try {
    const { phone, specialisation, experience_years } = req.body;
    const { data: lawyer } = await supabase.from('lawyers').select('id').eq('user_id', req.user.id).single();

    await supabase.from('lawyers').update({ phone, specialisation, experience_years }).eq('id', lawyer.id);
    await supabase.from('users').update({ phone }).eq('id', req.user.id);

    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── GET NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', auth, requireLawyer, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    // Mark all as read
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    res.json({ notifications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;

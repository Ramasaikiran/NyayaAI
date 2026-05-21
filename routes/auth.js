const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const supabase = require('../utils/supabase');
const { sendEmail } = require('../utils/email');
const { auth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Validate Bar Council reg number format: XX/YYYY/NNNNN
function validateBarReg(reg) {
  return /^[A-Z]{1,3}\/\d{4}\/\d{1,6}$/.test(reg.toUpperCase());
}

// ── REGISTER ──────────────────────────────────────────────────
router.post('/register',
  upload.fields([
    { name: 'id_card', maxCount: 1 },
    { name: 'enrolment_cert', maxCount: 1 },
    { name: 'govt_id', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { fname, lname, email, phone, password, role,
              bar_reg_no, state_bar, specialisation, experience_years } = req.body;

      if (!fname || !email || !phone || !password) {
        return res.status(400).json({ error: 'Name, email, phone and password are required' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Check duplicate email
      const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      // Lawyer-specific validation
      if (role === 'lawyer') {
        if (!bar_reg_no || !state_bar || !specialisation) {
          return res.status(400).json({ error: 'Bar Council registration, state bar and specialisation required for advocates' });
        }
        if (!validateBarReg(bar_reg_no)) {
          return res.status(400).json({ error: 'Invalid Bar Council registration format. Use: STATE/YEAR/NUMBER (e.g. AP/2019/12345)' });
        }
        // Check duplicate reg number
        const { data: dupReg } = await supabase.from('lawyers').select('id').eq('bar_reg_no', bar_reg_no.toUpperCase()).single();
        if (dupReg) return res.status(409).json({ error: 'This Bar Council registration number is already registered' });

        // Require all 3 documents
        if (!req.files?.id_card?.[0] || !req.files?.enrolment_cert?.[0] || !req.files?.govt_id?.[0]) {
          return res.status(400).json({ error: 'All 3 documents required: Bar Council ID card, enrolment certificate, and government ID' });
        }
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({ fname, lname, email, phone, password_hash, role: role || 'citizen' })
        .select()
        .single();

      if (userErr) throw userErr;

      // If lawyer, upload docs + create lawyer record
      if (role === 'lawyer') {
        const bucketName = process.env.STORAGE_BUCKET || 'lawyer-documents';
        const uploadDoc = async (file, type) => {
          const path = `${user.id}/${type}_${Date.now()}.${file.originalname.split('.').pop()}`;
          const { error } = await supabase.storage
            .from(bucketName)
            .upload(path, file.buffer, { contentType: file.mimetype });
          if (error) throw error;
          return path;
        };

        const [idCardPath, enrolmentPath, govtIdPath] = await Promise.all([
          uploadDoc(req.files.id_card[0], 'id_card'),
          uploadDoc(req.files.enrolment_cert[0], 'enrolment_cert'),
          uploadDoc(req.files.govt_id[0], 'govt_id')
        ]);

        const { error: lawErr } = await supabase.from('lawyers').insert({
          user_id: user.id,
          name: `${fname} ${lname || ''}`.trim(),
          email, phone,
          bar_reg_no: bar_reg_no.toUpperCase(),
          state_bar, specialisation,
          experience_years: parseInt(experience_years) || 0,
          id_card_url: idCardPath,
          enrolment_cert_url: enrolmentPath,
          govt_id_url: govtIdPath,
          status: 'under_review'
        });

        if (lawErr) throw lawErr;

        // Alert admin
        await sendEmail(process.env.ADMIN_EMAIL, 'lawyerRegistered', {
          name: `${fname} ${lname || ''}`.trim(),
          bar_reg_no: bar_reg_no.toUpperCase(),
          state_bar, specialisation, email
        });

        // Create notification for admin
        const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
        if (admin) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            type: 'lawyer_registration',
            title: 'New lawyer registration',
            message: `${fname} ${lname || ''} (${bar_reg_no.toUpperCase()}) has registered and is awaiting verification.`,
            metadata: { lawyer_email: email }
          });
        }
      }

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

      res.status(201).json({
        message: role === 'lawyer' ? 'Registration submitted. Pending admin verification (24-48 hours).' : 'Account created successfully',
        token,
        user: { id: user.id, fname, lname, email, phone, role: user.role }
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// ── LOGIN ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, fname, lname, phone, role, is_active, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ error: 'Account suspended. Contact admin@nyayaai.in' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // If lawyer, get verification status
    let lawyerStatus = null;
    if (user.role === 'lawyer') {
      const { data: lawyer } = await supabase.from('lawyers').select('status, avg_rating, total_reviews_done').eq('user_id', user.id).single();
      lawyerStatus = lawyer;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, lawyerStatus } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET CURRENT USER ───────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    let extra = {};
    if (req.user.role === 'lawyer') {
      const { data } = await supabase.from('lawyers').select('*').eq('user_id', req.user.id).single();
      extra.lawyer = data;
    }
    res.json({ user: { ...req.user, ...extra } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── CHANGE PASSWORD ────────────────────────────────────────────
router.put('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;

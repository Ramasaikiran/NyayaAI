const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

/**
 * JWT Authentication Middleware
 * Validates the authorization token and attaches the user object to req.user.
 */
async function auth(req, res, next) {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Malformed token.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
    }

    // Retrieve user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, fname, lname, phone, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Access denied. User no longer exists.' });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Contact admin@nyayaai.in' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication internal server error' });
  }
}

/**
 * Authorization Middleware for Lawyer Role
 */
function requireLawyer(req, res, next) {
  if (req.user && req.user.role === 'lawyer') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Lawyer privilege required.' });
}

/**
 * Authorization Middleware for Admin Role
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Admin privilege required.' });
}

module.exports = {
  auth,
  requireLawyer,
  requireAdmin
};

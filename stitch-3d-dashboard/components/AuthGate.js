/**
 * AuthGate Component
 * Provides session handling, route protection, and authentication guards.
 */

// ── GET CURRENT SESSION ────────────────────────────────────
export function checkSession() {
  try {
    const session = sessionStorage.getItem('stitch_session') || localStorage.getItem('stitch_session');
    return session ? JSON.parse(session) : null;
  } catch (e) {
    console.error('Failed to read session:', e);
    return null;
  }
}

// ── CREATE NEW SESSION ─────────────────────────────────────
export function saveSession(user, rememberMe = true) {
  const sessionData = {
    name: user.name,
    email: user.email,
    apiKey: user.apiKey,
    token: `mcp_token_${btoa(user.email)}_${Math.random().toString(36).substring(2, 10)}`,
    establishedAt: new Date().toISOString()
  };
  
  const serialized = JSON.stringify(sessionData);
  
  if (rememberMe) {
    localStorage.setItem('stitch_session', serialized);
  } else {
    sessionStorage.setItem('stitch_session', serialized);
  }
  
  return sessionData;
}

// ── CLEAR ACTIVE SESSION ───────────────────────────────────
export function clearSession() {
  localStorage.removeItem('stitch_session');
  sessionStorage.removeItem('stitch_session');
}

// ── PROGRAMMATIC ROUTE GUARD ───────────────────────────────
export function authGuard(targetPath, onNavigate) {
  const activeSession = checkSession();
  
  // Intercept access to protected routes
  if (!activeSession && targetPath === '/dashboard') {
    console.warn(`AuthGate: Intercepted unauthorized navigation to ${targetPath}. Redirecting to /login.`);
    onNavigate('/login');
    return false;
  }
  
  // Intercept authenticated users visiting landing/auth pages and push to dashboard
  if (activeSession && (targetPath === '/login' || targetPath === '/register' || targetPath === '/')) {
    console.log(`AuthGate: User already authenticated. Redirecting from ${targetPath} to /dashboard.`);
    onNavigate('/dashboard');
    return false;
  }
  
  return true;
}

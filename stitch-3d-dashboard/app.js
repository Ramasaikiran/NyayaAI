/**
 * Application Core Coordinator
 * Manages client-side routing, global state, and lifecycle triggers.
 */

import { checkSession, saveSession, authGuard } from './components/AuthGate.js';
import { renderLogin, renderRegister } from './components/AuthForms.js';
import { renderDashboard } from './components/Dashboard3D.js';

// Global state
const state = {
  currentPath: window.location.pathname || '/',
  currentUser: null
};

// Root mount container
const appMount = document.getElementById('app-mount');

// ── ROUTING DRIVER ─────────────────────────────────────────
function navigate(path) {
  // 1. Run Auth Guard Check
  const allowed = authGuard(path, (altPath) => {
    // If auth guard triggers redirect, follow it
    navigate(altPath);
  });
  
  if (!allowed) return;

  state.currentPath = path;
  
  // Update browser URL state history quietly without page refresh
  window.history.pushState({}, '', path);
  
  // 2. Render Target View
  renderView(path);
}

function renderView(path) {
  // Clear any existing DOM nodes
  appMount.innerHTML = '';
  
  const user = checkSession();
  state.currentUser = user;

  switch (path) {
    case '/register':
      renderRegister(
        appMount, 
        (path) => navigate(path), // onNavigate callback
        (registeredUser) => {
          // Auto login after registration
          const session = saveSession(registeredUser, true);
          state.currentUser = session;
          navigate('/dashboard');
        }
      );
      break;
      
    case '/login':
      renderLogin(
        appMount,
        (path) => navigate(path), // onNavigate callback
        (loggedInUser) => {
          const session = saveSession(loggedInUser, true);
          state.currentUser = session;
          navigate('/dashboard');
        }
      );
      break;
      
    case '/dashboard':
      if (state.currentUser) {
        renderDashboard(appMount, state.currentUser, (path) => navigate(path));
      } else {
        navigate('/login');
      }
      break;
      
    default:
      // Fallback
      if (state.currentUser) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
      break;
  }
}

// ── INITIALIZATION ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load mock accounts database if empty (create a developer demo account)
  const existingUsers = JSON.parse(localStorage.getItem('stitch_users') || '[]');
  if (existingUsers.length === 0) {
    const demoUser = {
      name: 'Designer Max',
      email: 'max@stitch.io',
      password: 'password123',
      apiKey: 'AIzaSyDemoKeyStitchMcp2026',
      registeredAt: new Date().toISOString()
    };
    existingUsers.push(demoUser);
    localStorage.setItem('stitch_users', JSON.stringify(existingUsers));
    console.log('Stitch MCP: Pre-populated developer demo account: max@stitch.io / password123');
  }

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname);
  });

  // Catch clicking on any standard absolute paths to keep in-app routing SPA
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    }
  });

  // Perform initial route check
  const startPath = window.location.pathname === '/' ? '/login' : window.location.pathname;
  navigate(startPath);
});

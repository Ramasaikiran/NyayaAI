/**
 * AuthForms Component
 * Renders the Registration and Login forms in modern ES6 modules.
 */

// Helper to show inline alerts
function showAlert(message, type = 'danger') {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  toast.className = `toast show toast-${type}`;
  toast.querySelector('.toast-text').textContent = message;
  
  // Custom SVG icon based on type
  const iconContainer = toast.querySelector('.toast-icon');
  if (type === 'success') {
    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
  } else {
    iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ── RENDER REGISTRATION FORM ───────────────────────────────
export function renderRegister(container, onNavigate, onRegisterSuccess) {
  container.innerHTML = `
    <div class="view-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.982-11.795M20.613 9.813L21 9l-11.795 8.982m11.59-11.59L1.518 11.25a.75.75 0 00-.012 1.416l8.92 3.717 3.717 8.92a.75.75 0 001.416-.012l5.353-17.14a.75.75 0 00-.979-.98L1.518 11.25z" />
            </svg>
            Stitch MCP
          </div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Connect your design workspace to start</p>
        </div>

        <form id="register-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="reg-name">Full Name</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <input class="form-input has-icon-left" type="text" id="reg-name" placeholder="John Doe" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-email">Email Address</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input class="form-input has-icon-left" type="email" id="reg-email" placeholder="name@domain.com" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <input class="form-input has-icon-left" type="password" id="reg-password" placeholder="••••••••" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reg-mcp-key">Stitch MCP API Key</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <input class="form-input has-icon-left mono" type="password" id="reg-mcp-key" placeholder="AIzaSy..." required />
            </div>
          </div>

          <button class="btn btn-primary" type="submit" id="btn-submit-register">
            Register Workspace
          </button>
        </form>

        <div class="form-footer">
          Already registered? 
          <a class="form-link" href="#" id="link-to-login">Log In</a>
        </div>
      </div>
    </div>
  `;

  // Attach Navigation Listeners
  document.getElementById('link-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('/login');
  });

  // Attach Form Submit Listener
  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const apiKey = document.getElementById('reg-mcp-key').value.trim();
    
    const submitBtn = document.getElementById('btn-submit-register');

    // Validation
    if (!name || !email || !password || !apiKey) {
      showAlert('Please fill in all the required fields');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters long');
      return;
    }

    // Stitch API Key format check (standard Google Cloud API key style: starts with AIzaSy)
    if (!apiKey.startsWith('AIzaSy') || apiKey.length < 20) {
      showAlert('Invalid Stitch API Key format. Must be a valid Google API Key (starts with AIzaSy)');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span> Verifying...`;
      
      // Simulate Stitch MCP connection handshake delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Retrieve existing users
      const users = JSON.parse(localStorage.getItem('stitch_users') || '[]');
      
      // Check duplicate email
      if (users.find(u => u.email === email)) {
        showAlert('This email address is already registered');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Workspace';
        return;
      }

      // Save new user
      const newUser = {
        name,
        email,
        password, // stored plain text for mock dashboard purposes
        apiKey,
        registeredAt: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('stitch_users', JSON.stringify(users));

      showAlert('Registration successful! Connecting to Stitch MCP...', 'success');
      
      // Navigate to Login after a short delay
      setTimeout(() => {
        onRegisterSuccess(newUser);
      }, 1000);

    } catch (err) {
      showAlert('Failed to connect to Stitch MCP. Check your internet or API Key.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register Workspace';
    }
  });
}

// ── RENDER LOGIN FORM ──────────────────────────────────────
export function renderLogin(container, onNavigate, onLoginSuccess) {
  container.innerHTML = `
    <div class="view-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.982-11.795M20.613 9.813L21 9l-11.795 8.982m11.59-11.59L1.518 11.25a.75.75 0 00-.012 1.416l8.92 3.717 3.717 8.92a.75.75 0 001.416-.012l5.353-17.14a.75.75 0 00-.979-.98L1.518 11.25z" />
            </svg>
            Stitch MCP
          </div>
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Log in to retrieve your 3D design constellation</p>
        </div>

        <form id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="log-email">Email Address</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input class="form-input has-icon-left" type="email" id="log-email" placeholder="name@domain.com" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="log-password">Password</label>
            <div class="input-wrapper">
              <svg class="input-icon-left" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <input class="form-input has-icon-left" type="password" id="log-password" placeholder="••••••••" required />
            </div>
          </div>

          <button class="btn btn-primary" type="submit" id="btn-submit-login">
            Access Dashboard
          </button>
        </form>

        <div class="form-footer">
          Don't have a workspace? 
          <a class="form-link" href="#" id="link-to-register">Register Now</a>
        </div>
      </div>
    </div>
  `;

  // Attach Navigation Listeners
  document.getElementById('link-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('/register');
  });

  // Attach Form Submit Listener
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('log-email').value.trim();
    const password = document.getElementById('log-password').value;
    const submitBtn = document.getElementById('btn-submit-login');

    if (!email || !password) {
      showAlert('Please enter both your email and password');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span> Authenticating...`;
      
      // Short delay for aesthetic transition
      await new Promise(resolve => setTimeout(resolve, 1000));

      const users = JSON.parse(localStorage.getItem('stitch_users') || '[]');
      const matchedUser = users.find(u => u.email === email && u.password === password);

      if (!matchedUser) {
        showAlert('Invalid email or password. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Access Dashboard';
        return;
      }

      showAlert('Login successful! Welcome back.', 'success');
      
      setTimeout(() => {
        onLoginSuccess(matchedUser);
      }, 1000);

    } catch (err) {
      showAlert('Authentication process failed. Please retry.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Access Dashboard';
    }
  });
}

# Stitch MCP — 3D Animated Design DNA Dashboard

An ultra-responsive, light-themed web application integrating **Stitch MCP** user registration/authentication and an interactive **Three.js** 3D animated dashboard. Built using a modern, zero-dependency **Modular ES6 Single-Page Architecture** (SPA).

---

## 🚀 Key Deliverables Implemented

1. **Architecture & Technical Design**: Full technical description of session lifecycle, security guards, and 3D canvas resource cleanup.
2. **Stitch MCP User Authentication**: Complete registration and login interface with instant validation for Stitch API Keys (starts with `AIzaSy`).
3. **Interactive 3D Design DNA Constellation**: A performance-tuned **Three.js** canvas scene rendering design tokens (colors, typographies, spacing rules) connected by golden vector wireframes.
4. **Token Inspector HUD**: Move your cursor or click on any 3D node in the constellation to cast rays (via Three.js `Raycaster`), highlighting the node and opening a glassmorphic Inspector HUD with the token's values.
5. **Secure Route Guard (`AuthGate`)**: Complete session interception; if a logged-out user attempts to access `/dashboard`, they are instantly redirected to `/login`.

---

## 🎨 Premium Light UI Design Principles

* **Harmonious Color Palette**: Built on warm alabaster whites (`#F8FAFC`, `#FFFFFF`), clean charcoal text (`#0F172A`), and glowing electric blue (`#2563EB`) and amber gold (`#D97706`) accents.
* **Glassmorphic HUD Panels**: Pure white translucent cards (`rgba(255, 255, 255, 0.7)`) with very fine boundaries (`rgba(15, 23, 42, 0.05)`) and heavy backdrop blurs (`blur(24px)`).
* **Elegant Animations**: Smooth springy buttons, glowing pulse indicators for connected servers, and elastic page entrances.

---

## 📂 Project Structure

```
stitch-3d-dashboard/
├── index.html          # Main SPA Entry Point (HTML5/CDN scripts/Mounts)
├── styles.css          # Design System Stylesheet & Micro-interactions
├── app.js              # Central Coordinator & SPA client-side routing
├── components/
│   ├── AuthGate.js     # Protected Route Guard & Session Manager
│   ├── AuthForms.js    # Registration and Login View Controllers
│   └── Dashboard3D.js  # Three.js 3D Constellation & inspector panel
├── vercel.json         # Vercel SPA Catch-All routing config
└── README.md           # Setup, execution, and architectural details
```

---

## 🔑 Quick Login Credentials (Developer Demo)

To save you the time of registering an account, the application automatically pre-populates a developer demo account in local storage on startup:
* **Email**: `max@stitch.io`
* **Password**: `password123`
* **Stitch API Key**: `AIzaSyDemoKeyStitchMcp2026`

---

## 💻 Setup & Local Execution

Since this app uses zero dependencies and modular ES6 imports, you do not need to install complex packages! You can run it instantly using any basic static file server:

### Option A: VS Code Live Server (Easiest)
1. Open the project folder in VS Code.
2. Click **Go Live** in the bottom status bar.
3. Open the browser at `http://127.0.0.1:5500`.

### Option B: Python Server
Open your terminal in the `stitch-3d-dashboard/` folder and run:
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000`.

### Option C: NodeJS Local Runner
If you have node installed globally:
```bash
npx serve .
```

---

## ⚙️ Three.js Performance Optimizations

1. **Conditional OrbitControls**: Handled by damping factors (`dampingFactor: 0.05`) to keep mouse movements silky smooth.
2. **Resource Disposal**: When you click **Disconnect MCP** to log out, the application stops the `requestAnimationFrame` loop, destroys event listeners, and disposes of all geometries, materials, and canvas elements to free up memory completely.
3. **Throttled Render**: Configured WebGL pixel ratios (`Math.min(window.devicePixelRatio, 2)`) to prevent GPU hogging on high-DPI displays.

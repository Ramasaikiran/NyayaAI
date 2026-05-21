/**
 * Dashboard3D Component
 * Renders the dashboard shell and initializes the Three.js 3D Design DNA Constellation.
 */

import { clearSession } from './AuthGate.js';

// Define the design tokens retrieved via "Stitch MCP" to show in the 3D scene
const DESIGN_TOKENS = [
  { id: 'token-1', name: 'Primary Accent', category: 'Color', value: '#2563EB', description: 'Electric Blue brand accent', color: 0x2563eb, size: 1.4, x: -3, y: 2, z: 1 },
  { id: 'token-2', name: 'Accent Gold', category: 'Color', value: '#D97706', description: 'Premium Amber Amber brand accent', color: 0xd97706, size: 1.1, x: 3, y: -1, z: 2 },
  { id: 'token-3', name: 'Slate Gray', category: 'Color', value: '#475569', description: 'Neutral typography slate', color: 0x475569, size: 1.0, x: -1, y: -3, z: -2 },
  { id: 'token-4', name: 'Base Background', category: 'Color', value: '#F8FAFC', description: 'Alabaster primary background canvas', color: 0xf8fafc, size: 0.9, x: 2, y: 3, z: -1 },
  { id: 'token-5', name: 'Border Radius', category: 'Structure', value: '14px', description: 'Glassmorphic panel rounding standard', color: 0x10b981, size: 1.2, x: -2, y: -1, z: 3 },
  { id: 'token-6', name: 'Font Family', category: 'Typography', value: 'Plus Jakarta Sans', description: 'Modern dynamic sans serif typeface', color: 0xec4899, size: 1.3, x: 1, y: -2, z: -3 },
  { id: 'token-7', name: 'Layout Spacing', category: 'Grid', value: '24px', description: 'Responsive container grid padding', color: 0x8b5cf6, size: 1.1, x: 4, y: 2, z: -2 },
  { id: 'token-8', name: 'Blur Intensity', category: 'Effect', value: '24px saturate(180%)', description: 'Backdrop glass filter saturation standard', color: 0x06b6d4, size: 1.0, x: -4, y: 1, z: -1 }
];

export function renderDashboard(container, sessionUser, onNavigate) {
  // ── RENDER DASHBOARD LAYOUT HTML ───────────────────────────
  container.innerHTML = `
    <div class="dashboard-layout">
      <!-- ── SIDEBAR NAV ────────────────────────────────────── -->
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="sidebar-header">
            <div class="sidebar-logo">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 21l8.982-11.795M20.613 9.813L21 9l-11.795 8.982m11.59-11.59L1.518 11.25a.75.75 0 00-.012 1.416l8.92 3.717 3.717 8.92a.75.75 0 001.416-.012l5.353-17.14a.75.75 0 00-.979-.98L1.518 11.25z" />
              </svg>
              Stitch Console
            </div>
            
            <div class="mcp-connection-status">
              <span class="status-dot"></span>
              Stitch MCP: Connected
            </div>
          </div>

          <nav class="nav-menu">
            <li class="nav-item">
              <a href="#" class="nav-link active" id="nav-constellation">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.97 5.97 0 00-.75-2.982m-9.193 9.193a11.985 11.985 0 01-5.105-5.105m1.58-1.193a5.007 5.007 0 013.86-3.86m-1.2 4.96c0-.225.012-.447.037-.666a11.944 11.944 0 015.962-9.283M8.97 12.243a5.007 5.007 0 013.86-3.86m-1.8 10.6c0-2.072 1.13-3.882 2.818-4.858L12 14.25m0 0l.218-.09A6.03 6.03 0 0115 17.25M9 12.75a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0z" />
                </svg>
                Design DNA
              </a>
            </li>
          </nav>
        </div>

        <div class="sidebar-footer">
          <div class="user-profile">
            <div class="user-avatar">
              ${sessionUser.name.charAt(0).toUpperCase()}
            </div>
            <div class="user-details">
              <div class="user-name">${sessionUser.name}</div>
              <div class="user-role">Stitch Operator</div>
            </div>
          </div>
          
          <button class="btn btn-secondary" id="btn-logout" style="padding: 10px; font-size: 0.85rem;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;vertical-align:middle;margin-right:4px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Disconnect MCP
          </button>
        </div>
      </aside>

      <!-- ── VIEWPORT ───────────────────────────────────────── -->
      <main class="main-viewport">
        <!-- ── HUD OVERLAY ──────────────────────────────────── -->
        <div class="hud-overlay">
          <div class="hud-panel">
            <h2 class="hud-title">3D Token Explorer</h2>
            <p class="hud-desc">Active Stitch MCP Key: <span style="font-family:monospace;color:var(--color-primary);">${sessionUser.apiKey.substring(0, 10)}...</span></p>
          </div>
        </div>

        <!-- ── 3D CANVAS CONTAINER ───────────────────────────── -->
        <div class="canvas-container" id="three-canvas-container"></div>
        
        <!-- ── CANVAS LOADING SPINNER ───────────────────────── -->
        <div class="canvas-loading" id="canvas-spinner">
          <div style="text-align:center;">
            <div class="spinner" style="margin:0 auto 16px;"></div>
            <p style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Generating 3D Constellation Mesh...</p>
          </div>
        </div>

        <!-- ── MANUAL PANEL INSTRUCTIONS ────────────────────── -->
        <div class="instructions-panel">
          <div class="instruction-row">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 9.152c.582.448 1.148.89 1.676 1.345m-1.676-1.345c-.528-.407-1.074-.82-1.628-1.234M15.042 9.152c.563-.43 1.171-.856 1.796-1.272M16.838 7.88c.553-.367 1.096-.732 1.62-.1.524.633.09 1.155-.382 1.488L15.042 9.152z" />
            </svg>
            Drag to Rotate Constellation
          </div>
          <div class="instruction-row">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
            Scroll to Zoom In/Out
          </div>
          <div class="instruction-row">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 9.152L12 11.25m0 0l-3.042-2.098m3.042 2.098v6.75m0-6.75v-6.75" />
            </svg>
            Hover or Click Spheres to inspect Token DNA
          </div>
        </div>

        <!-- ── TOKEN INSPECTOR SIDEBAR ──────────────────────── -->
        <div class="token-inspector-panel" id="token-inspector">
          <div class="inspector-header">
            <h3 class="inspector-title" id="inspector-token-category">Token Structure</h3>
            <button class="close-btn" id="inspector-close">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="inspector-content">
            <div class="token-data-row">
              <span class="token-data-label">Token Name</span>
              <span class="token-data-value" id="inspector-token-name">Primary Color</span>
            </div>
            <div class="token-data-row">
              <span class="token-data-label">DNA Value</span>
              <span class="token-data-value" style="font-weight:600;display:flex;align-items:center;" id="inspector-token-value">
                <span class="token-color-preview" id="inspector-color-preview"></span>
                #2563EB
              </span>
            </div>
            <div class="token-data-row">
              <span class="token-data-label">Design Description</span>
              <p style="font-size:0.8rem;color:var(--text-muted);line-height:1.4;" id="inspector-token-desc">Primary brand accent color used for actions.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // Handle Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    // Safely stop animation loop and destroy canvas elements
    destroyThreeScene();
    clearSession();
    onNavigate('/login');
  });

  // Handle Inspector Panel Close
  const inspector = document.getElementById('token-inspector');
  document.getElementById('inspector-close').addEventListener('click', () => {
    inspector.classList.remove('show');
  });

  // ── INITIALIZE THREE.JS SCENE ─────────────────────────────
  let scene, camera, renderer, controls;
  let spheres = [];
  let connectionLines;
  let animationFrameId;
  let raycaster, mouse;
  let hoveredObj = null;

  // Initialize
  setTimeout(() => {
    try {
      initThree();
      // Remove loading spinner
      const spinner = document.getElementById('canvas-spinner');
      if (spinner) spinner.style.opacity = '0';
      setTimeout(() => spinner && spinner.remove(), 500);
    } catch (e) {
      console.error('Three.js failed to initialize:', e);
      document.getElementById('canvas-spinner').innerHTML = `<p style="color:red;font-weight:700;">3D Graphics acceleration is disabled or unsupported in this browser.</p>`;
    }
  }, 800);

  function initThree() {
    const container3d = document.getElementById('three-canvas-container');
    const width = container3d.clientWidth;
    const height = container3d.clientHeight;

    // 1. Scene & Render
    scene = new THREE.Scene();
    // Warm, soft ivory light theme background
    scene.background = new THREE.Color(0xf8fafc);
    // Subtle fog to increase depth
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.04);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 12);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container3d.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    directionalLight1.position.set(5, 8, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x2563eb, 0.35); // electric blue fill
    directionalLight2.position.set(-5, -5, 2);
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xd97706, 0.5, 20); // warm golden light center
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 5. Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 25;
    controls.minDistance = 5;
    controls.enablePan = false;

    // 6. Build Constellation Elements
    buildConstellation();

    // 7. Raycasting Setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Attach Event Listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // Start Loop
    animate();
  }

  function buildConstellation() {
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    // Create Spheres
    DESIGN_TOKENS.forEach(token => {
      // Premium material: translucent, slightly shiny glassmorphic effect
      const geometry = new THREE.SphereGeometry(token.size * 0.38, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: token.color,
        roughness: 0.15,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        transmission: 0.3, // gives standard glass thickness transparency
        thickness: 1.0,
        ior: 1.5,
        opacity: 0.9,
        transparent: true
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(token.x, token.y, token.z);
      
      // Store token ID and original scales on mesh details
      mesh.userData = { 
        tokenData: token,
        originalScale: 1.0,
        originalColor: token.color
      };

      sphereGroup.add(mesh);
      spheres.push(mesh);

      // Add a subtle glowing halo around color tokens
      if (token.category === 'Color') {
        const haloGeo = new THREE.RingGeometry(token.size * 0.42, token.size * 0.47, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: token.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        mesh.add(halo);
      }
    });

    // Create Golden connecting lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xd97706, // golden lines
      transparent: true,
      opacity: 0.15,
      linewidth: 1
    });

    const linePositions = [];
    // Draw lines connecting closest nodes together to create a grid/constellation mesh
    for (let i = 0; i < spheres.length; i++) {
      for (let j = i + 1; j < spheres.length; j++) {
        const dist = spheres[i].position.distanceTo(spheres[j].position);
        // If distance is short enough, draw line
        if (dist < 6.8) {
          linePositions.push(spheres[i].position.x, spheres[i].position.y, spheres[i].position.z);
          linePositions.push(spheres[j].position.x, spheres[j].position.y, spheres[j].position.z);
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    
    connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connectionLines);
  }

  // Animation Loop
  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Rotate spheres slowly on their axes
    spheres.forEach((sphere, index) => {
      sphere.rotation.y += 0.008;
      // Add subtle harmonic float translation (up and down bouncing)
      const offset = index * 0.5;
      sphere.position.y = sphere.userData.tokenData.y + Math.sin(Date.now() * 0.001 + offset) * 0.15;
    });

    // Rotate the lines slightly differently to keep the mesh dynamic
    if (connectionLines) {
      connectionLines.rotation.y = Math.sin(Date.now() * 0.0001) * 0.05;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  // Event handlers
  function onWindowResize() {
    const container3d = document.getElementById('three-canvas-container');
    if (!container3d) return;
    const width = container3d.clientWidth;
    const height = container3d.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(spheres);

    if (intersects.length > 0) {
      // Hovering a sphere
      const obj = intersects[0].object;
      
      if (hoveredObj !== obj) {
        // Reset old hovered sphere
        if (hoveredObj) {
          hoveredObj.scale.set(1, 1, 1);
          document.body.style.cursor = 'default';
        }
        
        // Emphasize new hovered sphere
        hoveredObj = obj;
        hoveredObj.scale.set(1.25, 1.25, 1.25);
        document.body.style.cursor = 'pointer';
      }
    } else {
      // Hovering empty space
      if (hoveredObj) {
        hoveredObj.scale.set(1, 1, 1);
        hoveredObj = null;
        document.body.style.cursor = 'default';
      }
    }
  }

  function onClick(event) {
    if (!hoveredObj) return;

    const data = hoveredObj.userData.tokenData;
    
    // Fill inspector values
    document.getElementById('inspector-token-category').textContent = `Token ${data.category}`;
    document.getElementById('inspector-token-name').textContent = data.name;
    
    const valueEl = document.getElementById('inspector-token-value');
    const colorPreview = document.getElementById('inspector-color-preview');
    
    if (data.category === 'Color') {
      colorPreview.style.display = 'inline-block';
      colorPreview.style.backgroundColor = data.value;
      valueEl.innerHTML = `<span class="token-color-preview" id="inspector-color-preview" style="background-color:${data.value}"></span> ${data.value}`;
    } else {
      colorPreview.style.display = 'none';
      valueEl.textContent = data.value;
    }
    
    document.getElementById('inspector-token-desc').textContent = data.description;
    
    // Toggle active animations on selection
    inspector.classList.add('show');
  }

  // Resource Disposal
  function destroyThreeScene() {
    cancelAnimationFrame(animationFrameId);
    
    window.removeEventListener('resize', onWindowResize);
    if (renderer) {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      
      // Dispose materials & geometries to release memory
      spheres.forEach(mesh => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      
      if (connectionLines) {
        connectionLines.geometry.dispose();
        connectionLines.material.dispose();
      }

      renderer.dispose();
      const container3d = document.getElementById('three-canvas-container');
      if (container3d && renderer.domElement) {
        container3d.removeChild(renderer.domElement);
      }
    }
  }
}

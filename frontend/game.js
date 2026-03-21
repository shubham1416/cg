/* ─────────────────────────────────────────────────────────
   Compliance Quest — OfficeScene  (Phaser 3)
   Premium interactive game with isometric characters,
   collision zones, depth sorting & corridor navigation
   ───────────────────────────────────────────────────────── */

// SCENARIOS are loaded from scenarios.js (included before this file)
if (typeof SCENARIOS === "undefined") {
  console.error("SCENARIOS not found! Make sure scenarios.js is loaded before game.js");
}


const NPC_NAMES = [
  'Annie Verma', 'Manjot Singh', 'Vaibhav Batra', 'Saryu Agnihotri', 'Tarinder Singh',
  'Arjun', 'Isha', 'Vikram', 'Meera', 'Neha', 'Kabir', 'Rohan', 'Aditi', 'Priya', 'Raj',
  'Sunita', 'Amit', 'Kavita', 'Prakash', 'Suresh', 'Anupama', 'Deepak', 'Madhu'
];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const API_BASE = '';

const MAX_LEVEL = 3;
const SCENARIOS_PER_LEVEL = 3;
const TIMER_SECONDS = 60;

/* ─────────────────────────────────────────────────────────
   Sitting NPC Desk Positions (normalized to 1.0)
   ───────────────────────────────────────────────────────── */

const DESK_POSITIONS = [
  { fx: 0.27, fy: 0.42, dir: 'up' },    // Row 1 Left (Pink Chair)
  { fx: 0.73, fy: 0.39, dir: 'up' },    // Row 1 Right (Purple Chair)
  { fx: 0.23, fy: 0.62, dir: 'up' },    // Row 2 Left (Purple Chair)
  { fx: 0.37, fy: 0.65, dir: 'up' },    // Row 2 Left-Center (Gray Chair)
  { fx: 0.65, fy: 0.62, dir: 'up' },    // Row 2 Right-Center (Yellow Chair)
  { fx: 0.82, fy: 0.95, dir: 'up' },    // Row 3 Right (Red Chair)
];

const PLAYER_HOME = { fx: 0.21, fy: 0.93, dir: 'up' };
const MANAGER_POS = { fx: 0.89, fy: 0.60, dir: 'left' };

/* ─────────────────────────────────────────────────────────
   Procedural isometric character texture generator.
   Creates human-looking figures that match the pixel-art
   style of the office background.
   ───────────────────────────────────────────────────────── */
function createCharacterTexture(scene, key, options = {}) {
  const {
    shirtColor = '#3B82F6',   // blue shirt
    pantsColor = '#1E293B',   // dark pants
    skinColor = '#D4A574',    // skin tone
    hairColor = '#3D2B1F',    // dark brown hair
    width = 28,
    height = 44,
    isWalking = false,
    walkFrame = 0,
    facing = 'down',         // 'down','up','left','right'
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const cx = width / 2;

  // Shadow under character
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, height - 2, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Leg offsets for walking animation (reduced swing to match isometric style)
  let leftLegOff = 0, rightLegOff = 0;
  if (isWalking) {
    const swing = Math.sin(walkFrame * Math.PI / 2) * 2;
    leftLegOff = swing;
    rightLegOff = -swing;
  }

  // ── Legs ──
  ctx.fillStyle = pantsColor;
  // Left leg
  ctx.fillRect(cx - 5, height - 14 + leftLegOff, 4, 10);
  // Right leg
  ctx.fillRect(cx + 1, height - 14 + rightLegOff, 4, 10);

  // ── Shoes ──
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx - 6, height - 5 + leftLegOff, 5, 3);
  ctx.fillRect(cx + 1, height - 5 + rightLegOff, 5, 3);

  // ── Body/Torso ──
  ctx.fillStyle = shirtColor;
  // Torso
  ctx.fillRect(cx - 7, height - 26, 14, 14);
  // Slight shape
  ctx.fillRect(cx - 8, height - 24, 16, 10);

  // ── Arms ──
  let leftArmOff = 0, rightArmOff = 0;
  if (isWalking) {
    leftArmOff = -leftLegOff * 0.7;
    rightArmOff = -rightLegOff * 0.7;
  }
  // Left arm
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx - 11, height - 25 + leftArmOff, 4, 10);
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx - 11, height - 16 + leftArmOff, 4, 3);
  // Right arm
  ctx.fillStyle = shirtColor;
  ctx.fillRect(cx + 7, height - 25 + rightArmOff, 4, 10);
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx + 7, height - 16 + rightArmOff, 4, 3);

  // ── Neck ──
  ctx.fillStyle = skinColor;
  ctx.fillRect(cx - 2, height - 29, 4, 4);

  // ── Head ──
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(cx, height - 34, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Add detail for professional look: Suit jacket (optional) ──
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 7, height - 26, 14, 14);

  // ── Hair ──
  ctx.fillStyle = hairColor;
  if (facing === 'up') {
    // Full hair from behind
    ctx.beginPath();
    ctx.ellipse(cx, height - 36, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Hair on top
    ctx.beginPath();
    ctx.ellipse(cx, height - 38, 6, 4, 0, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    ctx.fillRect(cx - 6, height - 39, 12, 4);
  }

  // ── Face details (only front/side facing) ──
  if (facing === 'down' || facing === 'left' || facing === 'right') {
    // Eyes
    ctx.fillStyle = '#1a1a1a';
    if (facing === 'left') {
      ctx.fillRect(cx - 3, height - 35, 2, 2);
    } else if (facing === 'right') {
      ctx.fillRect(cx + 1, height - 35, 2, 2);
    } else {
      ctx.fillRect(cx - 3, height - 35, 2, 2);
      ctx.fillRect(cx + 1, height - 35, 2, 2);
    }
  }

  // Add to Phaser texture manager
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/* ─────────────────────────────────────────────────────────
   Generate all character animation frames as textures
   ───────────────────────────────────────────────────────── */
function generateCharacterSprites(scene, prefix, options = {}) {
  const dirs = ['down', 'up', 'left', 'right'];
  dirs.forEach(dir => {
    // Standing frame
    createCharacterTexture(scene, `${prefix}_${dir}_stand`, {
      ...options, facing: dir, isWalking: false
    });
    // Walking frames
    for (let f = 0; f < 4; f++) {
      createCharacterTexture(scene, `${prefix}_${dir}_walk${f}`, {
        ...options, facing: dir, isWalking: true, walkFrame: f
      });
    }
  });
}

/* ─────────────────────────────────────────────────────────
   Draw a stylized isometric desk graphic to canvas
   ───────────────────────────────────────────────────────── */
function createDeskTexture(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 60; canvas.height = 40;
  const ctx = canvas.getContext('2d');

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(8, 22, 44, 14);

  // Professional desk top (dark slate)
  ctx.fillStyle = '#334155';
  ctx.fillRect(5, 15, 50, 12);

  // Monitor silhouette
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 5, 20, 10);
  ctx.fillRect(28, 15, 4, 2);

  if (scene.textures.exists('desk')) scene.textures.remove('desk');
  scene.textures.addCanvas('desk', canvas);
}

/* ═══════════════════════════════════════════════════════════
   OfficeScene — Main game scene
   ═══════════════════════════════════════════════════════════ */
class OfficeScene extends Phaser.Scene {
  constructor() { super('office'); }

  init() {
    this.username = localStorage.getItem('cg_username') || 'Player';
    this.domain = localStorage.getItem('cg_domain') || 'cyber';
    this.level = 1;
    this.managerChances = 1;
    this.health = 100;
    this.correct = 0;
    this.total = 0;
    this.points = 0;
    this.levelCorrect = 0;
    this.scenariosCompleted = 0;
    this.scenarioRunning = false;
    this.timerInterval = null;
    this.scenariosUsed = new Set();
    this.npcIndex = 0;
    this.gameActive = false;
    this.walkInstructionShown = false;
    this.playerFacing = 'up';
    this.playerWalkFrame = 0;
    this.playerWalkTimer = 0;
    this.playerIsSitting = true;
    this.lastPlayerMoveTime = 0;
    this.lastHealthDrainTime = 0;
    this.idleHealthDropCount = 0;

    // Fetch scenarios from backend to include approved ones
    this.fetchExternalScenarios();
  }

  async fetchExternalScenarios() {
    try {
      const resp = await fetch(`${API_BASE}/api/scenarios/sequence`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.scenarios || !data.scenarios.length) return;

      console.log(`Fetched ${data.scenarios.length} published scenarios from backend.`);

      data.scenarios.forEach(s => {
        const domain = s.domain || 'cyber';
        if (!SCENARIOS[domain]) SCENARIOS[domain] = [];

        // Merge: avoid duplicates if ID already exists
        const exists = SCENARIOS[domain].find(existing => existing.id === s.id);
        if (!exists) {
          SCENARIOS[domain].push(s);
        }
      });
    } catch (e) {
      console.warn("Failed to fetch external scenarios:", e);
    }
  }

  /* Helper to check if any blocking UI is active */
  isPaused() {
    const chatOverlay = document.getElementById('chatOverlay');
    const chatActive = chatOverlay && chatOverlay.classList.contains('show');
    return !this.gameActive || this.scenarioRunning || chatActive;
  }

  preload() {
    this.load.image('office_bg', 'assets/Gemini_Generated_Image_uw4itquw4itquw4i.png');
  }

  create() {
    // ── Game world dimensions (match aspect ratio of background) ──
    this.mapW = this.scale.width;
    this.mapH = this.scale.height;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);

    // Background — fill entire game canvas
    const bg = this.add.image(0, 0, 'office_bg').setOrigin(0, 0);
    bg.setDisplaySize(this.mapW, this.mapH);
    bg.setDepth(0);

    // ── Generate character textures ──
    // Player — blue shirt
    generateCharacterSprites(this, 'player', {
      shirtColor: '#3B82F6', pantsColor: '#1E293B',
      skinColor: '#D4A574', hairColor: '#3D2B1F'
    });

    // NPC variants — different colors
    const npcStyles = [
      { shirtColor: '#A855F7', pantsColor: '#1E293B', skinColor: '#C68642', hairColor: '#1a1a1a' },
      { shirtColor: '#EF4444', pantsColor: '#374151', skinColor: '#D4A574', hairColor: '#4a3728' },
      { shirtColor: '#10B981', pantsColor: '#1F2937', skinColor: '#F0C8A0', hairColor: '#2d1b0e' },
      { shirtColor: '#F59E0B', pantsColor: '#1E293B', skinColor: '#C68642', hairColor: '#1a1a1a' },
      { shirtColor: '#EC4899', pantsColor: '#374151', skinColor: '#D4A574', hairColor: '#3D2B1F' },
      { shirtColor: '#06B6D4', pantsColor: '#1F2937', skinColor: '#F0C8A0', hairColor: '#4a3728' },
    ];
    npcStyles.forEach((style, i) => {
      generateCharacterSprites(this, `npc${i}`, style);
    });

    // ── Collision walls ──
    this.wallGroup = this.physics.add.staticGroup();
    // Outer boundary
    this.addWall(0, 0, this.mapW, 16);
    this.addWall(0, this.mapH - 16, this.mapW, 16);
    this.addWall(0, 0, 16, this.mapH);
    this.addWall(this.mapW - 16, 0, 16, this.mapH);
    // Scale collision zones to match current game dimensions
    const sx = this.mapW / 1600;
    const sy = this.mapH / 1000;

    // Create desks and NPCs
    this.deskGroup = this.physics.add.staticGroup();
    createDeskTexture(this);
    this.npcList = [];

    DESK_POSITIONS.forEach((desk, i) => {
      const dx = desk.fx * this.mapW;
      const dy = desk.fy * this.mapH;

      const d = this.deskGroup.create(dx, dy + 10, 'desk');
      d.setDepth(5 + (dy / this.mapH) * 10);
      d.setVisible(false); // Background already includes desks
      d.body.setSize(60, 30); d.body.setOffset(0, 10);

      const styleIdx = i % 6;
      const npc = this.physics.add.sprite(dx, dy - 5, `npc${styleIdx}_${desk.dir}_stand`);
      npc.setCollideWorldBounds(true);
      npc.body.setSize(18, 10);
      npc.body.setOffset(5, 34);
      npc.setImmovable(true);
      npc.setDepth(d.depth - 0.1);
      npc.setScale(1.1); // 10% bigger

      npc.npcName = NPC_NAMES[i];
      npc.npcStyleIdx = styleIdx;
      npc.homeX = dx;
      npc.homeY = dy - 5;
      npc.homeDir = desk.dir;
      npc.isSitting = true;

      const label = this.add.text(npc.x, npc.y - 28, npc.npcName, {
        font: '600 9px Outfit, Inter, Arial', fill: '#c084fc',
        backgroundColor: 'rgba(8,14,26,0.85)', padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      label.setDepth(npc.depth + 1);
      npc.label = label;

      this.npcList.push(npc);
    });

    // ── Manager NPC ──
    const mx = MANAGER_POS.fx * this.mapW;
    const my = MANAGER_POS.fy * this.mapH;
    this.manager = this.physics.add.sprite(mx, my, 'npc5_down_stand'); // Using npc5 style for manager
    this.manager.npcName = 'Manager (Mr. Singh)';
    this.manager.setDepth(5 + (my / this.mapH) * 10);
    this.manager.npcStyleIdx = 5;
    this.manager.setScale(1.1); // 10% bigger
    this.manager.body.setSize(18, 10);
    this.manager.body.setOffset(5, 34);
    this.manager.setImmovable(true);

    this.managerLabel = this.add.text(mx, my - 28, this.manager.npcName, {
      font: '700 9px Outfit, Inter, Arial', fill: '#fbbf24',
      backgroundColor: 'rgba(8,14,26,0.85)', padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(this.manager.depth + 1);

    // ── Player ──
    // Start at your own home desk!
    const startX = PLAYER_HOME.fx * this.mapW;
    const startY = PLAYER_HOME.fy * this.mapH;
    this.player = this.physics.add.sprite(startX, startY, 'player_up_stand');
    this.player.setScale(1.1); // 10% bigger
    this.player.setCollideWorldBounds(true);
    // Physics body at feet for better isometric sorting/collision
    // Widened from (18,10) → (22,14) so character edges reliably catch wall zones
    this.player.body.setSize(22, 14);
    this.player.body.setOffset(3, 30);
    this.player.setDepth(5 + (startY / this.mapH) * 10 - 0.5);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.removeCapture('SPACE');
    this.wasd = this.input.keyboard.addKeys({
      w: 'W', a: 'A', s: 'S', d: 'D',
      f: 'F' // Added F just in case
    });

    // ── Collision Walls ──────────────────────────────────────────────────────
    // Each zone is padded slightly (+5–10%) beyond the visual furniture edges
    // so the character foot-box reliably collides before visually overlapping.

    // Block Top strip (upper wall / cafeteria tables row)
    this.addWall(0, 0, this.mapW, this.mapH * 0.20);

    // ── Top Row Desk Islands ─────────────────────────────────────────────────
    // Left island (desk cluster around x≈0.28, y≈0.36)
    this.addWall(this.mapW * 0.22, this.mapH * 0.24, this.mapW * 0.20, this.mapH * 0.15);
    // Right island (desk cluster around x≈0.65, y≈0.36)
    this.addWall(this.mapW * 0.55, this.mapH * 0.24, this.mapW * 0.20, this.mapH * 0.15);

    // ── Middle Row Desk Islands ──────────────────────────────────────────────
    // Left island (around x≈0.22, y≈0.54)
    this.addWall(this.mapW * 0.14, this.mapH * 0.46, this.mapW * 0.24, this.mapH * 0.16);
    // Right island (around x≈0.65, y≈0.54)
    this.addWall(this.mapW * 0.57, this.mapH * 0.46, this.mapW * 0.24, this.mapH * 0.16);

    // ── Bottom Row Desk Islands ──────────────────────────────────────────────
    // Left island (around x≈0.22, y≈0.76)
    this.addWall(this.mapW * 0.14, this.mapH * 0.72, this.mapW * 0.24, this.mapH * 0.16);
    // Right island (around x≈0.65, y≈0.76)
    this.addWall(this.mapW * 0.57, this.mapH * 0.72, this.mapW * 0.24, this.mapH * 0.16);

    // Right Sidebar (shelf / fridge column)
    this.addWall(this.mapW * 0.87, 0, this.mapW * 0.13, this.mapH * 0.45);

    // Collision
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.deskGroup);
    this.physics.add.collider(this.player, this.npcList);
    this.physics.add.collider(this.player, this.manager);

    // Player name label
    this.playerLabel = this.add.text(this.player.x, this.player.y - 28, this.username, {
      font: '700 10px Outfit, Inter, Arial', fill: '#38bdf8',
      backgroundColor: 'rgba(8,14,26,0.85)', padding: { x: 5, y: 2 }
    }).setOrigin(0.5);

    // Scale factors stored for later use
    this.sx = sx;
    this.sy = sy;

    // HUD
    this.updateHUD();
    this.lastStepTime = 0;
    this.lastDustTime = 0;

    // Removed background random collectibles

    // ESC to Quit Game
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.gameActive && this.health > 0) {
        this.gameActive = false; // Disable game interactions
        this.player.body.setVelocity(0, 0);
        this._setPlayerTexture('stand');

        const modal = document.createElement('div');
        modal.className = 'game-overlay show';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
          <div class="overlay-card" style="max-width:400px; text-align:center;">
            <h2 style="color:var(--danger); margin-bottom:16px;">Logout?</h2>
            <p style="margin-bottom:24px; color:var(--text-dim);">Are you sure you want to log out for the day?</p>
            <div style="display:flex; gap:12px;">
              <button class="replay-btn" id="confirmLogoutBtn" style="flex:1;">Yes, Logout</button>
              <button class="replay-btn" id="cancelLogoutBtn" style="flex:1; background:rgba(255,255,255,0.1);">Cancel</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmLogoutBtn').onclick = () => {
          modal.remove();
          this.gameActive = false;

          // Stop sounds
          window.soundEngine.stopAmbient();

          // Close any open scenario modal or chat overlay
          const scenarioModal = document.getElementById('scenarioModal');
          if (scenarioModal) {
            scenarioModal.classList.remove('show', 'split-view');
            scenarioModal.style.visibility = '';
          }
          const chatOverlay = document.getElementById('chatOverlay');
          if (chatOverlay) {
            chatOverlay.classList.remove('show');
            document.body.classList.remove('chat-active');
          }
          // Reset chat input for next session
          const chatInput = document.getElementById('chatInput');
          const chatSendBtn = document.getElementById('chatSendBtn');
          if (chatInput) { chatInput.disabled = false; chatInput.value = ''; }
          if (chatSendBtn) chatSendBtn.disabled = false;

          // Clean up this game scene
          this.scene.stop();
          document.getElementById('hud').classList.remove('visible');
          document.getElementById('gameVignette').classList.remove('visible');

          // Check if name is already set
          const nameInput = document.getElementById('username');
          if (localStorage.getItem('cg_username')) {
            nameInput.value = localStorage.getItem('cg_username');
            // Hide the name field completely or just leave it pre-filled? We will leave it pre-filled, but hide the field entirely for returning session
            nameInput.parentElement.style.display = 'none';
          }

          // Show login overlay again
          document.getElementById('loginOverlay').classList.remove('hidden');
        };

        document.getElementById('cancelLogoutBtn').onclick = () => {
          modal.remove();
          this.gameActive = true;
          this.lastPlayerMoveTime = this.time.now; // Reset inactivity timer
        };
      }
    });

    // ── Generate Boosters ──
    this.boosterGroup = this.add.group();

    // Fixed table positions based on the provided background image (approximate relative coordinates)
    const boosterPositions = [
      { fx: 0.29, fy: 0.45 }, // Left round table
      { fx: 0.67, fy: 0.45 }, // Right round table
      { fx: 0.85, fy: 0.70 }, // Some other side area near plant
    ];

    boosterPositions.forEach((pos) => {
      const icons = ['☕', '🍩', '🥤'];
      const icon = icons[Math.floor(Math.random() * icons.length)];
      const bX = pos.fx * this.mapW;
      const bY = pos.fy * this.mapH;

      // Render booster over tables
      const b = this.add.text(bX, bY, icon, { fontSize: '20px' }).setOrigin(0.5).setDepth(4 + (bY / this.mapH) * 10);
      this.tweens.add({ targets: b, y: b.y - 4, yoyo: true, repeat: -1, duration: 800 });
      this.boosterGroup.add(b);
    });

    // Wait for user to click Start
    this._waitForStart();

    // Spawn exploration tips
    this._spawnExplorationTips();
  }

  _waitForStart() {
    if (window.gameStarted) {
      this.username = localStorage.getItem('cg_username') || 'Player';
      this.domain = localStorage.getItem('cg_domain') || 'cyber';
      if (this.playerLabel) this.playerLabel.setText(this.username);
      this.updateHUD();

      // Show intro story prompt
      this._showIntroStory().then(() => {
        this.gameActive = true;
        this._showWalkInstruction();
        this.time.addEvent({ delay: 3500, callback: () => this.triggerNextScenario(), loop: false });
      });
    } else {
      this.time.addEvent({ delay: 200, callback: () => this._waitForStart(), loop: false });
    }
  }

  _showWalkInstruction() {
    if (this.walkInstructionShown) return;
    this.walkInstructionShown = true;
    const tip = document.createElement('div');
    tip.className = 'walk-instruction';
    tip.innerHTML = `
      <div class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
      <span>or Arrow keys to freely move around the office</span>
    `;
    document.body.appendChild(tip);
    setTimeout(() => {
      tip.style.transition = 'opacity .5s, transform .5s';
      tip.style.opacity = '0';
      tip.style.transform = 'translate(-50%, 20px)';
      setTimeout(() => tip.remove(), 600);
    }, 6000);
  }

  /* ── Intro Story ───────────────────────────────────────── */
  _showIntroStory() {
    return new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'game-overlay show';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '9999';
      modal.style.flexDirection = 'column';
      modal.style.gap = '24px';
      modal.style.transition = 'opacity 1s ease';

      const logo = document.createElement('div');
      logo.style.cssText = 'font-size:3.5rem; font-weight:800; letter-spacing:-.03em; text-align:center; opacity:0; transform:translateY(20px); transition: opacity 0.8s ease, transform 0.8s ease;';
      logo.innerHTML = '<span style="background:linear-gradient(135deg,#38bdf8,#818cf8,#f472b6);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">Gemini Solutions</span>';

      const subtitle = document.createElement('p');
      subtitle.style.cssText = 'font-size:1.1rem; color:rgba(226,232,240,0.6); text-align:center; opacity:0; transform:translateY(10px); transition: opacity 0.8s 0.4s ease, transform 0.8s 0.4s ease;';
      subtitle.textContent = 'Compliance Quest — Professional Training';

      const welcome = document.createElement('div');
      welcome.style.cssText = 'max-width:500px; text-align:center; opacity:0; transform:translateY(10px); transition: opacity 0.8s 0.8s ease, transform 0.8s 0.8s ease;';
      welcome.innerHTML = `<p style="font-size:1.05rem; line-height:1.7; color:var(--text-dim);">Hi <strong style="color:var(--accent)">${this.username}</strong>, you are a compliance officer for <strong style="color:#818cf8">Gemini Solutions</strong> and you are helping people in your office solve difficult problems related to compliance.</p>`;

      modal.appendChild(logo);
      modal.appendChild(subtitle);
      modal.appendChild(welcome);
      document.body.appendChild(modal);

      // Trigger fade-in
      requestAnimationFrame(() => {
        logo.style.opacity = '1';
        logo.style.transform = 'translateY(0)';
        subtitle.style.opacity = '1';
        subtitle.style.transform = 'translateY(0)';
        welcome.style.opacity = '1';
        welcome.style.transform = 'translateY(0)';
      });

      // Fade out after 5 seconds
      setTimeout(() => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 1000);
        resolve();
      }, 5000);
    });
  }

  addWall(x, y, w, h) {
    const wall = this.wallGroup.create(x + w / 2, y + h / 2, null);
    wall.setDisplaySize(w, h).refreshBody();
    wall.setVisible(false);
  }

  /* ── Update loop ─────────────────────────────────────── */
  update(time) {
    if (this.isPaused()) {
      this.player.setVelocity(0);
      this._setPlayerTexture('stand');
      this.lastPlayerMoveTime = time; // Prevent drain while paused
      return;
    }

    const speed = 130;
    let vx = 0, vy = 0, moving = false;

    // Check if any arrow/wasd/asdf keys are pressed to stand up
    const keysPressed = this.cursors.left.isDown || this.cursors.right.isDown ||
      this.cursors.up.isDown || this.cursors.down.isDown ||
      this.wasd.a.isDown || this.wasd.d.isDown ||
      this.wasd.w.isDown || this.wasd.s.isDown ||
      this.input.keyboard.addKey('F').isDown;

    if (keysPressed) {
      this.playerIsSitting = false;
    }

    if (!this.playerIsSitting) {
      if (this.cursors.left.isDown || this.wasd.a.isDown) {
        vx = -speed; this.playerFacing = 'left'; moving = true;
      }
      else if (this.cursors.right.isDown || this.wasd.d.isDown || this.wasd.f.isDown) {
        vx = speed; this.playerFacing = 'right'; moving = true;
      }

      if (this.cursors.up.isDown || this.wasd.w.isDown) {
        vy = -speed; if (!vx) this.playerFacing = 'up'; moving = true;
      }
      if (this.cursors.down.isDown || this.wasd.s.isDown) {
        vy = speed; if (!vx) this.playerFacing = 'down'; moving = true;
      }
    }

    // Normalize diagonal velocity so combined speed never exceeds `speed`
    // (without this, diagonal movement is ~41% faster and clips through walls)
    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT1_2; // 1/√2 ≈ 0.707
      vx *= norm;
      vy *= norm;
    }
    this.player.setVelocity(vx, vy);

    if (moving) {
      this.playerWalkTimer += 1;
      if (this.playerWalkTimer > 6) {
        this.playerWalkFrame = (this.playerWalkFrame + 1) % 4;
        this.playerWalkTimer = 0;
      }
      this._setPlayerTexture(`walk${this.playerWalkFrame}`);
      this.lastPlayerMoveTime = time; // Reset move timer
    } else {
      this._setPlayerTexture('stand');
      this.playerWalkFrame = 0;
      this.playerWalkTimer = 0;

      // Inactivity Health Drain logic
      if (!this.lastPlayerMoveTime) this.lastPlayerMoveTime = time;

      // Do not drain Health if a scenario is actively running!
      if (this.scenarioRunning) {
        this.lastPlayerMoveTime = time;
      }

      const idleDuration = time - this.lastPlayerMoveTime;
      if (idleDuration > 45000 && !this.scenarioRunning) {
        if (!this.lasthealthDrainTime || time - this.lasthealthDrainTime > 3000) {
          this.health = Math.max(0, this.health - 1);
          this.idlehealthDropCount = (this.idlehealthDropCount || 0) + 1;
          this.updateHUD();
          if (window.soundEngine.tick) window.soundEngine.tick();
          this.lasthealthDrainTime = time;

          if (this.idlehealthDropCount >= 5 && this.health > 0) {
            this.showFeedbackToast('⚠️ Stay active to maintain your professional standing!', false);
            this.idlehealthDropCount = 0;
          }

          if (this.health <= 0) {
            this.gameActive = false;
            this.triggerGameOver();
          }
        }
      }
    }

    // Check Boosters
    if (this.boosterGroup) {
      const children = this.boosterGroup.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        const b = children[i];
        if (b.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y) < 30) {
          const icon = b.text;
          b.setVisible(false);
          b.setActive(false);
          this.time.delayedCall(45000, () => {
            if (b && b.parentContainer !== null) { // Simple check to ensure it's still part of scene
              b.setVisible(true);
              b.setActive(true);
            }
          });
          this.health = Math.min(100, this.health + 5);
          this.updateHUD();
          if (window.soundEngine.levelUp) window.soundEngine.levelUp();
          this.showScorePopup(`+5% Health ${icon}`, '#34d399');
        }
      }
    }

    // Check Exploration Tips
    this._checkExplorationTips();

    // Y-depth sorting
    this.player.setDepth(5 + (this.player.y / this.mapH) * 10);

    // Name label
    if (this.playerLabel) {
      this.playerLabel.setPosition(this.player.x, this.player.y - 28);
      this.playerLabel.setDepth(this.player.depth + 1);
    }

    // Footstep sounds
    if ((vx || vy) && time - this.lastStepTime > 400) {
      window.soundEngine.tick();
      this.lastStepTime = time;
    }

    // Dust particles
    if ((vx || vy) && time - this.lastDustTime > 250) {
      this.spawnDust(this.player.x, this.player.y + 16);
      this.lastDustTime = time;
    }
  }

  _setPlayerTexture(anim) {
    const key = `player_${this.playerFacing}_${anim}`;
    if (this.textures.exists(key) && this.player.texture.key !== key) {
      this.player.setTexture(key);
    }
  }

  spawnDust(x, y) {
    for (let i = 0; i < 2; i++) {
      const p = this.add.circle(
        x + Phaser.Math.Between(-4, 4), y,
        Phaser.Math.Between(1, 2), 0xaaaaaa
      ).setAlpha(0.3).setDepth(this.player.depth - 1);
      this.tweens.add({
        targets: p,
        y: y - Phaser.Math.Between(4, 10),
        alpha: 0, scale: 0.3,
        duration: Phaser.Math.Between(250, 400),
        ease: 'Power1',
        onComplete: () => p.destroy()
      });
    }
  }

  /* ── HUD ─────────────────────────────────────────────── */
  updateHUD() {
    document.getElementById('hudUser').textContent = this.username;
    document.getElementById('hudDomain').textContent = this.domain.toUpperCase();
    document.getElementById('hudLevel').textContent = `LVL ${this.level}`;
    document.getElementById('hudProgress').textContent = `${this.levelCorrect}/${SCENARIOS_PER_LEVEL}`;
    document.getElementById('hudScore').textContent = `${this.points} pts`;
    const heartsEl = document.getElementById('hudHearts');
    heartsEl.innerHTML = '';

    // Convert 0-100 health to 3 "Health Units" (Hearts)
    const heartsCount = Math.ceil(this.health / 33.34);
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('div');
      heart.className = 'hud-heart' + (i >= heartsCount ? ' lost' : '');
      heart.innerHTML = `<svg viewBox="0 0 24 24" fill="#f87171" style="width:20px; height:20px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      heartsEl.appendChild(heart);
    }

    // Update Health text to show %
    const HealthText = document.getElementById('hudHealthText');
    if (HealthText) {
      HealthText.textContent = `${this.health}%`;
    }

    // Update Manager Chances
    const chancesEl = document.getElementById('hudManagerChances');
    if (chancesEl) {
      chancesEl.textContent = `${this.managerChances}/1`;
      chancesEl.style.color = this.managerChances > 0 ? 'var(--pink)' : 'var(--danger)';
    }
  }

  pulseHeart() {
    const hearts = document.querySelectorAll('.hud-heart:not(.lost)');
    if (hearts.length) {
      const last = hearts[hearts.length - 1];
      last.classList.add('pulse');
      setTimeout(() => last.classList.remove('pulse'), 500);
    }
  }

  showScorePopup(text, color) {
    const el = document.createElement('div');
    el.className = 'score-popup';
    el.textContent = text;
    el.style.color = color;
    el.style.left = '50%'; el.style.top = '40%';
    el.style.transform = 'translateX(-50%)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  showFeedbackToast(text, isCorrect) {
    const el = document.createElement('div');
    el.className = 'feedback-toast';
    el.textContent = text;
    el.style.background = isCorrect ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)';
    el.style.border = `1px solid ${isCorrect ? 'rgba(52,211,153,.3)' : 'rgba(248,113,113,.3)'}`;
    el.style.color = isCorrect ? '#34d399' : '#f87171';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  requestManagerHelp() {
    const chatOverlay = document.getElementById('chatOverlay');
    const scenarioModal = document.getElementById('scenarioModal');

    // In case of special scenarios like Cyber Attack, consultation is free
    const isSpecial = this.currentScenario && (this.currentScenario.id === 'surprise_attack' || this.currentScenario.isSpecial);

    if (!isSpecial) {
      if (this.managerChances <= 0) {
        this.showFeedbackToast('No manager consultation chances left!', false);
        return;
      }
      // Deduct the help chance
      this.managerChances--;
      this.updateHUD();
    } else {
      this.showFeedbackToast('⚠️ Emergency Situation: Manager consultation is now UNLIMITED!', true);
    }

    // Reset chat input state (may be disabled from prior use this session)
    const chatInputEl = document.getElementById('chatInput');
    const chatSendBtnEl = document.getElementById('chatSendBtn');
    if (chatInputEl) { chatInputEl.disabled = false; chatInputEl.value = ''; }
    if (chatSendBtnEl) chatSendBtnEl.disabled = false;

    // Reset messages to default greeting
    const chatMessagesEl = document.getElementById('chatMessages');
    if (chatMessagesEl) {
      chatMessagesEl.innerHTML = '<div class="chat-msg ai">Hello! I\'m Mr. Singh, your manager. Need help solving a compliance problem? Ask me anything!</div>';
    }

    chatOverlay.classList.add('show');
    document.body.classList.add('chat-active');
    if (scenarioModal) scenarioModal.classList.add('split-view');
    if (chatInputEl) chatInputEl.focus();
  }

  /* ── Trigger next question from a seated NPC ──────── */
  async triggerNextScenario() {
    if (this.health <= 0 || !this.gameActive) return;

    // If chat is open or another scenario is running, delay the next trigger
    if (this.isPaused()) {
      this.time.addEvent({ delay: 3000, callback: () => this.triggerNextScenario(), loop: false });
      return;
    }

    // Find an idle npc
    const idleNpcs = this.npcList.filter(n => n.isSitting);
    if (idleNpcs.length === 0) return;

    const npc = idleNpcs[Math.floor(Math.random() * idleNpcs.length)];
    npc.isSitting = false;

    // ── Thinking Sequence ──
    const showThought = (txt, dur) => {
      const bg = this.add.graphics();
      const t = this.add.text(npc.x, npc.y - 40, txt, {
        font: '600 10px Inter, Arial', fill: '#fff',
        backgroundColor: 'rgba(30,41,59,0.9)', padding: { x: 6, y: 4 }
      }).setOrigin(0.5).setDepth(100);
      return { bg, t, dur };
    };

    const thoughts1 = ["Hmm... who should I ask...?", "I need a second opinion...", "This looks fishy...", "Wait, is this normal?"];
    const t1Msg = thoughts1[Math.floor(Math.random() * thoughts1.length)];
    const t1 = showThought(t1Msg, 3000);
    await this.delay(t1.dur);
    t1.t.destroy();

    const thoughts2 = [`Aha! ${this.username} is very knowledgeable!`, `I'll ask ${this.username}!`, `Let's see what ${this.username} says.`];
    const t2Msg = thoughts2[Math.floor(Math.random() * thoughts2.length)];
    const t2 = showThought(t2Msg, 2000);
    await this.delay(t2.dur);
    t2.t.destroy();

    // Stay seated facing original direction
    this._setNpcTexture(npc, npc.homeDir, 'stand');
    await this.delay(300);

    // Call out user's name
    this._showWorldBubble(npc, `Hey ${this.username}! I have a question! Can you come over here?`);
    if (window.soundEngine.pop) window.soundEngine.pop();

    // Spawn Heart above NPC (hidden initially)
    npc.heartItem = this.add.text(npc.x, npc.y - 65, '❤️', { fontSize: '24px' }).setOrigin(0.5).setDepth(150);
    npc.heartItem.setVisible(false);
    this.tweens.add({ targets: npc.heartItem, y: npc.heartItem.y - 10, yoyo: true, repeat: -1, duration: 600 });

    this._waitForPlayer(npc, () => {
      // Grant Shield
      if (npc.heartItem) {
        npc.heartItem.destroy();
        npc.heartItem = null;
      }
      this.health = Math.min(this.health + 10, 100);
      this.updateHUD();
      if (window.soundEngine && window.soundEngine.click) window.soundEngine.click();
      this.showScorePopup('+10% Health ❤️', '#34d399');

      this.handleNpcArrival(npc);
    });
  }

  _waitForPlayer(npc, onComplete) {
    if (this.health <= 0 || !this.gameActive) {
      if (npc.heartItem) npc.heartItem.destroy();
      this._setNpcTexture(npc, npc.homeDir, 'stand');
      return;
    }

    if (this.isPaused()) {
      this.time.delayedCall(500, () => this._waitForPlayer(npc, onComplete));
      return;
    }

    // Check distance
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, this.player.x, this.player.y);

    // Requirement 11: shield visible only when close (within 150px)
    if (npc.heartItem) {
      npc.heartItem.setVisible(dist < 150);
    }

    // Interaction start distance (60px)
    if (dist <= 60) {
      if (onComplete) onComplete();
      return;
    }

    // Requirement 4: NPC should 'follow' or move towards player if they are calling
    // If player is within 250px but > 60px, NPC slowly walks towards player
    if (dist < 250 && dist > 70 && !npc.isWalking) {
      npc.isWalking = true;
      const targetX = this.player.x + (this.player.x > npc.x ? -40 : 40);
      const targetY = this.player.y + (this.player.y > npc.y ? -40 : 40);

      this._walkNpcTo(npc, targetX, targetY, dist * 10, () => {
        npc.isWalking = false;
        // After walking, wait and check again
        this.time.delayedCall(150, () => this._waitForPlayer(npc, onComplete));
      });
      return; // Stop local timer while tween is running
    }

    // NPC stays in place, waiting...
    if (!npc.isWalking) {
      this._setNpcTexture(npc, npc.homeDir, 'stand');
      this.time.delayedCall(150, () => this._waitForPlayer(npc, onComplete));
    }
  }

  _setNpcTexture(npc, facing, anim) {
    const key = `npc${npc.npcStyleIdx}_${facing}_${anim}`;
    if (this.textures.exists(key) && npc.texture.key !== key) {
      npc.setTexture(key);
    }
  }

  _walkNpcTo(npc, tx, ty, duration, onComplete) {
    // Determine facing direction
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    let facing = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      facing = dx > 0 ? 'right' : 'left';
    } else {
      facing = dy > 0 ? 'down' : 'up';
    }

    // Walk animation
    let walkFrame = 0;
    const walkInterval = setInterval(() => {
      walkFrame = (walkFrame + 1) % 4;
      this._setNpcTexture(npc, facing, `walk${walkFrame}`);
    }, 150);

    this.tweens.add({
      targets: npc,
      x: tx, y: ty,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        npc.label.setPosition(npc.x, npc.y - 28);
        npc.setDepth(5 + (npc.y / this.mapH) * 10);
        npc.label.setDepth(npc.depth + 1);
      },
      onComplete: () => {
        clearInterval(walkInterval);
        this._setNpcTexture(npc, facing, 'stand');
        if (onComplete) onComplete();
      }
    });
  }

  /* ── NPC arrival ─────────────────────────────────────── */
  async handleNpcArrival(npc) {
    this.scenarioRunning = true;
    window.soundEngine.npcArrive();

    const greetings = [
      '💬 Hi, good morning how is life going on?',
      '💬 Hey there, hope you are having a good day!',
      '💬 Hello! How have you been?',
      '💬 Good to see you, how are things?',
      '💬 Do you have a second? I have something to ask.',
      '💬 Hey! You look like you know about this...',
      '💬 Glad I caught you, need some advice!',
      '💬 Excuse me, quick question if you don\'t mind?'
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    const bubbleBg = this.add.graphics().setDepth(50);
    const bubbleText = this.add.text(npc.x, npc.y - 46, greeting, {
      font: '600 10px Outfit, Inter, Arial', fill: '#e2e8f0'
    }).setOrigin(0.5).setDepth(51);

    const bx = bubbleText.x - bubbleText.width / 2 - 8;
    const by = bubbleText.y - bubbleText.height / 2 - 5;
    const bw = bubbleText.width + 16;
    const bh = bubbleText.height + 10;
    bubbleBg.fillStyle(0x1e293b, 0.92);
    bubbleBg.fillRoundedRect(bx, by, bw, bh, 6);
    bubbleBg.fillTriangle(npc.x - 3, by + bh, npc.x + 3, by + bh, npc.x, by + bh + 6);

    await this.delay(1800);
    bubbleText.destroy();
    bubbleBg.destroy();

    // Player auto-replies greeting (No manual typing required)
    const playerGreetings = ['Hi there!', 'Good morning!', 'Hello!', 'Hey! Doing good.'];
    const pGreeting = playerGreetings[Math.floor(Math.random() * playerGreetings.length)];
    this._showWorldBubble(this.player, pGreeting);
    if (window.soundEngine.pop) window.soundEngine.pop();
    await this.delay(1400);

    // Surprise Element Cyber Attack Check!
    if (this.scenariosCompleted > 0 && this.scenariosCompleted % 2 === 0) {
      this.triggerCyberAttack(npc);
      return;
    }

    const transitionPrompts = [
      "Hey, could you help me understand this?",
      "Do you have a moment to clarify something for me?",
      "Could you guide me on what to do next?",
      "I'm not sure about this can you help me?",
      "Can I ask you a quick question about this situation?",
      "Do you mind sharing your thoughts on this?",
      "Can you confirm on how do it the right way?"
    ];
    const transitionPrompt = transitionPrompts[Math.floor(Math.random() * transitionPrompts.length)];

    // Start Choice Sequence (Yes/No)
    const choice = await this.askChoice(npc, transitionPrompt, true);
    if (choice === 'no') {
      this.showFeedbackToast("NPC: Oh, okay. Maybe when you're less busy!", false);
    } else {
      let scenario = this.pickScenario();
      if (!scenario) {
        this.triggerVictory();
      } else if (scenario.type === 'email_inspect' && scenario.email_data) {
        await this.askEmailInspection(scenario, npc);
      } else if (scenario.type === 'branching' && scenario.branches) {
        await this.askBranchingScenario(scenario, npc);
      } else {
        await this.askConversationalScenario(scenario, npc);
      }
    }

    // NPC stays at desk, reset their state for next scenario pool
    this._setNpcTexture(npc, npc.homeDir, 'stand');
    npc.isSitting = true;
    if (this.health > 0) {
      this.time.addEvent({ delay: 5000, callback: () => this.triggerNextScenario(), loop: false });
    }
  }

  /* ── Ask simple Yes/No choice OR just generic input ──────── */
  askChoice(npc, question, checkNo = true) {
    return new Promise(resolve => {
      this.scenarioRunning = true;
      const modal = document.getElementById('scenarioModal');
      modal.innerHTML = '';
      modal.className = 'show';

      const cloud = document.createElement('div');
      cloud.className = 'thought-cloud';
      cloud.style.padding = '24px';

      const q = document.createElement('div');
      q.className = 'scenario-question';
      q.style.marginBottom = '20px';
      q.textContent = question;
      cloud.appendChild(q);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = checkNo ? 'Type "yes" or anything else...' : 'Type your reply...';
      input.style.width = '100%';
      input.style.padding = '12px';
      input.style.borderRadius = '8px';
      input.style.border = '1px solid var(--border)';
      input.style.background = 'rgba(255,255,255,0.05)';
      input.style.color = 'var(--text)';
      input.style.marginBottom = '12px';
      input.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') submitBtn.click();
      };
      input.onkeyup = (e) => e.stopPropagation();
      cloud.appendChild(input);

      const submitBtn = document.createElement('div');
      submitBtn.className = 'scenario-option';
      submitBtn.textContent = 'Submit';
      submitBtn.style.textAlign = 'center';
      submitBtn.onclick = () => {
        const val = input.value.trim().toLowerCase();
        modal.classList.remove('show');
        this.scenarioRunning = false;

        if (checkNo) {
          if (/\bno\b/i.test(val) || val === "n") {
            resolve('no');
          } else {
            resolve('yes');
          }
        } else {
          resolve('done');
        }
      };
      cloud.appendChild(submitBtn);
      modal.appendChild(cloud);
      input.focus();
    });
  }

  pickScenario() {
    const pool = (SCENARIOS[this.domain] || SCENARIOS.cyber).filter(
      s => s.level <= this.level && !this.scenariosUsed.has(s.id)
    );
    if (pool.length === 0) return null;
    const s = pool[Math.floor(Math.random() * pool.length)];
    this.scenariosUsed.add(s.id);
    return s;
  }

  /* ── Scenario — Story Modal ────────────────────────── */
  askScenario(s, npc) {
    this.currentScenario = s;
    return new Promise(resolve => {
      this.scenarioRunning = true;
      const modal = document.getElementById('scenarioModal');
      modal.innerHTML = '';
      modal.className = 'show';

      const cloud = document.createElement('div');
      cloud.className = 'thought-cloud';

      // Header
      const header = document.createElement('div');
      header.className = 'cloud-header';
      const avatar = document.createElement('div');
      avatar.className = 'cloud-avatar';
      avatar.textContent = '�';
      const speakerInfo = document.createElement('div');
      const speaker = document.createElement('div');
      speaker.className = 'cloud-speaker';
      speaker.textContent = `Incident Report: ${s.title}`;
      const speakerSub = document.createElement('div');
      speakerSub.className = 'cloud-speaker-sub';
      speakerSub.textContent = `LVL ${this.level} • Compliance Scenario`;
      speakerInfo.appendChild(speaker);
      speakerInfo.appendChild(speakerSub);
      header.appendChild(avatar);
      header.appendChild(speakerInfo);
      cloud.appendChild(header);

      // Timer bar
      const timerBar = document.createElement('div');
      timerBar.className = 'scenario-timer-bar';
      timerBar.style.width = '100%';
      cloud.appendChild(timerBar);

      let answered = false;
      // Dynamic time based on word count (approx 20wpm + 15s base)
      const storyText = s.story || "";
      const totalTime = TIMER_SECONDS + Math.ceil(storyText.split(' ').length * 0.4);
      let timeLeft = totalTime;

      const timerEl = document.getElementById('hudTimer');
      timerEl.textContent = `⏱ ${Math.round(timeLeft)}s`;

      // Story Display (Paragraph format)
      const storyBox = document.createElement('div');
      storyBox.className = 'scenario-dialogue';
      cloud.appendChild(storyBox);

      const renderStory = async () => {
        const p = document.createElement('div');
        p.className = 'dialogue-line';
        p.style.lineHeight = '1.8';
        p.style.fontSize = '1.1rem';
        p.innerHTML = `<strong style="color:var(--accent2)">${npc.npcName}:</strong> `;
        storyBox.appendChild(p);

        // Typewriter effect with click-to-skip
        let charIndex = 0;
        const typeSpeed = 25;
        let typewriterDone = false;

        // Click to skip typewriter
        storyBox.style.cursor = 'pointer';
        storyBox.onclick = () => {
          if (!typewriterDone && !answered) {
            p.innerHTML = `<strong style="color:var(--accent2)">${npc.npcName}:</strong> ${storyText}`;
            charIndex = storyText.length;
            typewriterDone = true;
            showChoices();
          }
        };

        const typeChar = () => {
          if (answered || typewriterDone) return;
          if (charIndex < storyText.length) {
            p.textContent += storyText.charAt(charIndex);
            charIndex++;
            storyBox.scrollTop = storyBox.scrollHeight;
            setTimeout(typeChar, typeSpeed);
          } else {
            typewriterDone = true;
            showChoices();
          }
        };

        const showChoices = () => {
          if (answered) return;

          this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
              if (answered || this.isPaused()) return;
              timeLeft--;
              timerEl.textContent = `⏱ ${Math.max(0, Math.round(timeLeft))}s`;
              timerBar.style.width = `${(timeLeft / totalTime) * 100}%`;

              if (timeLeft <= 5) {
                timerBar.style.background = 'linear-gradient(90deg, var(--danger), var(--gold))';
                window.soundEngine.tick();
              }
              if (timeLeft <= 0) {
                answered = true;
                if (this.timerEvent) this.timerEvent.destroy();
                this.handleAnswer(false, null, s, modal, timerEl, resolve);
              }
            },
            loop: true
          });

          // Question
          const q = document.createElement('div');
          q.className = 'scenario-question';
          q.style.marginTop = '24px';
          q.style.borderTop = '1px solid rgba(255,255,255,0.1)';
          q.style.paddingTop = '16px';
          q.innerHTML = `<strong style="color:var(--accent)">${this.username}:</strong> <em>(Thinking: ${s.question})</em>`;
          cloud.appendChild(q);

          // Options Grid
          const optionsBox = document.createElement('div');
          optionsBox.className = 'scenario-options-grid';
          optionsBox.style.display = 'grid';
          optionsBox.style.gridTemplateColumns = '1fr';
          optionsBox.style.gap = '8px';

          s.options.forEach((opt, idx) => {
            const d = document.createElement('div');
            d.className = 'scenario-option';
            d.setAttribute('data-letter', OPTION_LETTERS[idx] || '•');
            d.innerHTML = `<span>${opt}</span>`;
            d.onclick = () => {
              if (answered) return;
              answered = true;
              if (this.timerEvent) this.timerEvent.destroy();
              const isCorrect = idx === s.correct_index;
              d.classList.add(isCorrect ? 'correct-flash' : 'wrong-flash');
              if (!isCorrect) {
                const correct = optionsBox.children[s.correct_index];
                if (correct) correct.classList.add('correct-flash');
              }
              setTimeout(() => this.handleAnswer(isCorrect, idx, s, modal, timerEl, resolve), 800);
            };
            optionsBox.appendChild(d);
          });

          // Manager Choice
          const managerBtn = document.createElement('div');
          managerBtn.className = 'scenario-option';
          managerBtn.style.border = '1.5px solid var(--gold)';
          managerBtn.style.marginTop = '12px';
          managerBtn.innerHTML = `<span style="color: var(--gold); font-weight: 700;">👨‍💼 Need help? Consult Mr. Singh (Manager)</span>`;
          managerBtn.onclick = () => {
            if (answered) return;
            this.requestManagerHelp();
          };
          optionsBox.appendChild(managerBtn);
          cloud.appendChild(optionsBox);
        };
        typeChar();
      };
      renderStory();
      modal.appendChild(cloud);
    });
  }

  /* ── Consult Manager Sequence ───────────────────────── */
  async consultManager(scenario, originNpc, resolveScenario) {
    if (scenario.managerUnavailable) {
      this._showWorldBubble(this.player, "Wait... I tried calling Mr. Singh, but his phone is unreachable. I'll have to decide myself!");
      await this.delay(3500);
      return this.askScenario(scenario, originNpc).then(resolveScenario);
    }
    this.scenarioRunning = true; // Block manual input

    // 1. Walk to central corridor
    const centralX = this.mapW * 0.5;
    const managerTargetX = centralX + 30; // Stand beside manager
    const managerTargetY = this.manager.y;

    this._showWorldBubble(this.player, "Wait... I should double check this with Mr. Singh.");
    await this.delay(3000); // Slower

    // Cartoonic boing sound
    if (window.soundEngine.boing) window.soundEngine.boing();

    // Walk Player to Manager - Duration increased (8x instead of 6x)
    const dx1 = Math.abs(centralX - this.player.x);
    this._walkPlayerTo(centralX, this.player.y, dx1 * 10, () => {
      const dy1 = Math.abs(managerTargetY - this.player.y);
      this._walkPlayerTo(centralX, managerTargetY, dy1 * 10, () => {
        this._walkPlayerTo(managerTargetX, managerTargetY, 500, async () => {
          // 2. Conversation with Manager
          this._showWorldBubble(this.player, `Mr Singh, ${originNpc.npcName} asked me about ${scenario.title}. What should I do?`);
          await this.delay(4000);

          const correctOpt = scenario.options[scenario.correct_index];
          this._showWorldBubble(this.manager, `Ah, I see. In this situation, the best response is: ${correctOpt}. Compliance always comes first.`);
          await this.delay(6000); // Much slower

          this._showWorldBubble(this.player, "Understood. Thanks, Mr. Singh!");
          await this.delay(3000);

          // 3. Walk Back to origin NPC
          this._walkPlayerTo(centralX, managerTargetY, 500, () => {
            const dy2 = Math.abs(originNpc.y - this.player.y);
            this._walkPlayerTo(centralX, originNpc.y, dy2 * 10, () => {
              const finalX = originNpc.x + (originNpc.x > centralX ? -35 : 35);
              this._walkPlayerTo(finalX, originNpc.y, 500, () => {
                // Complete scenario automatically as "Correct" since manager helped
                this.handleAnswer(true, scenario.correct_index, scenario, document.getElementById('scenarioModal'), document.getElementById('hudTimer'), resolveScenario);
              });
            });
          });
        });
      });
    });
  }

  _showWorldBubble(target, text) {
    if (window.soundEngine.pop) window.soundEngine.pop();
    const bubble = this.add.text(target.x, target.y - 50, text, {
      font: '600 11px Inter, Arial', fill: '#fff',
      backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: { x: 12, y: 8 },
      wordWrap: { width: 180 }
    }).setOrigin(0.5).setDepth(200);
    this.time.addEvent({ delay: 3500, callback: () => bubble.destroy() });
  }

  _walkPlayerTo(tx, ty, duration, onComplete) {
    // Standard player movement logic
    const dx = tx - this.player.x;
    const dy = ty - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) this.playerFacing = dx > 0 ? 'right' : 'left';
    else this.playerFacing = dy > 0 ? 'down' : 'up';

    this.tweens.add({
      targets: this.player,
      x: tx, y: ty,
      duration: Math.max(100, duration),
      onUpdate: () => {
        this.playerWalkTimer++;
        if (this.playerWalkTimer > 6) {
          this.playerWalkFrame = (this.playerWalkFrame + 1) % 4;
          this.playerWalkTimer = 0;
        }
        this._setPlayerTexture(`walk${this.playerWalkFrame}`);
        if (this.playerLabel) this.playerLabel.setPosition(this.player.x, this.player.y - 28);
      },
      onComplete: () => {
        this._setPlayerTexture('stand');
        if (onComplete) onComplete();
      }
    });
  }

  async handleAnswer(isCorrect, selectedIdx, scenario, modal, timerEl, resolve, scoreAwarded = null) {
    this.total++;
    let pointsEarned = scoreAwarded !== null ? scoreAwarded : (isCorrect ? 100 : 0);
    this.points += pointsEarned;

    if (isCorrect) {
      this.correct++;
      this.levelCorrect++;
      this.scenariosCompleted++;
      window.soundEngine.correct();

      const txt = scoreAwarded !== null ? `+${scoreAwarded} pts` : '+1 ✓';
      this.showScorePopup(txt, '#34d399');
      this.showFeedbackToast('✅ Correct! Great compliance awareness.', true);
      this.spawnParticles(this.player.x, this.player.y, 0x34d399, 18);
    } else {
      this.health = Math.max(0, this.health - 34);
      window.soundEngine.wrong();

      const txt = scoreAwarded !== null ? `+${scoreAwarded} pts / −34% ❤️` : '−34% ❤️';
      this.showScorePopup(txt, '#f87171');
      this.showFeedbackToast('❌ I better do right or it might have consequences', false);

      this.cameras.main.shake(400, 0.015);
    }

    try {
      fetch(`${API_BASE}/api/submit-answer`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: this.username, domain: this.domain, scenarioId: scenario.id, selected: selectedIdx ?? -1, correct: isCorrect })
      }).catch(() => { });
    } catch (e) { }

    this.updateHUD();
    timerEl.textContent = '';

    modal.style.transition = 'transform .3s ease-in, opacity .3s ease-in';
    modal.style.transform = 'translate(-50%,-50%) scale(.9)';
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.classList.remove('show');
      modal.innerHTML = '';
      modal.style.transition = ''; modal.style.transform = ''; modal.style.opacity = '';
      this.scenarioRunning = false;
      // Ensure focus returns to game window for keyboard controls
      window.focus();
    }, 350);

    if (this.health <= 0) {
      this.time.addEvent({ delay: 600, callback: () => this.triggerGameOver(), loop: false });
      resolve(); return;
    }

    if (this.levelCorrect >= SCENARIOS_PER_LEVEL && this.level < MAX_LEVEL) {
      this.level++; this.levelCorrect = 0;
      this.managerChances = 1;
      window.soundEngine.levelUp();
      this.showScorePopup(`⬆️ LEVEL ${this.level}!`, '#fbbf24');
      this.cameras.main.flash(400, 56, 189, 248);
      this.spawnParticles(this.player.x, this.player.y, 0xfbbf24, 30);
      this.updateHUD();
    }

    const remaining = (SCENARIOS[this.domain] || SCENARIOS.cyber).filter(
      s => !this.scenariosUsed.has(s.id) && s.level <= this.level
    );
    if (remaining.length === 0 && this.level >= MAX_LEVEL) {
      this.time.addEvent({ delay: 600, callback: () => this.triggerVictory(), loop: false });
    }

    // Show consequence panel before concluding
    await this.showConsequencePanel(isCorrect, scenario);
    resolve();
  }

  async triggerCyberAttack(originNpc) {
    this.scenariosCompleted++; // Increment so we don't trigger it again immediately

    // Screenshake and alarm
    this.cameras.main.shake(1500, 0.015);
    window.soundEngine.wrong();
    window.soundEngine.gameOver(); // Play ominous sound

    // All NPCs panic
    this.npcList.forEach(n => {
      this._showWorldBubble(n, "Oh no! We are attacked by XYZ firm! Client data might be leaked!");
    });
    this._showWorldBubble(this.manager, "Everyone remain calm! Secure your workstations immediately!");

    await this.delay(4000);

    // Load special Surprise scenario
    let cyberScenario = {
      id: "surprise_attack",
      title: "🔥 GLOBAL CYBER ATTACK",
      story: "Red lights are flashing across the office. A rogue group known as XYZ firm is currently exfiltrating gigabytes of client data from the AstraNova live production database. The network is completely compromised and the malware is spreading rapidly.",
      question: "What is your immediate, primary action?",
      options: [
        "Unplug from the network / Isolate affected terminals",
        "Wait for IT to figure it out",
        "Reply to the attacker's email",
        "Pay the requested cryptocurrency ransom"
      ],
      correct_index: 0,
      level: this.level
    };

    await this.askScenario(cyberScenario, originNpc);

    // Ensure the NPC sits down after the special scenario
    originNpc.isSitting = true;
    this._setNpcTexture(originNpc, originNpc.homeDir, 'stand');
    if (this.health > 0) {
      this.time.addEvent({ delay: 5000, callback: () => this.triggerNextScenario(), loop: false });
    }
  }

  spawnParticles(x, y, color, count) {
    const colors = [color, 0x38bdf8, 0x818cf8, 0xf472b6, 0xfbbf24];
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), c).setDepth(60).setAlpha(0.9);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-80, 80),
        y: y + Phaser.Math.Between(-80, 80),
        alpha: 0, scale: 0,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }
  }

  triggerGameOver() {
    this.gameActive = false;
    window.soundEngine.gameOver();
    window.soundEngine.stopAmbient();
    localStorage.setItem('cg_last_score', `${this.points} pts`);

    document.getElementById('gameOverStats').innerHTML =
      `Domain: <strong>${this.domain.toUpperCase()}</strong><br>` +
      `Level reached: <strong>${this.level}</strong><br>` +
      `Health: <strong>${this.health}%</strong><br>` +
      `Points: <strong>${this.points}</strong><br>` +
      `Accuracy: <strong>${this.total ? Math.round(this.correct / this.total * 100) : 0}%</strong>`;
    document.getElementById('gameOverOverlay').classList.add('show');
  }

  triggerVictory() {
    window.soundEngine.victory();
    window.soundEngine.stopAmbient();
    localStorage.setItem('cg_last_score', `${this.points} pts`);

    document.getElementById('victoryStats').innerHTML =
      `Domain: <strong>${this.domain.toUpperCase()}</strong><br>` +
      `Levels completed: <strong>${MAX_LEVEL}</strong><br>` +
      `Total Points: <strong>${this.points}</strong><br>` +
      `Accuracy: <strong>${this.total ? Math.round(this.correct / this.total * 100) : 0}%</strong>`;
    document.getElementById('victoryOverlay').classList.add('show');
    this.startConfetti();
  }

  startConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const pieces = [];
    const colors = ['#38bdf8', '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf'];
    for (let i = 0; i < 180; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 4, h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2, vx: (Math.random() - 0.5) * 2.5,
        rot: Math.random() * 360, rv: (Math.random() - 0.5) * 10
      });
    }
    let frames = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frames++;
      if (frames < 300) requestAnimationFrame(draw);
      else canvas.style.display = 'none';
    };
    draw();
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /* ── AI Conversational Scenario (Hybrid MCQ + Free-text) ── */
  askConversationalScenario(s, npc) {
    this.currentScenario = s;
    return new Promise(resolve => {
      this.scenarioRunning = true;
      const modal = document.getElementById('scenarioModal');
      modal.innerHTML = '';
      modal.className = 'show';

      const cloud = document.createElement('div');
      cloud.className = 'thought-cloud';

      // Header
      const header = document.createElement('div');
      header.className = 'cloud-header';
      const avatar = document.createElement('div');
      avatar.className = 'cloud-avatar';
      avatar.textContent = '\ud83d\udcac';
      const speakerInfo = document.createElement('div');
      const speaker = document.createElement('div');
      speaker.className = 'cloud-speaker';
      speaker.textContent = `${s.title}`;
      const speakerSub = document.createElement('div');
      speakerSub.className = 'cloud-speaker-sub';
      speakerSub.textContent = `LVL ${this.level} \u2022 ${this.domain.toUpperCase()} Scenario`;
      speakerInfo.appendChild(speaker);
      speakerInfo.appendChild(speakerSub);
      header.appendChild(avatar);
      header.appendChild(speakerInfo);
      cloud.appendChild(header);

      // Timer
      const timerBar = document.createElement('div');
      timerBar.className = 'scenario-timer-bar';
      timerBar.style.width = '100%';
      cloud.appendChild(timerBar);

      let answered = false;
      const storyText = s.story || '';
      const totalTime = 30 + Math.ceil(storyText.split(' ').length * 0.4);
      let timeLeft = totalTime;
      const timerEl = document.getElementById('hudTimer');
      timerEl.textContent = `\u23f1 ${Math.round(timeLeft)}s`;

      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: () => {
          if (answered || this.isPaused()) return;
          timeLeft--;
          timerEl.textContent = `\u23f1 ${Math.max(0, Math.round(timeLeft))}s`;
          timerBar.style.width = `${(timeLeft / totalTime) * 100}%`;
          if (timeLeft <= 5) {
            timerBar.style.background = 'linear-gradient(90deg, var(--danger), var(--gold))';
            window.soundEngine.tick();
          }
          if (timeLeft <= 0) {
            answered = true;
            if (this.timerEvent) this.timerEvent.destroy();
            this.handleAnswer(false, null, s, modal, timerEl, resolve);
          }
        },
        loop: true
      });

      // Chat messages container
      const chatBox = document.createElement('div');
      chatBox.className = 'chat-messages';

      // NPC story message
      const storyMsg = document.createElement('div');
      storyMsg.className = 'chat-msg npc';
      storyMsg.innerHTML = `<span class="msg-sender">${npc.npcName}</span>${storyText}`;
      chatBox.appendChild(storyMsg);

      // Question
      const qMsg = document.createElement('div');
      qMsg.className = 'chat-msg npc';
      qMsg.innerHTML = `<span class="msg-sender">${npc.npcName}</span>${s.question}`;
      chatBox.appendChild(qMsg);
      cloud.appendChild(chatBox);

      // --- MCQ Options ---
      const optionsLabel = document.createElement('div');
      optionsLabel.style.cssText = 'font-size:0.8rem;color:var(--text-dim);margin:8px 0 6px;font-weight:600;';
      optionsLabel.textContent = '\ud83d\udc47 Quick answers:';
      cloud.appendChild(optionsLabel);

      const optionsBox = document.createElement('div');
      optionsBox.style.cssText = 'display:grid;grid-template-columns:1fr;gap:6px;';

      const correctAnswer = s.options[s.correct_index];
      let conversationHistory = [];
      let turnCount = 0;

      s.options.forEach((opt, idx) => {
        const d = document.createElement('div');
        d.className = 'scenario-option';
        d.setAttribute('data-letter', OPTION_LETTERS[idx] || '\u2022');
        d.innerHTML = `<span>${opt}</span>`;
        d.onclick = () => {
          if (answered) return;
          answered = true;
          if (this.timerEvent) this.timerEvent.destroy();
          const isCorrect = idx === s.correct_index;
          d.classList.add(isCorrect ? 'correct-flash' : 'wrong-flash');
          if (!isCorrect && optionsBox.children[s.correct_index]) {
            optionsBox.children[s.correct_index].classList.add('correct-flash');
          }
          window.soundEngine.click();
          setTimeout(() => this.handleAnswer(isCorrect, idx, s, modal, timerEl, resolve), 800);
        };
        optionsBox.appendChild(d);
      });
      cloud.appendChild(optionsBox);

      // --- Manager Choice ---
      const managerBtn = document.createElement('div');
      managerBtn.className = 'scenario-option';
      managerBtn.style.border = '1.5px solid var(--gold)';
      managerBtn.style.marginTop = '12px';
      managerBtn.innerHTML = `<span style="color: var(--gold); font-weight: 700;">👨‍💼 Need help? Consult Mr. Singh (Manager)</span>`;
      managerBtn.onclick = () => {
        if (answered) return;
        this.requestManagerHelp();
      };
      cloud.appendChild(managerBtn);

      // --- OR divider ---
      const orDiv = document.createElement('div');
      orDiv.className = 'or-divider';
      orDiv.textContent = 'or type your own answer';
      cloud.appendChild(orDiv);

      // --- Chat input ---
      const inputArea = document.createElement('div');
      inputArea.className = 'chat-input-area';
      const chatInput = document.createElement('input');
      chatInput.type = 'text';
      chatInput.placeholder = 'Type what you would do and press Enter...';

      let isSending = false;

      chatInput.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !isSending && !answered) {
          handleSend();
        }
      };
      chatInput.onkeyup = (e) => e.stopPropagation();

      inputArea.appendChild(chatInput);
      cloud.appendChild(inputArea);

      // --- Send handler ---
      const handleSend = async () => {
        const text = chatInput.value.trim();
        if (!text || answered || isSending) return;
        isSending = true;
        chatInput.disabled = true;
        turnCount++;

        // Show player message in chat
        const playerMsg = document.createElement('div');
        playerMsg.className = 'chat-msg player';
        playerMsg.innerHTML = `<span class="msg-sender">${this.username}</span>${text}`;
        chatBox.appendChild(playerMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
        chatInput.value = '';
        if (window.soundEngine.pop) window.soundEngine.pop();

        conversationHistory.push({ role: 'player', text: text });

        // Hide options after first typed response
        optionsBox.style.display = 'none';
        optionsLabel.style.display = 'none';
        orDiv.style.display = 'none';

        // Show thinking indicator
        const thinking = document.createElement('div');
        thinking.className = 'ai-thinking';
        thinking.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatBox.appendChild(thinking);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Call AI evaluate endpoint
        let evalResult;
        try {
          const resp = await fetch(`${API_BASE}/api/ai/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario_story: storyText,
              scenario_question: s.question,
              correct_answer: correctAnswer,
              player_response: text,
              options: s.options,
              domain: this.domain,
              npc_name: npc.npcName,
              conversation_history: conversationHistory
            })
          });
          evalResult = await resp.json();
        } catch (e) {
          // Fallback: keyword match
          const hasKeyword = correctAnswer.toLowerCase().split(' ').some(
            w => w.length > 3 && text.toLowerCase().includes(w)
          );
          evalResult = {
            score: hasKeyword ? 65 : 30,
            is_correct: hasKeyword,
            feedback: hasKeyword ? 'Good thinking!' : `The correct approach is: ${correctAnswer}`,
            npc_reaction: hasKeyword ? 'That sounds right to me!' : 'Hmm, I\'m not sure about that approach...',
            follow_up: hasKeyword ? null : 'What would you do specifically?'
          };
        }

        // Remove thinking indicator
        thinking.remove();

        // Combine AI reactions into a single message for better UX
        const combinedMessageText = evalResult.follow_up
          ? `${evalResult.npc_reaction || evalResult.feedback}<br><br><em>${evalResult.follow_up}</em>`
          : (evalResult.npc_reaction || evalResult.feedback);

        const reactionMsg = document.createElement('div');
        reactionMsg.className = 'chat-msg npc';
        reactionMsg.innerHTML = `<span class="msg-sender">${npc.npcName}</span>${combinedMessageText}`;
        chatBox.appendChild(reactionMsg);
        conversationHistory.push({ role: 'npc', text: combinedMessageText });
        chatBox.scrollTop = chatBox.scrollHeight;
        if (window.soundEngine.pop) window.soundEngine.pop();

        // If follow_up exists and we haven't exceeded 3 turns, continue conversation
        if (evalResult.follow_up && turnCount < 3 && evalResult.score < 75) {
          // Re-enable input for follow-up
          isSending = false;
          chatInput.disabled = false;
          chatInput.placeholder = 'Reply to ' + npc.npcName + '...';
          chatInput.focus();
          return;
        }

        // --- Show AI score ---
        answered = true;
        if (this.timerEvent) this.timerEvent.destroy();

        const scoreReveal = document.createElement('div');
        scoreReveal.className = 'ai-score-reveal';
        const scoreColor = evalResult.score >= 75 ? 'var(--success)' : evalResult.score >= 50 ? 'var(--gold)' : 'var(--danger)';
        scoreReveal.innerHTML = `
          <div class="ai-score-number" style="color:${scoreColor}">${evalResult.score}/100</div>
          <div class="ai-score-bar"><div class="ai-score-fill" style="width:0%"></div></div>
          <div style="color:var(--text-dim);font-size:0.85rem;margin-top:6px">${evalResult.feedback}</div>
        `;
        cloud.appendChild(scoreReveal);

        // Animate score bar
        setTimeout(() => {
          const fill = scoreReveal.querySelector('.ai-score-fill');
          if (fill) fill.style.width = `${evalResult.score}%`;
        }, 100);

        if (window.soundEngine.consequence) window.soundEngine.consequence();

        // Wait then resolve
        await this.delay(2500);
        const isCorrect = evalResult.score >= 50;
        this.handleAnswer(isCorrect, isCorrect ? s.correct_index : -1, s, modal, timerEl, resolve, evalResult.score);
      };

      modal.appendChild(cloud);
      chatInput.focus();
    });
  }

  /* ── Branching Dialogue Scenario ──────────────────────── */
  askBranchingScenario(s, npc) {
    this.currentScenario = s;
    return new Promise(resolve => {
      this.scenarioRunning = true;
      const modal = document.getElementById('scenarioModal');
      modal.innerHTML = '';
      modal.className = 'show';

      const cloud = document.createElement('div');
      cloud.className = 'thought-cloud';

      // Header
      const header = document.createElement('div');
      header.className = 'cloud-header';
      const avatar = document.createElement('div');
      avatar.className = 'cloud-avatar';
      avatar.textContent = '\ud83d\udcac';
      const speakerInfo = document.createElement('div');
      const speaker = document.createElement('div');
      speaker.className = 'cloud-speaker';
      speaker.textContent = `Branching Scenario: ${s.title}`;
      const speakerSub = document.createElement('div');
      speakerSub.className = 'cloud-speaker-sub';
      speakerSub.textContent = `LVL ${this.level} \u2022 Multi-Step Decision`;
      speakerInfo.appendChild(speaker);
      speakerInfo.appendChild(speakerSub);
      header.appendChild(avatar);
      header.appendChild(speakerInfo);
      cloud.appendChild(header);

      // Story
      const storyBox = document.createElement('div');
      storyBox.className = 'scenario-dialogue';
      const p = document.createElement('div');
      p.className = 'dialogue-line';
      p.style.lineHeight = '1.8';
      p.innerHTML = `<strong style="color:var(--accent2)">${npc.npcName}:</strong> ${s.story}`;
      storyBox.appendChild(p);
      cloud.appendChild(storyBox);

      // Question
      const q = document.createElement('div');
      q.className = 'scenario-question';
      q.style.marginTop = '16px';
      q.innerHTML = `<strong style="color:var(--accent)">${this.username}:</strong> <em>(${s.question})</em>`;
      cloud.appendChild(q);

      // First-level options
      const optionsBox = document.createElement('div');
      optionsBox.style.display = 'grid';
      optionsBox.style.gap = '8px';
      optionsBox.style.marginTop = '12px';

      let answered = false;
      s.options.forEach((opt, idx) => {
        const d = document.createElement('div');
        d.className = 'scenario-option';
        d.setAttribute('data-letter', OPTION_LETTERS[idx] || '\u2022');
        d.innerHTML = `<span>${opt}</span>`;
        d.onclick = () => {
          if (answered) return;
          answered = true;
          if (window.soundEngine.click) window.soundEngine.click();

          // Highlight selection
          d.classList.add(idx === s.correct_index ? 'correct-flash' : 'wrong-flash');

          // Check if this choice has a branch
          const branch = s.branches && s.branches[idx];
          if (branch) {
            // Show branch response
            setTimeout(() => {
              optionsBox.innerHTML = '';
              const resp = document.createElement('div');
              resp.className = 'branch-response';
              resp.textContent = branch.response;
              cloud.appendChild(resp);

              if (window.soundEngine.branchReveal) window.soundEngine.branchReveal();

              // Show follow-up choices
              const label = document.createElement('div');
              label.className = 'branch-followup-label';
              label.textContent = 'What do you do now?';
              cloud.appendChild(label);

              const followBox = document.createElement('div');
              followBox.style.display = 'grid';
              followBox.style.gap = '8px';
              let answered2 = false;

              branch.follow_up.forEach((fu, fi) => {
                const fb = document.createElement('div');
                fb.className = 'scenario-option';
                fb.setAttribute('data-letter', OPTION_LETTERS[fi] || '\u2022');
                fb.innerHTML = `<span>${fu}</span>`;
                fb.onclick = () => {
                  if (answered2) return;
                  answered2 = true;
                  const isCorrect = fi === branch.correct;
                  fb.classList.add(isCorrect ? 'correct-flash' : 'wrong-flash');
                  if (!isCorrect && followBox.children[branch.correct]) {
                    followBox.children[branch.correct].classList.add('correct-flash');
                  }
                  setTimeout(() => {
                    this.handleAnswer(isCorrect, fi, s, modal, document.getElementById('hudTimer'), resolve);
                  }, 800);
                };
                followBox.appendChild(fb);
              });
              cloud.appendChild(followBox);
            }, 800);
          } else {
            // No branch, evaluate directly
            const isCorrect = idx === s.correct_index;
            if (!isCorrect && optionsBox.children[s.correct_index]) {
              optionsBox.children[s.correct_index].classList.add('correct-flash');
            }
            setTimeout(() => {
              this.handleAnswer(isCorrect, idx, s, modal, document.getElementById('hudTimer'), resolve);
            }, 800);
          }
        };
        optionsBox.appendChild(d);
      });

      cloud.appendChild(optionsBox);

      // --- Manager Choice ---
      const managerBtn = document.createElement('div');
      managerBtn.className = 'scenario-option';
      managerBtn.style.border = '1.5px solid var(--gold)';
      managerBtn.style.marginTop = '12px';
      managerBtn.innerHTML = `<span style="color: var(--gold); font-weight: 700;">👨‍💼 Need help? Consult Mr. Singh (Manager)</span>`;
      managerBtn.onclick = () => {
        if (answered) return;
        this.requestManagerHelp();
      };
      cloud.appendChild(managerBtn);
      modal.appendChild(cloud);
    });
  }

  /* ── Email Inspection Mini-Game ───────────────────────── */
  askEmailInspection(s, npc) {
    this.currentScenario = s;
    return new Promise(resolve => {
      this.scenarioRunning = true;
      const modal = document.getElementById('scenarioModal');
      modal.innerHTML = '';
      modal.className = 'show';

      const cloud = document.createElement('div');
      cloud.className = 'thought-cloud';
      cloud.style.maxWidth = '620px';

      // Header
      const header = document.createElement('div');
      header.className = 'cloud-header';
      const avatar = document.createElement('div');
      avatar.className = 'cloud-avatar';
      avatar.textContent = '\ud83d\udce7';
      const speakerInfo = document.createElement('div');
      const speaker = document.createElement('div');
      speaker.className = 'cloud-speaker';
      speaker.textContent = `\ud83d\udd0d Email Inspector: ${s.title}`;
      const speakerSub = document.createElement('div');
      speakerSub.className = 'cloud-speaker-sub';
      speakerSub.textContent = 'Find all the red flags in this email!';
      speakerInfo.appendChild(speaker);
      speakerInfo.appendChild(speakerSub);
      header.appendChild(avatar);
      header.appendChild(speakerInfo);
      cloud.appendChild(header);

      // Context story
      const ctx = document.createElement('div');
      ctx.className = 'dialogue-line';
      ctx.style.marginBottom = '16px';
      ctx.innerHTML = `<strong style="color:var(--accent2)">${npc.npcName}:</strong> ${s.story}`;
      cloud.appendChild(ctx);

      // Email container
      const emailData = s.email_data;
      const emailContainer = document.createElement('div');
      emailContainer.className = 'email-inspect-container';

      // Email header fields
      const emailHeader = document.createElement('div');
      emailHeader.className = 'email-header';
      emailHeader.innerHTML = `
        <div class="email-field"><span class="email-field-label">From:</span><span class="email-field-value" id="emailFrom">${emailData.from}</span></div>
        <div class="email-field"><span class="email-field-label">To:</span><span class="email-field-value">${emailData.to}</span></div>
        <div class="email-subject">${emailData.subject}</div>
      `;
      emailContainer.appendChild(emailHeader);

      // Email body with red flags
      const emailBody = document.createElement('div');
      emailBody.className = 'email-body';
      let bodyHtml = emailData.body;
      emailData.red_flags.forEach((flag, idx) => {
        bodyHtml = bodyHtml.replace(flag.text, `<span class="red-flag-highlight" data-flag-idx="${idx}">${flag.text}</span>`);
      });
      emailBody.innerHTML = bodyHtml;
      emailContainer.appendChild(emailBody);

      // Red flag counter + submit
      const totalFlags = emailData.red_flags.length;
      let foundFlags = new Set();
      const counter = document.createElement('div');
      counter.className = 'red-flag-counter';
      counter.innerHTML = `\ud83d\udea9 Red flags found: <strong id="flagCount">0</strong> / ${totalFlags}`;
      const submitBtn = document.createElement('button');
      submitBtn.className = 'flag-submit-btn';
      submitBtn.textContent = 'Submit Analysis';
      counter.appendChild(submitBtn);
      emailContainer.appendChild(counter);

      cloud.appendChild(emailContainer);

      // --- Manager Choice ---
      const managerBtn = document.createElement('div');
      managerBtn.className = 'scenario-option';
      managerBtn.style.border = '1.5px solid var(--gold)';
      managerBtn.style.marginTop = '15px';
      managerBtn.innerHTML = `<span style="color: var(--gold); font-weight: 700;">👨‍💼 Need help? Consult Mr. Singh (Manager)</span>`;
      managerBtn.onclick = () => {
        this.requestManagerHelp();
      };
      cloud.appendChild(managerBtn);

      // Wire up red flag clicks
      setTimeout(() => {
        const highlights = cloud.querySelectorAll('.red-flag-highlight');
        highlights.forEach(el => {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(el.getAttribute('data-flag-idx'));
            if (foundFlags.has(idx)) return;
            foundFlags.add(idx);
            el.classList.add('found');
            if (window.soundEngine.emailClick) window.soundEngine.emailClick();

            // Show hint tooltip
            const hint = document.createElement('div');
            hint.className = 'red-flag-hint';
            hint.textContent = emailData.red_flags[idx].hint;
            const rect = el.getBoundingClientRect();
            hint.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
            hint.style.top = `${rect.bottom + 8}px`;
            document.body.appendChild(hint);
            setTimeout(() => hint.remove(), 3000);

            // Update counter
            document.getElementById('flagCount').textContent = foundFlags.size;
            if (foundFlags.size >= Math.ceil(totalFlags * 0.6)) {
              submitBtn.classList.add('ready');
            }
          });
        });
      }, 100);

      // Submit button
      submitBtn.onclick = () => {
        const score = foundFlags.size / totalFlags;
        const isCorrect = score >= 0.5;
        this.handleAnswer(isCorrect, foundFlags.size, s, modal, document.getElementById('hudTimer'), resolve);
      };

      modal.appendChild(cloud);
    });
  }

  /* ── Consequence Panel ────────────────────────────────── */
  showConsequencePanel(isCorrect, scenario) {
    return new Promise(resolve => {
      const consequenceText = isCorrect ? scenario.consequence_correct : scenario.consequence_wrong;
      if (!consequenceText) { resolve(); return; }

      if (window.soundEngine.consequence) window.soundEngine.consequence();

      const panel = document.createElement('div');
      panel.className = 'consequence-panel';
      panel.innerHTML = `
        <div class="consequence-card">
          <div class="consequence-icon">${isCorrect ? '\ud83c\udf1f' : '\u26a0\ufe0f'}</div>
          <div class="consequence-title" style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
            ${isCorrect ? 'Well Done!' : 'What Happened...'}
          </div>
          <div class="consequence-text ${isCorrect ? 'correct' : 'wrong'}">
            ${consequenceText}
          </div>
          <div class="consequence-ai" id="aiInsightBox" style="display:none"></div>
          <button class="consequence-btn" id="consequenceContinueBtn">Continue \u2192</button>
        </div>
      `;
      document.body.appendChild(panel);

      // Fetch AI feedback in background
      this._fetchAiFeedback(scenario, isCorrect).then(feedback => {
        const box = document.getElementById('aiInsightBox');
        if (box && feedback) {
          box.textContent = feedback;
          box.style.display = 'block';
        }
      });

      document.getElementById('consequenceContinueBtn').onclick = () => {
        panel.style.animation = 'fadeOut 0.3s both';
        setTimeout(() => { panel.remove(); resolve(); }, 300);
      };
    });
  }

  /* ── AI Feedback (async, non-blocking) ────────────────── */
  async _fetchAiFeedback(scenario, isCorrect) {
    try {
      const resp = await fetch(`${API_BASE}/api/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: scenario.question || scenario.story,
          options: scenario.options,
          correct_index: scenario.correct_index,
          selected_index: isCorrect ? scenario.correct_index : (scenario.correct_index === 0 ? 1 : 0),
          domain: this.domain
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.feedback;
    } catch (e) {
      return null; // Backend not running
    }
  }

  /* ── Exploration Tip Objects ──────────────────────────── */
  _spawnExplorationTips() {
    const tips = [
      { fx: 0.15, fy: 0.35, text: 'Phishing emails are the #1 cause of data breaches in India. Always verify the sender!' },
      { fx: 0.55, fy: 0.88, text: 'Under POSH Act 2013, the Internal Complaints Committee must have at least 50% women members.' },
      { fx: 0.90, fy: 0.55, text: 'A good BCP plan should be tested at least twice a year through tabletop exercises.' },
      { fx: 0.45, fy: 0.25, text: 'Never share OTPs with anyone. Banks and IT departments will never ask for your OTP.' },
      { fx: 0.75, fy: 0.35, text: 'The ICC must resolve a POSH complaint within 90 days of receiving it.' },
    ];

    this.tipGroup = this.add.group();
    tips.forEach((tip, i) => {
      const icons = ['\ud83d\udccb', '\ud83d\udcce', '\ud83d\udccc', '\ud83d\udcd6', '\ud83d\udca1'];
      const tX = tip.fx * this.mapW;
      const tY = tip.fy * this.mapH;
      const t = this.add.text(tX, tY, icons[i % icons.length], { fontSize: '18px' }).setOrigin(0.5).setDepth(4 + (tY / this.mapH) * 10);
      this.tweens.add({ targets: t, y: t.y - 5, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.inOut' });
      t.tipText = tip.text;
      t.tipCollected = false;
      this.tipGroup.add(t);
    });
  }

  _checkExplorationTips() {
    if (!this.tipGroup) return;
    const children = this.tipGroup.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const t = children[i];
      if (t.active && !t.tipCollected && Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < 35) {
        t.tipCollected = true;
        t.destroy();
        this.health = Math.min(100, this.health + 3);
        this.updateHUD();
        if (window.soundEngine.discover) window.soundEngine.discover();
        this.showScorePopup('+3% \ud83d\udca1', '#34d399');

        // Show tip popup
        const popup = document.createElement('div');
        popup.className = 'tip-popup';
        popup.textContent = t.tipText;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 5000);
      }
    }
  }
}

/* ── AI Chat UI Logic ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const chatToggle = document.getElementById('chatToggle');
  const chatOverlay = document.getElementById('chatOverlay');
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');

  if (chatToggle) {
    chatToggle.addEventListener('click', () => {
      const scene = window._phaserGame ? window._phaserGame.scene.getScene('office') : null;

      const scenarioModal = document.getElementById('scenarioModal');
      const isCurrentlyOpen = chatOverlay.classList.contains('show');

      if (!isCurrentlyOpen) {
        // No active game scene — show warning
        if (!scene) {
          alert('Start the game first to consult the manager!');
          return;
        }

        if (scene.managerChances <= 0) {
          scene.showFeedbackToast('No manager consultation chances left!', false);
          return;
        }

        // Deduct chance and open
        scene.managerChances--;
        scene.updateHUD();
        scene.showFeedbackToast('Manager help used!', true);

        // Reset chat input state (may be disabled from a prior session)
        chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;

        // Reset messages
        if (chatMessages) {
          chatMessages.innerHTML = '<div class="chat-msg ai">Hello! I\'m Mr. Singh, your manager. Need help solving a compliance problem? Ask me anything!</div>';
        }

        chatOverlay.classList.add('show');
        document.body.classList.add('chat-active');

        if (scenarioModal && scenarioModal.classList.contains('show')) {
          scenarioModal.classList.add('split-view');
        }
        chatInput.focus();
      } else {
        chatOverlay.classList.remove('show');
        document.body.classList.remove('chat-active');
        if (scenarioModal) {
          scenarioModal.classList.remove('split-view');
          scenarioModal.style.visibility = 'visible';
        }
      }
    });
  }

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', () => {
      chatOverlay.classList.remove('show');
      document.body.classList.remove('chat-active');
      const scenarioModal = document.getElementById('scenarioModal');
      scenarioModal.classList.remove('split-view');
      scenarioModal.style.visibility = 'visible';
      window.focus();
    });
  }

  const addMessage = (text, sender) => {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const sendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // Disable further input once a question is sent
    chatInput.disabled = true;
    if (chatSendBtn) chatSendBtn.disabled = true;

    addMessage(text, 'user');
    chatInput.value = '';

    const typing = document.createElement('div');
    typing.className = 'chat-msg ai';
    typing.textContent = '...';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const username = localStorage.getItem('cg_username') || 'Player';
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, user: username })
      });
      const data = await res.json();
      typing.remove();
      addMessage(data.reply || 'Sorry, I could not process that.', 'ai');

      // Keep input disabled so they can only ask one question
      addMessage("Manager Singh: \"I have to get back to my work now. Good luck with the situation!\"", "ai");

    } catch (e) {
      typing.remove();
      addMessage('Error connecting to AI service.', 'ai');
      // Re-enable if there was an error so they can try again
      chatInput.disabled = false;
      if (chatSendBtn) chatSendBtn.disabled = false;
    }
  };

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendMessage);
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      // Stop Phaser from capturing these keys
      e.stopPropagation();
      if (e.key === 'Enter') sendMessage();
    });
    chatInput.addEventListener('keyup', (e) => e.stopPropagation());
  }
});

/* ── Bootstrap ─────────────────────────────────────────── */
window.gameStarted = false;

// Game Configuration
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 480;
const LANE_WIDTH = 80;
const LANE_CENTER_X = CANVAS_WIDTH / 2;
const TOTAL_DISTANCE = 5000; // Arbitrary units

// Colors
const COLORS = {
    skyTop: '#2b003b',
    skyBottom: '#ff0055',
    groundTop: '#1a0024',
    groundBottom: '#0d0015',
    grid: '#ff00ff',
    martiGreen: '#26D07C',
    road: '#111',
    tagBlack: '#111',
    obstacle: '#ff3333'
};

// Game State
const state = {
    isPlaying: false,
    isGameOver: false,
    distanceTraveled: 0,
    speed: 0,
    baseSpeed: 10,
    tagModeSpeed: 18,
    lane: 1, // 0: Left, 1: Center, 2: Right
    playerX: LANE_CENTER_X,
    targetX: LANE_CENTER_X,
    mode: 'SCOOTER', // 'SCOOTER' or 'TAG'
    tagTimer: 0,
    obstacles: [],
    particles: [],
    bgOffset: 0
};

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
    start: document.getElementById('start-screen'),
    hud: document.getElementById('hud'),
    end: document.getElementById('end-screen'),
    fill: document.getElementById('progress-fill'),
    mode: document.getElementById('mode-indicator')
};

// Helper: Random Range
const randomRange = (min, max) => Math.random() * (max - min) + min;

// --- INPUT HANDLING ---
let touchStartX = 0;

function handleInput(type, clientX) {
    if (!state.isPlaying && !state.isGameOver) {
        startGame();
        return;
    }

    if (state.isGameOver) return;

    // Determine swipe or tap
    const half = window.innerWidth / 2; // Approximate relative to screen
    // For simplicity in this ad context, let's map screen clicks to left/right logic relative to center
    // But since we have a 320px container centered, we should use relative coordinates

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;

    if (x < CANVAS_WIDTH / 2) {
        moveLeft();
    } else {
        moveRight();
    }
}

// Add event listener to start screen to ensure first click registers
ui.start.addEventListener('mousedown', (e) => handleInput('click', e.clientX));
ui.start.addEventListener('touchstart', (e) => handleInput('tap', e.touches[0].clientX));

canvas.addEventListener('mousedown', (e) => handleInput('click', e.clientX));
canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 30) {
        if (diff > 0) moveRight();
        else moveLeft();
    } else {
        handleInput('tap', touchEndX);
    }
}, {passive: false});

function moveLeft() {
    if (state.lane > 0) state.lane--;
    updateTargetX();
}

function moveRight() {
    if (state.lane < 2) state.lane++;
    updateTargetX();
}

function updateTargetX() {
    // Lanes are at x = 80, 160, 240 (roughly 320/3)
    // Actually let's do: Center is 160. Left is 80. Right is 240.
    const laneDist = 80;
    state.targetX = LANE_CENTER_X + (state.lane - 1) * laneDist;
}

// --- GAME LOGIC ---

function startGame() {
    state.isPlaying = true;
    state.speed = state.baseSpeed;
    ui.start.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    loop();
}

function endGame() {
    state.isPlaying = false;
    state.isGameOver = true;
    ui.hud.classList.add('hidden');
    ui.end.classList.remove('hidden');
}

function spawnObstacle() {
    // 5% chance per frame is too high, maybe 1-2%
    if (Math.random() < 0.02) {
        const lane = Math.floor(randomRange(0, 3));
        const type = Math.random() < 0.2 ? 'TAG_TOKEN' : 'OBSTACLE'; // 20% chance for powerup

        // Prevent overlapping too much
        const tooClose = state.obstacles.some(o => o.z > 800 && o.lane === lane);
        if (!tooClose) {
            state.obstacles.push({
                x: LANE_CENTER_X + (lane - 1) * 80,
                y: -50, // Start above horizon
                z: 1000, // Distance
                lane: lane,
                type: type,
                active: true
            });
        }
    }
}

function update() {
    // Movement lerp
    state.playerX += (state.targetX - state.playerX) * 0.2;

    // Speed progression
    if (state.mode === 'TAG') {
        state.speed = state.tagModeSpeed;
        state.tagTimer--;
        if (state.tagTimer <= 0) {
            state.mode = 'SCOOTER';
            ui.mode.innerText = "SCOOTER MODU";
            ui.mode.style.color = "white";
            ui.mode.style.borderColor = COLORS.martiGreen;
        }
    } else {
        state.speed = state.baseSpeed;
    }

    // Distance
    state.distanceTraveled += state.speed;
    const progress = Math.min((state.distanceTraveled / TOTAL_DISTANCE) * 100, 100);
    ui.fill.style.width = `${progress}%`;

    if (state.distanceTraveled >= TOTAL_DISTANCE) {
        endGame();
    }

    // Obstacles
    spawnObstacle();

    // Move obstacles
    state.obstacles.forEach(obs => {
        obs.z -= state.speed;

        // Collision logic (approximate)
        if (obs.z < 100 && obs.z > 0 && obs.lane === state.lane && obs.active) {
            if (obs.type === 'TAG_TOKEN') {
                activateTagMode();
                obs.active = false;
            } else if (obs.type === 'OBSTACLE') {
                if (state.mode === 'TAG') {
                    // Smash through
                    obs.active = false;
                    createParticles(state.playerX, 400, COLORS.obstacle);
                } else {
                    // Hit! For this ad, let's just slow down or shake, no death to keep flow?
                    // "No lose" mechanics are better for ads.
                    // Just shake screen and slow down.
                    shakeScreen();
                    obs.active = false;
                    state.distanceTraveled -= 200; // Penalty
                }
            }
        }
    });

    // Cleanup
    state.obstacles = state.obstacles.filter(o => o.z > -200);

    // Background Scroll
    state.bgOffset = (state.bgOffset + state.speed) % 40;
}

function activateTagMode() {
    state.mode = 'TAG';
    state.tagTimer = 300; // 5 seconds at 60fps
    ui.mode.innerText = "TAG MODU (HIZLI & GÜÇLÜ)";
    ui.mode.style.color = "#ffff00";
    ui.mode.style.borderColor = "#ffff00";
}

function shakeScreen() {
    canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
    setTimeout(() => canvas.style.transform = 'none', 200);
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        state.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: color
        });
    }
}

function updateParticles() {
    state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
    });
    state.particles = state.particles.filter(p => p.life > 0);
}

// --- DRAWING ---

function draw() {
    updateParticles();

    // Clear
    ctx.fillStyle = COLORS.skyTop;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Sunset Sky (Vaporwave Gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT/2);
    grad.addColorStop(0, COLORS.skyTop);
    grad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT/2);

    // Sun
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 60, 0, Math.PI*2);
    ctx.fill();

    // 2. Draw Ground/Road (Perspective Grid)
    // Horizon line at Y = 240
    const horizonY = CANVAS_HEIGHT / 2;

    ctx.fillStyle = COLORS.groundBottom;
    ctx.fillRect(0, horizonY, CANVAS_WIDTH, CANVAS_HEIGHT/2);

    // Grid Lines (Moving)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical lines (Perspective)
    for (let i = -5; i <= 5; i++) {
        const x1 = CANVAS_WIDTH/2 + i * 20; // Horizon point
        const x2 = CANVAS_WIDTH/2 + i * 150; // Bottom point
        ctx.beginPath();
        ctx.moveTo(x1, horizonY);
        ctx.lineTo(x2, CANVAS_HEIGHT);
        ctx.stroke();
    }

    // Horizontal lines (Moving towards viewer)
    let z = (state.distanceTraveled % 100) / 100; // 0 to 1
    // Draw expanding horizontal lines
    for (let i = 0; i < 10; i++) {
        let y = horizonY + Math.pow((i + z)/10, 2) * (CANVAS_HEIGHT/2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Draw Objects (Pseudo-3D)
    // Sort obstacles by Z (far to near) so they render correctly
    // Actually, simply drawing them in order of creation is mostly fine if they don't overtake each other
    // But reverse order is safer
    const renderList = [...state.obstacles].sort((a,b) => b.z - a.z);

    renderList.forEach(obs => {
        if (!obs.active) return;
        // Project 3D to 2D
        // Perspective formula: scale = f / (z + f)
        const f = 300; // field of view
        const scale = f / (obs.z + f);

        // Ensure object is in front of camera
        if (scale < 0) return;

        const sx = CANVAS_WIDTH/2 + (obs.x - CANVAS_WIDTH/2) * scale;
        const sy = horizonY + 100 * scale; // 100 is "camera height" offset
        const size = 60 * scale;

        if (obs.type === 'OBSTACLE') {
            drawTrafficCone(sx, sy, size);
        } else if (obs.type === 'TAG_TOKEN') {
            drawTagToken(sx, sy, size);
        }
    });

    // 4. Draw Particles
    state.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // 5. Draw Player
    // Player is static Y, moves X
    const playerY = CANVAS_HEIGHT - 80;
    if (state.mode === 'SCOOTER') {
        drawScooter(state.playerX, playerY, 1);
    } else {
        drawTagCar(state.playerX, playerY, 1);
    }
}

function drawScooter(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.martiGreen;

    // Body (Stem)
    ctx.strokeStyle = COLORS.martiGreen;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0); // Base center
    ctx.lineTo(0, -40); // Handlebar stem
    ctx.stroke();

    // Handlebars
    ctx.beginPath();
    ctx.moveTo(-15, -40);
    ctx.lineTo(15, -40);
    ctx.stroke();

    // Base/Deck
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, 0, 20, 5);

    // Wheels (Viewed from back, simplified)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(0, 5, 5, 0, Math.PI*2);
    ctx.fill();

    // Rider (Abstract)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -55, 8, 0, Math.PI*2); // Head
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.martiGreen;
    ctx.fillRect(-6, -45, 12, 20);

    ctx.restore();
}

function drawTagCar(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffff00';

    // Car Body (Sedan rear view)
    ctx.fillStyle = COLORS.tagBlack;
    // Main chassis
    ctx.fillRect(-20, -10, 40, 20);
    // Roof
    ctx.fillRect(-15, -25, 30, 15);

    // Lights
    ctx.fillStyle = '#ff0000'; // Tail lights
    ctx.fillRect(-18, -5, 8, 4);
    ctx.fillRect(10, -5, 8, 4);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-22, 5, 8, 8);
    ctx.fillRect(14, 5, 8, 8);

    // TAG Text on plate
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAG', 0, 0);

    ctx.restore();
}

function drawTrafficCone(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    // ctx.scale(size/50, size/50); // Scale based on size prop

    const s = size * 0.8;

    ctx.fillStyle = '#ff5500';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s/2, 0);
    ctx.lineTo(-s/2, 0);
    ctx.fill();

    // Base
    ctx.fillStyle = '#ff5500';
    ctx.fillRect(-s/2, 0, s, s/5);

    // White stripes
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s/4, -s*0.7, s/2, s/5);

    ctx.restore();
}

function drawTagToken(x, y, size) {
    ctx.save();
    ctx.translate(x, y - size/2); // Float above ground

    const pulse = Math.sin(Date.now() / 100) * 0.2 + 1;
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#000';
    ctx.strokeStyle = COLORS.martiGreen;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.martiGreen;
    ctx.font = `${size/2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAG', 0, 0);

    ctx.restore();
}


// --- LOOP ---

function loop() {
    if (!state.isPlaying) return;

    update();
    draw();

    requestAnimationFrame(loop);
}

// Initial Draw (Background)
draw();

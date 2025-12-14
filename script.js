const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const WIDTH = 320;
const HEIGHT = 480;
const GRAVITY = 0.5;
const JUMP_FORCE = -7;
const MAX_SPEED = 8;
const BASE_SCROLL_SPEED = 3.5;
const SCOOTER_SPEED = 5;
const TAG_SPEED = 9;

// --- State ---
let gameState = 'START'; // START, PLAYING, GAMEOVER
let frames = 0;
let distance = 0;
let score = 0;
let highScore = 0;
let mode = 'BIRD'; // BIRD, SCOOTER, TAG
let modeTimer = 0;
let isTouching = false;

// --- Assets / Drawing Helpers ---
const COLORS = {
    martiGreen: '#26D07C',
    martiDark: '#0f3d2e',
    skyTop: '#2b1055',
    skyBot: '#7597de',
    bridge: '#333',
    light: '#FFD700'
};

// --- Player Object ---
const player = {
    x: 50,
    y: HEIGHT / 2,
    dy: 0,
    width: 40,
    height: 30,
    angle: 0,
    wobble: 0,

    reset: function() {
        this.y = HEIGHT / 2;
        this.dy = 0;
        this.angle = 0;
        mode = 'BIRD';
        modeTimer = 0;
    },

    update: function() {
        // Mode Management
        if (modeTimer > 0) {
            modeTimer--;
            if (modeTimer === 0) {
                mode = 'BIRD'; // Revert to normal
                spawnEffect(this.x, this.y, 20, '#fff'); // Poof effect
            }
        }

        // Speed settings based on mode
        let currentSpeed = BASE_SCROLL_SPEED;
        if (mode === 'SCOOTER') currentSpeed = SCOOTER_SPEED;
        if (mode === 'TAG') currentSpeed = TAG_SPEED;

        // Physics
        if (isTouching) {
            this.dy += -0.8; // Jetpack feel
            // Add particles
            if (frames % 5 === 0) spawnParticle(this.x, this.y + 10, mode === 'TAG' ? '#FFD700' : '#fff');
        } else {
            this.dy += GRAVITY;
        }

        // Cap speed
        if (this.dy > MAX_SPEED) this.dy = MAX_SPEED;
        if (this.dy < -MAX_SPEED) this.dy = -MAX_SPEED;

        this.y += this.dy;

        // Floor/Ceiling
        if (this.y < 20) { this.y = 20; this.dy = 0; }
        if (this.y > HEIGHT - 50) { this.y = HEIGHT - 50; this.dy = -5; } // Bounce off floor

        // Rotation
        this.angle = this.dy * 0.05;
        this.wobble = Math.sin(frames * 0.1) * 2;
    },

    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y + this.wobble);
        ctx.rotate(this.angle);

        if (mode === 'TAG') {
            this.drawTagCar();
        } else if (mode === 'SCOOTER') {
            this.drawScooter();
        } else {
            this.drawSeagull();
        }

        ctx.restore();
    },

    drawSeagull: function() {
        // Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing (Flapping)
        ctx.fillStyle = '#ddd';
        const wingY = Math.sin(frames * 0.3) * 8;
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(10, -10 + wingY);
        ctx.lineTo(5, 5);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(12, -8, 7, 0, Math.PI*2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.lineTo(24, -3);
        ctx.lineTo(16, 0);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(14, -9, 1.5, 0, Math.PI*2);
        ctx.fill();
    },

    drawScooter: function() {
        // Martı Scooter
        // Deck
        ctx.fillStyle = COLORS.martiGreen;
        ctx.fillRect(-15, 15, 30, 4);

        // Stem
        ctx.fillStyle = '#333';
        ctx.fillRect(10, -5, 3, 20);

        // Handlebars
        ctx.fillStyle = '#333';
        ctx.fillRect(5, -5, 12, 2);

        // Wheels
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-10, 20, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, 20, 5, 0, Math.PI*2); ctx.fill();

        // Rider (Abstract Bird)
        ctx.translate(0, -5);
        this.drawSeagull();
    },

    drawTagCar: function() {
        // Glow effect
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;

        // Car Body (Yellow Taxi/TAG style)
        ctx.fillStyle = '#FFD700'; // Gold/Yellow
        ctx.beginPath();
        ctx.roundRect(-20, 0, 50, 20, 5);
        ctx.fill();

        // Roof
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-5, -12);
        ctx.lineTo(15, -12);
        ctx.lineTo(25, 0);
        ctx.fill();

        // Windows
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(-8, -1);
        ctx.lineTo(-4, -10);
        ctx.lineTo(14, -10);
        ctx.lineTo(23, -1);
        ctx.fill();

        // Wheels
        ctx.shadowBlur = 0; // Reset glow for wheels
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-10, 20, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 20, 6, 0, Math.PI*2); ctx.fill();

        // TAG Text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('TAG', -5, 14);
    }
};

// --- Environment / Parallax ---
const bgLayers = [
    { type: 'stars', speed: 0.1, elements: [] },
    { type: 'city_far', speed: 0.3, elements: [] },
    { type: 'bridge', speed: 0.5, x: WIDTH },
    { type: 'city_near', speed: 2.0, elements: [] } // Floor
];

function initEnvironment() {
    // Generate Stars
    bgLayers[0].elements = [];
    for(let i=0; i<30; i++) {
        bgLayers[0].elements.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT/2,
            size: Math.random() * 2,
            alpha: Math.random()
        });
    }

    // Generate Far City (Silhouette)
    bgLayers[1].elements = [];
    let cx = 0;
    while(cx < WIDTH * 2) {
        let w = 20 + Math.random() * 40;
        let h = 50 + Math.random() * 100;
        bgLayers[1].elements.push({x: cx, w: w, h: h});
        cx += w;
    }
}

function updateDrawEnvironment(speed) {
    // 1. Stars
    ctx.fillStyle = '#fff';
    bgLayers[0].elements.forEach(star => {
        star.x -= speed * 0.1;
        if(star.x < 0) star.x = WIDTH;
        ctx.globalAlpha = star.alpha;
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 2. Far City
    ctx.fillStyle = '#1e1b33'; // Dark purple silhouette
    let cityFar = bgLayers[1];
    cityFar.elements.forEach(b => {
        b.x -= speed * 0.3;
    });
    // Recycle
    if(cityFar.elements[0].x + cityFar.elements[0].w < 0) {
        let first = cityFar.elements.shift();
        first.x = cityFar.elements[cityFar.elements.length-1].x + cityFar.elements[cityFar.elements.length-1].w;
        cityFar.elements.push(first);
    }
    cityFar.elements.forEach(b => {
        ctx.fillRect(b.x, HEIGHT - 60 - b.h, b.w+1, b.h + 60);
        // Random lights
        ctx.fillStyle = '#FCEEB5';
        if(b.x % 3 === 0) ctx.fillRect(b.x+5, HEIGHT-80, 2, 2);
        ctx.fillStyle = '#1e1b33';
    });

    // 3. Bosphorus Bridge
    let bridge = bgLayers[2];
    bridge.x -= speed * 0.5;
    if(bridge.x < -400) bridge.x = WIDTH + 200; // Respawn

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    // Cables
    ctx.beginPath();
    ctx.moveTo(bridge.x, HEIGHT-50);
    ctx.quadraticCurveTo(bridge.x + 150, 50, bridge.x + 300, HEIGHT-50);
    ctx.stroke();
    // Vertical lines (Suspenders)
    for(let i=0; i<=30; i++) {
        let bx = bridge.x + i * 10;
        // Simple curve approx
        let by = 50 + Math.pow((i-15)/15, 2) * (HEIGHT-100);
        if (by < HEIGHT-50) {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx, HEIGHT-50);
            ctx.stroke();
            // Light on cable
            ctx.fillStyle = '#ff0055'; // Pink/Red bridge lights
            ctx.beginPath(); ctx.arc(bx, by, 1, 0, Math.PI*2); ctx.fill();
        }
    }
    ctx.restore();

    // 4. Ground (Road)
    ctx.fillStyle = '#111';
    ctx.fillRect(0, HEIGHT - 50, WIDTH, 50);
    // Road markers
    ctx.fillStyle = '#555';
    let markerOffset = (distance % 40);
    for(let i=0; i<WIDTH+40; i+=40) {
        ctx.fillRect(i - markerOffset, HEIGHT - 25, 20, 2);
    }
}

// --- Objects (Obstacles / Powerups) ---
let gameObjects = [];

function spawnObject() {
    let rate = 60;
    if (mode === 'TAG') rate = 20; // Spawn more stuff to smash in TAG mode
    else if (mode === 'SCOOTER') rate = 40;

    if (frames % rate === 0) {
        let r = Math.random();
        let y = 50 + Math.random() * (HEIGHT - 150);

        // Ensure not too close
        if (gameObjects.length > 0 && gameObjects[gameObjects.length-1].x > WIDTH - 50) return;

        let type = 'OBSTACLE';

        // Spawn Logic
        if (r > 0.96) type = 'TAG_POWERUP'; // Rare
        else if (r > 0.90) type = 'SCOOTER_POWERUP';
        else if (r > 0.70) type = 'BATTERY';
        else type = 'OBSTACLE';

        // In TAG mode, mostly obstacles to smash
        if (mode === 'TAG') {
            if (Math.random() > 0.8) type = 'BATTERY'; // Bonus points
            else type = 'OBSTACLE';
        }

        gameObjects.push({
            type: type,
            x: WIDTH,
            y: y,
            w: 30,
            h: 30,
            active: true
        });
    }
}

function updateDrawObjects(speed) {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        let o = gameObjects[i];
        o.x -= speed;

        // Magnet for TAG mode
        if (mode === 'TAG' && o.type === 'BATTERY') {
            o.y += (player.y - o.y) * 0.1;
        }

        if (o.active) {
            drawObject(o);
            checkCollision(o, i);
        }

        if (o.x < -50) gameObjects.splice(i, 1);
    }
}

function drawObject(o) {
    const cx = o.x + o.w/2;
    const cy = o.y + o.h/2;

    ctx.save();
    ctx.translate(cx, cy);

    if (o.type === 'BATTERY') {
        // Battery Icon
        ctx.fillStyle = COLORS.martiGreen;
        ctx.fillRect(-8, -12, 16, 24);
        ctx.fillStyle = '#fff'; // Tip
        ctx.fillRect(-4, -16, 8, 4);
        // Bolt
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(4, 0); ctx.lineTo(-2, 5); ctx.fill();

    } else if (o.type === 'SCOOTER_POWERUP') {
        // Green Orb
        ctx.shadowColor = COLORS.martiGreen;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = COLORS.martiGreen;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Mini Scooter Icon (replacing emoji)
        ctx.fillStyle = COLORS.martiGreen;
        ctx.fillRect(-8, 5, 16, 2); // Deck
        ctx.fillRect(4, -5, 2, 10); // Stem
        ctx.beginPath(); ctx.arc(-5, 8, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI*2); ctx.fill();


    } else if (o.type === 'TAG_POWERUP') {
        // Gold Orb
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('TAG', -10, 4);

    } else { // OBSTACLE (Drone/Traffic)
        ctx.fillStyle = '#d63031';
        // Drone shape
        ctx.fillRect(-15, -5, 30, 10);
        ctx.beginPath(); ctx.arc(-15, 0, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, 0, 5, 0, Math.PI*2); ctx.fill();
        // Blinking light
        if (Math.floor(frames / 10) % 2 === 0) {
            ctx.fillStyle = 'red';
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
        }
    }
    ctx.restore();
}

function checkCollision(o, index) {
    // Simple AABB
    if (
        player.x < o.x + o.w &&
        player.x + player.width > o.x &&
        player.y < o.y + o.h &&
        player.y + player.height > o.y
    ) {
        if (o.type === 'OBSTACLE') {
            if (mode === 'TAG') {
                // SMASH
                spawnEffect(o.x, o.y, 10, '#d63031');
                score += 50;
                shakeScreen(5);
                gameObjects.splice(index, 1);
            } else {
                // HIT
                spawnEffect(player.x, player.y, 5, '#d63031');
                shakeScreen(5);
                if (mode === 'SCOOTER') {
                    mode = 'BIRD'; // Downgrade
                    modeTimer = 0;
                    gameObjects.splice(index, 1);
                } else {
                    // Penalty
                    score = Math.max(0, score - 50);
                    gameObjects.splice(index, 1);
                    // Could end game here, but "No Lose" logic usually preferred for ads.
                    // Let's just slow down
                }
            }
        } else {
            // Collect
            if (o.type === 'BATTERY') {
                score += 100;
                spawnEffect(o.x, o.y, 10, COLORS.martiGreen);
            } else if (o.type === 'SCOOTER_POWERUP') {
                mode = 'SCOOTER';
                modeTimer = 600; // 10s
                score += 200;
                spawnEffect(o.x, o.y, 20, COLORS.martiGreen);
                showTagStatus("SCOOTER MODE");
            } else if (o.type === 'TAG_POWERUP') {
                mode = 'TAG';
                modeTimer = 300; // 5s
                score += 500;
                spawnEffect(o.x, o.y, 30, '#FFD700');
                showTagStatus("TAG POWER!");
            }
            gameObjects.splice(index, 1);
        }
    }
}

// --- FX ---
let particles = [];
let shake = 0;

function spawnParticle(x, y, color) {
    particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color: color
    });
}

function spawnEffect(x, y, count, color) {
    for(let i=0; i<count; i++) spawnParticle(x, y, color);
}

function updateDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

function shakeScreen(amount) {
    shake = amount;
}

// --- UI Interaction ---
const statusEl = document.getElementById('tag-status');
function showTagStatus(msg) {
    if(!statusEl) return;
    statusEl.innerText = msg;
    statusEl.classList.add('active');
    setTimeout(() => statusEl.classList.remove('active'), 2000);
}

// --- Core Loop ---
function loop() {
    if (gameState !== 'PLAYING') return;

    requestAnimationFrame(loop);

    // Shake
    let sx = 0, sy = 0;
    if (shake > 0) {
        sx = (Math.random() - 0.5) * shake;
        sy = (Math.random() - 0.5) * shake;
        shake *= 0.9;
        if (shake < 0.5) shake = 0;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    frames++;
    let currentSpeed = BASE_SCROLL_SPEED;
    if (mode === 'SCOOTER') currentSpeed = SCOOTER_SPEED;
    if (mode === 'TAG') currentSpeed = TAG_SPEED;

    distance += currentSpeed;

    updateDrawEnvironment(currentSpeed);

    spawnObject();
    updateDrawObjects(currentSpeed);
    updateDrawParticles();

    player.update();
    player.draw();

    ctx.restore();

    // UI Updates
    document.getElementById('score').innerText = score;
    let pct = Math.min(100, (distance / 4000) * 100); // 4000 dist goal
    document.getElementById('progress-bar').style.width = pct + '%';

    if (pct >= 100) endGame();
}

function startGame() {
    gameState = 'PLAYING';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    player.reset();
    frames = 0;
    distance = 0;
    score = 0;
    gameObjects = [];
    particles = [];
    initEnvironment();
    loop();
}

function endGame() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');

    document.getElementById('final-score').innerText = score;
    // Mock collected stats
    document.getElementById('stat-distance').innerText = Math.floor(distance / 10) + 'm';
    document.getElementById('stat-mode').innerText = mode === 'TAG' ? 'TAG' : 'Scooter';
}

// Event Listeners
const container = document.getElementById('ad-container');
container.addEventListener('mousedown', (e) => { e.preventDefault(); isTouching = true; if(gameState==='START') startGame(); });
container.addEventListener('mouseup', (e) => { e.preventDefault(); isTouching = false; });
container.addEventListener('touchstart', (e) => { e.preventDefault(); isTouching = true; if(gameState==='START') startGame(); }, {passive:false});
container.addEventListener('touchend', (e) => { e.preventDefault(); isTouching = false; }, {passive:false});

document.getElementById('restart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

// Init
initEnvironment();
// Draw one frame for background
updateDrawEnvironment(0);
player.draw();

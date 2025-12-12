const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START';
let frames = 0;
let distance = 0;
const MAX_DISTANCE = 1500;

// Dimensions
const WIDTH = 320;
const HEIGHT = 480;

// Inputs
let isTouching = false;

// Physics
const GRAVITY = 0.4;
const LIFT = -6; // Initial jump velocity
const JETPACK_FORCE = -0.5; // Continuous lift
const TERMINAL_VELOCITY = 8;

// Seagull Player
const bird = {
    x: 60,
    y: HEIGHT / 2,
    velocity: 0,
    width: 40,
    height: 30,
    angle: 0,

    update: function() {
        if (gameState !== 'PLAYING') return;

        // Physics
        if (isTouching) {
            this.velocity += JETPACK_FORCE;
        } else {
            this.velocity += GRAVITY;
        }

        // Cap velocity
        if (this.velocity > TERMINAL_VELOCITY) this.velocity = TERMINAL_VELOCITY;
        if (this.velocity < -TERMINAL_VELOCITY) this.velocity = -TERMINAL_VELOCITY;

        this.y += this.velocity;

        // Boundaries
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
        if (this.y > HEIGHT - 80) { // Floor (City skyline base)
            this.y = HEIGHT - 80;
            this.velocity = -5; // Bounce
        }

        // Angle based on velocity
        this.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
    },

    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Seagull (Martı)
        // Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing (Flapping)
        const wingOffset = Math.sin(frames * 0.2) * 5;
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(10, -2 + wingOffset); // Wing tip
        ctx.lineTo(0, 5);
        ctx.fill();

        // Head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(12, -8, 8, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(18, -8);
        ctx.lineTo(26, -5);
        ctx.lineTo(18, -2);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(15, -10, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
};

// City Background
const buildings = [];
const BUILDING_WIDTH = 40;
const SCROLL_SPEED = 3;

function initBuildings() {
    for (let i = 0; i < WIDTH / BUILDING_WIDTH + 2; i++) {
        addBuilding(i * BUILDING_WIDTH);
    }
}

function addBuilding(x) {
    const height = 50 + Math.random() * 100;
    buildings.push({
        x: x,
        width: BUILDING_WIDTH,
        height: height,
        color: Math.random() > 0.5 ? '#1a4e6e' : '#15405e' // Different shades of dark blue
    });
}

function updateBuildings() {
    if (gameState !== 'PLAYING') return;

    buildings.forEach(b => b.x -= SCROLL_SPEED);

    if (buildings[0].x + buildings[0].width < 0) {
        buildings.shift();
        addBuilding(buildings[buildings.length - 1].x + BUILDING_WIDTH);
    }
}

function drawBuildings() {
    ctx.fillStyle = '#0f2c42'; // Deep blue base
    ctx.fillRect(0, HEIGHT - 50, WIDTH, 50); // Ground

    buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, HEIGHT - 50 - b.height, b.width, b.height);

        // Windows
        ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
        for (let wy = HEIGHT - 60; wy > HEIGHT - 50 - b.height + 10; wy -= 15) {
            if (Math.random() > 0.3) {
                ctx.fillRect(b.x + 10, wy, 6, 8);
                ctx.fillRect(b.x + 24, wy, 6, 8);
            }
        }
    });
}

// Clouds
let clouds = [];

function spawnCloud() {
    if (frames % 100 === 0) {
        const y = Math.random() * (HEIGHT - 150);
        clouds.push({
            x: WIDTH,
            y: y,
            w: 60 + Math.random() * 40,
            h: 30 + Math.random() * 20,
            speed: SCROLL_SPEED * (0.8 + Math.random() * 0.4)
        });
    }
}

function updateClouds() {
    if (gameState !== 'PLAYING') return;

    clouds.forEach(c => c.x -= c.speed);
    clouds = clouds.filter(c => c.x + c.w > 0);
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.w * 0.3, c.y - c.h * 0.2, c.w / 3, c.h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Input Handling
const adContainer = document.getElementById('ad-container');

function startInput(e) {
    e.preventDefault();
    isTouching = true;
    if (gameState === 'START') startGame();
}

function endInput(e) {
    e.preventDefault();
    isTouching = false;
}

adContainer.addEventListener('mousedown', startInput);
adContainer.addEventListener('mouseup', endInput);
adContainer.addEventListener('touchstart', startInput, {passive: false});
adContainer.addEventListener('touchend', endInput, {passive: false});

document.getElementById('restart-btn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent re-triggering jump immediately
    startGame();
});

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    gameState = 'PLAYING';

    // Reset Game State
    bird.y = HEIGHT / 2;
    bird.velocity = 0;
    frames = 0;
    distance = 0;
    buildings.length = 0;
    clouds = [];
    initBuildings();

    loop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function loop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Update
    frames++;
    distance += SCROLL_SPEED;

    updateBuildings();
    spawnCloud();
    updateClouds();
    bird.update();

    // Draw
    drawBuildings();
    drawClouds();
    bird.draw();

    // UI Update
    const progressPct = Math.min(100, (distance / MAX_DISTANCE) * 100);
    document.getElementById('progress-bar').style.width = progressPct + '%';
    document.getElementById('progress-icon').style.left = `calc(${progressPct}% - 10px)`;

    // Win Condition
    if (distance >= MAX_DISTANCE) {
        gameOver();
        return;
    }

    requestAnimationFrame(loop);
}

// Initial Render
initBuildings();
drawBuildings();
bird.draw();

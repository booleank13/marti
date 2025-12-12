const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START';
let frames = 0;
let distance = 0;
let score = 0;
const MAX_DISTANCE = 2000;

// Dimensions
const WIDTH = 320;
const HEIGHT = 480;

// Inputs
let isTouching = false;

// Physics
const GRAVITY = 0.4;
const LIFT = -6;
const JETPACK_FORCE = -0.6;
const TERMINAL_VELOCITY = 8;
const SCROLL_SPEED = 3;

// Assets
const bird = {
    x: 60,
    y: HEIGHT / 2,
    velocity: 0,
    width: 36,
    height: 24,
    angle: 0,
    trailTimer: 0,

    update: function() {
        if (gameState !== 'PLAYING') return;

        // Physics
        if (isTouching) {
            this.velocity += JETPACK_FORCE;
            this.trailTimer++;
            if (this.trailTimer % 5 === 0) {
                spawnParticle(this.x, this.y + 10, 'white');
            }
        } else {
            this.velocity += GRAVITY;
            this.trailTimer = 0;
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
        if (this.y > HEIGHT - 70) { // Floor buffer
            this.y = HEIGHT - 70;
            this.velocity = -4; // Bounce
        }

        // Angle based on velocity
        this.angle = Math.min(Math.PI / 5, Math.max(-Math.PI / 5, (this.velocity * 0.05)));
    },

    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Seagull (Martı)

        // Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.fillStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-28, -5);
        ctx.lineTo(-28, 5);
        ctx.fill();

        // Wing (Flapping)
        const wingOffset = Math.sin(frames * 0.2) * 8;
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(12, -8 + wingOffset); // Wing tip
        ctx.lineTo(0, 8);
        ctx.fill();

        // Eye
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(14, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(18, -2);
        ctx.lineTo(28, 2);
        ctx.lineTo(18, 5);
        ctx.fill();

        ctx.restore();
    }
};

// Particles
let particles = [];
function spawnParticle(x, y, color) {
    particles.push({
        x: x,
        y: y,
        vx: -2 - Math.random(),
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        color: color
    });
}
function updateDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

// Floating Text
let texts = [];
function spawnText(x, y, text) {
    texts.push({
        x: x,
        y: y,
        text: text,
        life: 1.0,
        dy: -1
    });
}
function updateDrawTexts() {
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1; // Thinner stroke
    ctx.textAlign = "center";

    for (let i = texts.length - 1; i >= 0; i--) {
        let t = texts[i];
        t.y += t.dy;
        t.life -= 0.02;

        if (t.life <= 0) {
            texts.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = t.life;
        ctx.fillText(t.text, t.x, t.y);
        ctx.strokeText(t.text, t.x, t.y);
        ctx.globalAlpha = 1.0;
    }
}

// Parallax Background Layers
const bgLayers = [
    { type: 'sky', speed: 0.5, elements: [] },
    { type: 'far', speed: 1.0, elements: [] },
    { type: 'near', speed: SCROLL_SPEED, elements: [] } // Ground/Collidable layer handled separately though
];

function initBackgrounds() {
    // Generate Far City
    for(let x=0; x<WIDTH+100; x+=30) {
        bgLayers[1].elements.push({
            x: x,
            w: 30,
            h: 50 + Math.random()*80,
            c: '#0a3a5a'
        });
    }
}

function updateDrawBackgrounds() {
    // 1. Sky (Gradient already in CSS, maybe add clouds here)
    // 2. Far City
    let layer = bgLayers[1];
    layer.elements.forEach(el => {
        el.x -= layer.speed;
    });
    // Recycle
    if(layer.elements[0].x + layer.elements[0].w < 0) {
         let first = layer.elements.shift();
         first.x = layer.elements[layer.elements.length-1].x + first.w;
         first.h = 50 + Math.random()*80; // randomize height again
         layer.elements.push(first);
    }

    // Draw Far City
    ctx.fillStyle = '#0a3a5a';
    layer.elements.forEach(el => {
        ctx.fillRect(el.x, HEIGHT - 80 - el.h, el.w + 1, el.h + 80);
    });

    // 3. Near City (The floor collider)
    ctx.fillStyle = '#15405e';
    // Moving ground effect
    const offset = (distance % 40);
    ctx.fillRect(0, HEIGHT - 60, WIDTH, 60);

    // Building details passing by in foreground
    // Use a simple procedural approach
    ctx.fillStyle = '#1e5175';
    for(let i=0; i<10; i++) {
        let bx = (i * 80) - (distance % 80);
        ctx.fillRect(bx, HEIGHT - 60 - 30, 40, 30);
        // Windows
        ctx.fillStyle = '#FCEEB5';
        if(i%2===0) ctx.fillRect(bx+5, HEIGHT-80, 5, 10);
        ctx.fillStyle = '#1e5175'; // reset
    }
}

// Collectibles & Obstacles
let gameObjects = [];

function spawnGameObject() {
    if (frames % 60 === 0) {
        const type = Math.random();
        const y = 50 + Math.random() * (HEIGHT - 150);

        if (type > 0.3) {
            // Collectible: Battery / Logo
            gameObjects.push({
                type: 'collectible',
                x: WIDTH,
                y: y,
                w: 30,
                h: 30,
                color: '#26D07C',
                angle: 0
            });
        } else {
            // Obstacle: Cloud / Wind
            gameObjects.push({
                type: 'obstacle',
                x: WIDTH,
                y: y,
                w: 50,
                h: 30,
                color: '#ddd'
            });
        }
    }
}

function updateDrawGameObjects() {
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        let obj = gameObjects[i];
        obj.x -= SCROLL_SPEED;

        // Draw
        if (obj.type === 'collectible') {
            obj.angle += 0.05;
            ctx.save();
            ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
            ctx.rotate(obj.angle); // Spin

            // Draw Martı Logo-ish (Diamond shape)
            ctx.fillStyle = obj.color;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(12, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-12, 0);
            ctx.fill();

            // Inner Bolt
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(-2, -5);
            ctx.lineTo(4, 0);
            ctx.lineTo(-2, 5);
            ctx.fill();

            ctx.restore();
        } else {
            // Cloud Obstacle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(obj.x + 15, obj.y + 15, 15, 0, Math.PI*2);
            ctx.arc(obj.x + 35, obj.y + 15, 12, 0, Math.PI*2);
            ctx.arc(obj.x + 25, obj.y + 5, 15, 0, Math.PI*2);
            ctx.fill();
        }

        // Collision
        // Simple circle/box collision
        if (
            bird.x < obj.x + obj.w &&
            bird.x + bird.width > obj.x &&
            bird.y < obj.y + obj.h &&
            bird.y + bird.height > obj.y
        ) {
            if (obj.type === 'collectible') {
                score += 50;
                spawnText(obj.x, obj.y, "+50");
                spawnParticle(obj.x, obj.y, '#26D07C');
                gameObjects.splice(i, 1);
            } else {
                // Obstacle Hit
                // Don't kill, just push back/shake
                spawnText(bird.x, bird.y, "Ups!");
                score = Math.max(0, score - 10);
                bird.velocity = 5; // knock down
                bird.x -= 5; // knock back
                setTimeout(() => { if(bird.x < 60) bird.x = 60; }, 200);
                gameObjects.splice(i, 1);
            }
        }

        if (obj.x + obj.w < 0) {
            gameObjects.splice(i, 1);
        }
    }

    // Return bird to position if knocked back
    if(bird.x < 60) bird.x += 0.5;
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
    e.stopPropagation();
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
    bird.x = 60;
    frames = 0;
    distance = 0;
    score = 0;
    gameObjects = [];
    particles = [];
    texts = [];

    initBackgrounds();
    loop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function loop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Update
    frames++;
    distance += SCROLL_SPEED;

    updateDrawBackgrounds();

    spawnGameObject();
    updateDrawGameObjects();

    bird.update();
    bird.draw();

    updateDrawParticles();
    updateDrawTexts();

    // UI Update
    document.getElementById('score').innerText = score;
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
initBackgrounds();
updateDrawBackgrounds();
bird.draw();

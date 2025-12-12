const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START';
let frames = 0;
let distance = 0;
let score = 0;
const MAX_DISTANCE = 2500; // Increased slightly for more play time

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
let currentScrollSpeed = 3;
const BASE_SCROLL_SPEED = 3;
const TURBO_SCROLL_SPEED = 6;

// Combo System
let comboCount = 0;
let comboTimer = 0;

// Assets
const bird = {
    x: 60,
    y: HEIGHT / 2,
    velocity: 0,
    width: 36,
    height: 24,
    angle: 0,
    trailTimer: 0,
    turboTimer: 0, // > 0 means Turbo Mode is active

    update: function() {
        if (gameState !== 'PLAYING') return;

        // Turbo Logic
        if (this.turboTimer > 0) {
            this.turboTimer--;
            currentScrollSpeed = TURBO_SCROLL_SPEED;
            // Auto-fly / Hover effect in turbo? Or just normal physics?
            // Let's keep physics but make it floatier or faster
        } else {
            currentScrollSpeed = BASE_SCROLL_SPEED;
        }

        // Physics
        if (isTouching) {
            this.velocity += JETPACK_FORCE;
            this.trailTimer++;
            if (this.turboTimer > 0) {
                 if (this.trailTimer % 3 === 0) spawnParticle(this.x, this.y + 15, '#26D07C'); // Green trail
            } else {
                 if (this.trailTimer % 5 === 0) spawnParticle(this.x, this.y + 10, 'white');
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
        if (this.y > HEIGHT - 70) {
            this.y = HEIGHT - 70;
            this.velocity = -4;
        }

        // Angle
        this.angle = Math.min(Math.PI / 5, Math.max(-Math.PI / 5, (this.velocity * 0.05)));
    },

    draw: function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.turboTimer > 0) {
            // DRAW SCOOTER RIDING MODE

            // Scooter Body
            ctx.fillStyle = '#26D07C';
            ctx.fillRect(-10, 15, 30, 4); // Deck
            ctx.fillRect(15, 5, 3, 15); // Stem
            ctx.fillStyle = '#333';
            ctx.fillRect(12, 5, 10, 2); // Handlebars

            // Wheels
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(-5, 20, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(20, 20, 4, 0, Math.PI*2); ctx.fill();

            // Bird on top (shifted up)
            ctx.translate(0, -5);
        }

        // Draw Seagull

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
        const flapSpeed = this.turboTimer > 0 ? 0.5 : 0.2;
        const wingOffset = Math.sin(frames * flapSpeed) * 8;
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(12, -8 + wingOffset);
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

        // Turbo Glow
        if (this.turboTimer > 0) {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#26D07C';
            ctx.fillStyle = 'rgba(38, 208, 124, 0.5)';
            ctx.beginPath();
            ctx.arc(0,0, 30, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'source-over';
        }

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
function spawnText(x, y, text, color = "#FFD700", size = 20) {
    texts.push({
        x: x,
        y: y,
        text: text,
        life: 1.0,
        dy: -1,
        color: color,
        size: size
    });
}
function updateDrawTexts() {
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
        ctx.font = `bold ${t.size}px Arial`;
        ctx.fillStyle = t.color;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;

        ctx.fillText(t.text, t.x, t.y);
        ctx.strokeText(t.text, t.x, t.y);
        ctx.globalAlpha = 1.0;
    }
}

// Parallax Background Layers
const bgLayers = [
    { type: 'sky', speed: 0.5, elements: [] },
    { type: 'bridge', speed: 0.8, x: WIDTH, w: 400 }, // Bridge Layer
    { type: 'far', speed: 1.0, elements: [] },
    { type: 'near', speed: 0, elements: [] } // Speed set dynamically
];

function initBackgrounds() {
    // Generate Far City
    bgLayers[2].elements = [];
    for(let x=0; x<WIDTH+100; x+=30) {
        bgLayers[2].elements.push({
            x: x,
            w: 30,
            h: 50 + Math.random()*80,
            c: '#0a3a5a'
        });
    }
}

function updateDrawBackgrounds() {

    // 2. Bridge (Iconic Bosphorus style)
    let bridge = bgLayers[1];
    bridge.x -= currentScrollSpeed * 0.2; // Move slow

    // Draw Bridge logic
    // If bridge is off screen left, maybe respawn it far right after some time?
    if (bridge.x + bridge.w < -100) {
        if (Math.random() < 0.005) bridge.x = WIDTH + 100; // Random respawn
    }

    ctx.strokeStyle = 'rgba(20, 20, 60, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Cables
    ctx.moveTo(bridge.x, HEIGHT - 50);
    ctx.lineTo(bridge.x + bridge.w / 2, 50); // Tower top
    ctx.lineTo(bridge.x + bridge.w, HEIGHT - 50);
    ctx.stroke();
    // Tower
    ctx.fillStyle = 'rgba(30, 30, 80, 0.5)';
    ctx.fillRect(bridge.x + bridge.w/2 - 10, 50, 20, HEIGHT);


    // 3. Far City
    let layer = bgLayers[2];
    layer.elements.forEach(el => {
        el.x -= currentScrollSpeed * 0.3;
    });
    // Recycle
    if(layer.elements[0].x + layer.elements[0].w < 0) {
         let first = layer.elements.shift();
         first.x = layer.elements[layer.elements.length-1].x + first.w;
         first.h = 50 + Math.random()*80;
         layer.elements.push(first);
    }

    ctx.fillStyle = '#0a3a5a';
    layer.elements.forEach(el => {
        ctx.fillRect(el.x, HEIGHT - 80 - el.h, el.w + 1, el.h + 80);
    });

    // 4. Near City (The floor collider)
    ctx.fillStyle = '#15405e';
    // Moving ground effect
    ctx.fillRect(0, HEIGHT - 60, WIDTH, 60);

    // Building details passing by in foreground
    ctx.fillStyle = '#1e5175';
    for(let i=0; i<10; i++) {
        // use distance for offset
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
    // Spawn faster in Turbo mode
    let rate = bird.turboTimer > 0 ? 30 : 60;

    if (frames % rate === 0) {
        const rand = Math.random();
        const y = 50 + Math.random() * (HEIGHT - 150);

        if (rand > 0.9) {
             // Powerup: Scooter (Rare)
             gameObjects.push({
                type: 'scooter',
                x: WIDTH,
                y: y,
                w: 40,
                h: 30,
                angle: 0
            });
        } else if (rand > 0.4) {
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

        // Magnet Effect in Turbo Mode
        if (bird.turboTimer > 0 && obj.type !== 'obstacle') {
            let dx = bird.x - obj.x;
            let dy = bird.y - obj.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 200) {
                obj.x += (dx / dist) * 10;
                obj.y += (dy / dist) * 10;
            } else {
                obj.x -= currentScrollSpeed;
            }
        } else {
            obj.x -= currentScrollSpeed;
        }

        // Draw
        if (obj.type === 'collectible') {
            obj.angle += 0.05;
            ctx.save();
            ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
            ctx.rotate(obj.angle);

            // Draw Martı Logo-ish
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
        } else if (obj.type === 'scooter') {
            // Draw Powerup Box
            ctx.fillStyle = '#fff';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#26D07C';
            ctx.lineWidth = 3;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

            // Scooter Icon
            ctx.fillStyle = '#26D07C';
            ctx.fillRect(obj.x + 5, obj.y + 20, 30, 5); // Deck
            ctx.fillRect(obj.x + 25, obj.y + 5, 5, 20); // Stem
            ctx.beginPath(); ctx.arc(obj.x+10, obj.y+25, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(obj.x+35, obj.y+25, 4, 0, Math.PI*2); ctx.fill();

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
        if (
            bird.x < obj.x + obj.w &&
            bird.x + bird.width > obj.x &&
            bird.y < obj.y + obj.h &&
            bird.y + bird.height > obj.y
        ) {
            if (obj.type === 'collectible') {
                // Combo Logic
                comboCount++;
                comboTimer = 60; // 1 second window
                let multiplier = Math.min(5, Math.floor(comboCount / 2) + 1);

                let points = 50 * multiplier;
                score += points;

                spawnText(obj.x, obj.y, `+${points}`);
                if (comboCount > 1) spawnText(obj.x, obj.y - 20, `${comboCount}x Combo!`, "#fff", 14);

                spawnParticle(obj.x, obj.y, '#26D07C');
                gameObjects.splice(i, 1);
            } else if (obj.type === 'scooter') {
                // Activate Turbo
                bird.turboTimer = 300; // 5 seconds
                spawnText(bird.x, bird.y - 30, "TURBO MODE!", "#fff", 24);
                spawnParticle(obj.x, obj.y, '#FFD700');
                score += 500;
                gameObjects.splice(i, 1);
            } else {
                // Obstacle Hit
                if (bird.turboTimer > 0) {
                    // Destroy obstacle
                    spawnText(obj.x, obj.y, "SMASH!");
                    spawnParticle(obj.x, obj.y, '#fff');
                    score += 20;
                    gameObjects.splice(i, 1);
                } else {
                    // Penalty
                    spawnText(bird.x, bird.y, "Ups!");
                    score = Math.max(0, score - 10);
                    bird.velocity = 5;
                    bird.x -= 10;
                    comboCount = 0; // Reset combo
                    setTimeout(() => { if(bird.x < 60) bird.x = 60; }, 300);
                    gameObjects.splice(i, 1);
                }
            }
        }

        if (obj.x + obj.w < -50) {
            gameObjects.splice(i, 1);
        }
    }

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
    bird.turboTimer = 0;
    frames = 0;
    distance = 0;
    score = 0;
    comboCount = 0;
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
    distance += currentScrollSpeed;

    if (comboTimer > 0) comboTimer--;
    else comboCount = 0;

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

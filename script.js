const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let speed = 5;
let frames = 0;
let distance = 0;
const MAX_DISTANCE = 1000; // Goal to reach

// Dimensions
const WIDTH = 320;
const HEIGHT = 480;
const SIDEWALK_WIDTH = 20;
const ROAD_WIDTH = WIDTH - (SIDEWALK_WIDTH * 2);
const LANE_WIDTH = ROAD_WIDTH / 3;

// Player (Scooter)
const player = {
    lane: 1, // 0: Left, 1: Center, 2: Right
    y: HEIGHT - 100,
    width: 30,
    height: 60,
    blinkFrames: 0,

    draw: function() {
        if (this.blinkFrames > 0) {
            this.blinkFrames--;
            if (Math.floor(this.blinkFrames / 5) % 2 === 0) return; // Blink effect
        }

        const laneCenterX = SIDEWALK_WIDTH + (this.lane * LANE_WIDTH) + (LANE_WIDTH / 2);
        const x = laneCenterX;
        const y = this.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 65, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rear Wheel
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 4, y + 55, 8, 12);

        // Deck (White part where feet go)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 12, y + 45, 24, 15);
        // Deck detailing (Marti Green stripe)
        ctx.fillStyle = '#26D07C';
        ctx.fillRect(x - 12, y + 45, 24, 4);

        // Stem (Green)
        ctx.fillStyle = '#26D07C';
        ctx.fillRect(x - 3, y + 10, 6, 40);

        // Handlebars (Black)
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 18, y + 10, 36, 4);

        // Grips
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 20, y + 8, 6, 8); // Left
        ctx.fillRect(x + 14, y + 8, 6, 8); // Right

        // Dashboard / Light
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 4, y + 5, 8, 8);
        ctx.fillStyle = '#fff'; // Headlight
        ctx.beginPath();
        ctx.arc(x, y + 9, 2, 0, Math.PI * 2);
        ctx.fill();

        // Light Beam effect
        ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.lineTo(x + 20, y - 100);
        ctx.lineTo(x - 20, y - 100);
        ctx.fill();
    },

    switchLane: function(direction) {
        if (direction === 'left' && this.lane > 0) {
            this.lane--;
        } else if (direction === 'right' && this.lane < 2) {
            this.lane++;
        }
    },

    hit: function() {
        this.blinkFrames = 30; // Blink for 0.5 sec
        // Maybe slow down logic here if desired
    }
};

// Objects (Obstacles & Collectibles)
let gameObjects = [];

class GameObject {
    constructor(type, lane) {
        this.type = type; // 'obstacle' or 'battery'
        this.lane = lane;
        this.y = -50;
        this.width = 40;
        this.height = 40;
        this.markedForDeletion = false;
        this.collected = false; // To prevent double hits
    }

    update() {
        this.y += speed;
        if (this.y > HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        if (this.collected) return;

        const laneCenterX = SIDEWALK_WIDTH + (this.lane * LANE_WIDTH) + (LANE_WIDTH / 2);
        const x = laneCenterX - (this.width / 2);

        if (this.type === 'obstacle') {
            // Draw a Puddle/Hole/Cone
            ctx.fillStyle = '#555'; // Dark grey hole
            ctx.beginPath();
            ctx.ellipse(x + 20, this.y + 20, 18, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Water reflection
            ctx.fillStyle = '#777';
            ctx.beginPath();
            ctx.ellipse(x + 15, this.y + 18, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Warning border
            ctx.strokeStyle = '#d00';
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (this.type === 'battery') {
            // Draw Battery
            const bx = x + 10;
            const by = this.y + 5;

            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'gold';

            ctx.fillStyle = '#26D07C'; // Marti Green Battery body
            ctx.fillRect(bx, by, 20, 30);

            ctx.fillStyle = '#aaa'; // Top terminal
            ctx.fillRect(bx + 5, by - 4, 10, 4);

            // Bolt symbol
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(bx + 10, by + 5);
            ctx.lineTo(bx + 16, by + 12);
            ctx.lineTo(bx + 8, by + 12);
            ctx.lineTo(bx + 12, by + 25);
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }
}

// Input Handling
document.getElementById('start-screen').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);

document.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    if (e.key === 'ArrowLeft') player.switchLane('left');
    if (e.key === 'ArrowRight') player.switchLane('right');
});

// Touch/Mouse controls for gameplay
const adContainer = document.getElementById('ad-container');
adContainer.addEventListener('mousedown', handleInput);
adContainer.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    handleInput(e.touches[0]);
}, {passive: false});

function handleInput(e) {
    if (gameState !== 'PLAYING') return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const centerX = rect.width / 2;

    if (x < centerX) {
        player.switchLane('left');
    } else {
        player.switchLane('right');
    }
}

function startGame(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    gameState = 'PLAYING';
    score = 0;
    speed = 5;
    distance = 0;
    gameObjects = [];
    frames = 0;
    loop();
}

function resetGame() {
    startGame();
}

function gameWin() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    // Change text for success if needed dynamically, but HTML static is fine for now
    document.getElementById('final-score').innerText = 'Puan: ' + score;
}

function spawnObject() {
    // Spawn rate increases with score/time
    let spawnRate = 40;
    if (score > 50) spawnRate = 30;
    if (score > 100) spawnRate = 25;

    if (frames % spawnRate === 0) {
        const lane = Math.floor(Math.random() * 3);
        const type = Math.random() > 0.3 ? 'obstacle' : 'battery'; // 70% obstacles

        // Prevent spawn on top of another object
        const lastObj = gameObjects[gameObjects.length - 1];
        if (lastObj && lastObj.lane === lane && lastObj.y < 100) {
            const newLane = (lane + 1) % 3;
             gameObjects.push(new GameObject(type, newLane));
        } else {
            gameObjects.push(new GameObject(type, lane));
        }
    }
}

function checkCollisions() {
    const laneCenterX = SIDEWALK_WIDTH + (player.lane * LANE_WIDTH) + (LANE_WIDTH / 2);
    const playerHitbox = {
        x: laneCenterX - 15, // width 30
        y: player.y,
        width: 30,
        height: 60
    };

    gameObjects.forEach(obj => {
        if (obj.collected) return; // Already interacted

        const laneCenterX_Obj = SIDEWALK_WIDTH + (obj.lane * LANE_WIDTH) + (LANE_WIDTH / 2);
        const objX = laneCenterX_Obj - (obj.width / 2);

        const pPadding = 5;
        const oPadding = 5;

        if (
            playerHitbox.x + pPadding < objX + obj.width - oPadding &&
            playerHitbox.x + playerHitbox.width - pPadding > objX + oPadding &&
            playerHitbox.y + pPadding < obj.y + obj.height - oPadding &&
            playerHitbox.height + playerHitbox.y - pPadding > obj.y
        ) {
            // Collision detected
            if (obj.type === 'obstacle') {
                // NO GAME OVER
                // Just visual feedback and maybe point reduction
                if (player.blinkFrames === 0) { // Only if not already invincible
                    player.hit();
                    score = Math.max(0, score - 5); // Penalty
                    obj.collected = true; // "Used up" the obstacle so it doesn't hit again
                }
            } else if (obj.type === 'battery') {
                score += 10;
                obj.markedForDeletion = true;
                obj.collected = true;
            }
        }
    });
}

function drawBackground() {
    // Sidewalks
    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, SIDEWALK_WIDTH, HEIGHT);
    ctx.fillRect(WIDTH - SIDEWALK_WIDTH, 0, SIDEWALK_WIDTH, HEIGHT);

    // Sidewalk texture (lines)
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 2;
    const offset = (frames * speed) % 40;
    for (let i = -40; i < HEIGHT; i += 40) {
        const y = i + offset;
        ctx.beginPath();
        // Left
        ctx.moveTo(0, y);
        ctx.lineTo(SIDEWALK_WIDTH, y);
        // Right
        ctx.moveTo(WIDTH - SIDEWALK_WIDTH, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }

    // Road
    ctx.fillStyle = '#444';
    ctx.fillRect(SIDEWALK_WIDTH, 0, ROAD_WIDTH, HEIGHT);

    // Lane markers
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([30, 30]);
    ctx.lineWidth = 4;
    ctx.lineDashOffset = -frames * speed; // Moving effect

    const lane1X = SIDEWALK_WIDTH + LANE_WIDTH;
    const lane2X = SIDEWALK_WIDTH + 2 * LANE_WIDTH;

    ctx.beginPath();
    ctx.moveTo(lane1X, 0);
    ctx.lineTo(lane1X, HEIGHT);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lane2X, 0);
    ctx.lineTo(lane2X, HEIGHT);
    ctx.stroke();

    ctx.setLineDash([]);
}

function loop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Update
    frames++;
    distance += speed / 10; // Increment distance
    speed += 0.002;
    if (speed > 12) speed = 12;

    // Check Win Condition
    if (distance >= MAX_DISTANCE) {
        gameWin();
        return;
    }

    // Increase score based on distance too
    if (frames % 10 === 0) score++;

    spawnObject();

    gameObjects.forEach(obj => obj.update());
    gameObjects = gameObjects.filter(obj => !obj.markedForDeletion);

    checkCollisions();

    // Draw
    drawBackground();

    gameObjects.forEach(obj => obj.draw());
    player.draw();

    // UI Update
    document.getElementById('score').innerText = score;
    const progressPct = Math.min(100, (distance / MAX_DISTANCE) * 100);
    document.getElementById('progress-bar').style.width = progressPct + '%';

    requestAnimationFrame(loop);
}

// Initial Draw (Background)
drawBackground();
player.draw();

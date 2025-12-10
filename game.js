// Conservative, robust version with loading and debug info

const CANVAS_W = 360;
const CANVAS_H = 640;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// Asset names (place these files beside HTML)
const ASSETS = {
  bg: 'flappybirdbg.png',
  bird: 'Adobe Express - file.png',
  topPipe: 'toppipe.png',
  bottomPipe: 'bottompipe.png',
  fartSound: document.getElementById('fartSound') // audio element
};

let images = {};
let imagesToLoad = Object.keys(ASSETS).filter(k => k !== 'fartSound').length;
let loadedCount = 0;
let debug = true;

function log(...args){ if(debug) console.log(...args); }

// load images
for (let key of Object.keys(ASSETS)) {
  if (key === 'fartSound') continue;
  const img = new Image();
  img.src = ASSETS[key];
  img.onload = () => {
    images[key] = img;
    loadedCount++;
    log(`Loaded ${key} (${loadedCount}/${imagesToLoad})`);
    let audioEnabled = false;
function enableAudioOnGesture() {
  if(audioEnabled) return;
  ASSETS.fartSound.play().then(() => {
    ASSETS.fartSound.pause();
    ASSETS.fartSound.currentTime = 0;
    audioEnabled = true;
  }).catch(() => {
    audioEnabled = true;
  });
}
window.addEventListener('touchstart', enableAudioOnGesture, { once:true });
window.addEventListener('mousedown', enableAudioOnGesture, { once:true });

    if (loadedCount === imagesToLoad) onAllAssetsLoaded();
  }
  img.onerror = (e) => {
    console.error(`Failed to load asset ${ASSETS[key]}. Make sure the file exists and path correct.`);
  };
}

// game state
let bird = {
  x: CANVAS_W / 5,
  y: CANVAS_H / 1,
  width: 80,   // bigger
  height: 80,  // bigger (better face visibility)
  velY: 0
};

// SLOWER + SMOOTHER physics
const GRAVITY = 0.45;   // was 1
const JUMP_V = -6.5;    // was -9
const VELOCITY_X = -2.5; // was -4


let pipes = []; // array of {x,y,width,height,img,passed}
let pipeWidth = 64;
let pipeHeight = 512;
let placePipeInterval = null;

let score = 0;
let gameOver = false;

let showFart = false;
let fartStart = 0;
const FART_DURATION = 120; // ms

// Ensure audio allowed on mobile: wait for first gesture
let audioEnabled = false;
function enableAudioOnGesture() {
  if(audioEnabled) return;
  try {
    ASSETS.fartSound.play().then(()=> {
      ASSETS.fartSound.pause();
      ASSETS.fartSound.currentTime = 0;
      audioEnabled = true;
      log("Audio unlocked");
    }).catch(()=> {
      // still mark enabled; play on user action later will succeed
      audioEnabled = true;
      log("Audio unlocked (promise rejected)");
    });
  } catch (e) {
    audioEnabled = true;
  }
  window.removeEventListener('touchstart', enableAudioOnGesture);
  window.removeEventListener('mousedown', enableAudioOnGesture);
}
window.addEventListener('touchstart', enableAudioOnGesture, { once:true });
window.addEventListener('mousedown', enableAudioOnGesture, { once:true });

// Called when all images loaded
function onAllAssetsLoaded() {
  log("All images loaded, starting game.");
  // set bird image dimensions to our desired size if intrinsic differs
  // draw bird with aspect preserved
if (images.bird) {
   ctx.drawImage(images.bird, bird.x, bird.y, bird.width, bird.height);
}


  startGame();
}

// create a pipe pair (top and bottom)
function placePipes() {
  const randomPipeY = Math.floor(- pipeHeight/4 - Math.random() * (pipeHeight/2));
  const openingSpace = Math.floor(CANVAS_H / 4);

  const top = {
    img: images.topPipe,
    x: CANVAS_W,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  };
  const bottom = {
    img: images.bottomPipe,
    x: CANVAS_W,
    y: top.y + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  };
  pipes.push(top, bottom);
}

// reset game
function resetGame() {
  bird.y = CANVAS_H / 2;
  bird.velY = 0;
  pipes = [];
  score = 0;
  gameOver = false;
  // restart pipe placement if needed
  if (placePipeInterval) {
    clearInterval(placePipeInterval);
    placePipeInterval = setInterval(() => { if(!gameOver) placePipes(); }, 1500);
  } else {
    placePipeInterval = setInterval(() => { if(!gameOver) placePipes(); }, 1500);
  }
  log("Game reset");
}

// play fart sound safely
function playFart() {
  if(!audioEnabled) {
    // try to enable quickly (in case user gesture)
    enableAudioOnGesture();
  }
  try {
    ASSETS.fartSound.currentTime = 0;
    ASSETS.fartSound.play().catch((err)=> {
      // ignore, maybe blocked
      log("Fart play error:", err);
    });
  } catch (e) {
    log("Error playing fart", e);
  }
}

// jump handler (tap / space)
function jumpHandler(evt) {
  // prevent page scroll on touch
  if (evt && evt.type === 'touchstart') evt.preventDefault();

  if (gameOver) {
    resetGame();
  }
  // simulate same thrust
  bird.velY = JUMP_V;

  // show fart image
  showFart = true;
  fartStart = Date.now();

  // play sound
  playFart();
}

// collision detection (AABB)
function collision(a, b) {
  return (a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y);
}

// update physics
function update(delta) {
  if (gameOver) return;

  bird.velY += GRAVITY;
  bird.y += bird.velY;

  if (bird.y < 0) bird.y = 0;
  if (bird.y > CANVAS_H) gameOver = true;

  for (let p of pipes) {
    p.x += VELOCITY_X;

    // score when bird passes pipe pair; note original logic increments 0.5 for each pipe
    if (!p.passed && bird.x > p.x + p.width) {
      score += 0.5;
      p.passed = true;
    }

    if (collision(bird, p)) {
      gameOver = true;
    }
  }

  // remove pipes offscreen
  pipes = pipes.filter(p => p.x + p.width > -50);
}

// draw everything
function draw() {
  // background
  if (images.bg) ctx.drawImage(images.bg, 0, 0, CANVAS_W, CANVAS_H);
  else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  }

  // draw bird
  if (images.bird) ctx.drawImage(images.bird, bird.x, bird.y, bird.width, bird.height);
  else {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
  }

  // pipes
  for (let p of pipes) {
    if (p.img) ctx.drawImage(p.img, p.x, p.y, p.width, p.height);
    else {
      ctx.fillStyle = 'green';
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }

  // fart effect bottom-right for FART_DURATION ms
  if (showFart && (Date.now() - fartStart) < FART_DURATION) {
    if (images.fart) ctx.drawImage(images.fart, CANVAS_W - 80, CANVAS_H - 80, 60, 60);
  } else {
    showFart = false;
  }

  // draw score
  ctx.fillStyle = 'white';
  ctx.font = '32px Arial';
  if (gameOver) ctx.fillText('Game Over: ' + Math.floor(score), 10, 40);
  else ctx.fillText(Math.floor(score), 10, 40);
}

// main loop via requestAnimationFrame
let lastTime = performance.now();
function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  update(delta);
  draw();

  requestAnimationFrame(loop);
}

// start the game once assets loaded
function startGame() {
  log("Starting main loop, enabling pipe placement.");
  // start placing pipes (if not already)
  if (!placePipeInterval) {
    placePipeInterval = setInterval(() => { if(!gameOver) placePipes(); }, 1500);
  }
  // begin RAF
  requestAnimationFrame(loop);
}

// controls
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    jumpHandler(e);
  }
});
window.addEventListener('mousedown', jumpHandler);
window.addEventListener('touchstart', jumpHandler, { passive:false });

// show console hint
log('Files required: flappybirdbg.png, toppipe.png, bottompipe.png, bird.png, fart.png, fart.mp3');
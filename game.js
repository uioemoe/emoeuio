const player = document.getElementById("player");
const game = document.getElementById("game");
const scoreEl = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOver");

let isJumping = false;
let gravity = 0.9;
let score = 0;
let speed = 6;
let gameRunning = true;

// Jump
function jump() {
  if (isJumping) return;
  let position = 0;
  isJumping = true;

  let upInterval = setInterval(() => {
    if (position >= 140) {
      clearInterval(upInterval);
      let downInterval = setInterval(() => {
        if (position <= 0) {
          clearInterval(downInterval);
          isJumping = false;
        }
        position -= 5;
        player.style.bottom = 120 + position + "px";
      }, 20);
    }
    position += 6;
    player.style.bottom = 120 + position + "px";
  }, 20);
}

// Controls
document.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});
document.addEventListener("touchstart", jump);

// Obstacles
function createObstacle() {
  if (!gameRunning) return;

  const obstacle = document.createElement("div");
  obstacle.classList.add("obstacle");
  obstacle.style.left = "100%";
  game.appendChild(obstacle);

  let obstacleInterval = setInterval(() => {
    if (!gameRunning) {
      clearInterval(obstacleInterval);
      return;
    }

    let left = obstacle.offsetLeft - speed;
    obstacle.style.left = left + "px";

    if (left < -40) {
      obstacle.remove();
      clearInterval(obstacleInterval);
    }

    // Collision
    if (
      left < 130 &&
      left > 40 &&
      player.offsetTop + 50 > obstacle.offsetTop
    ) {
      endGame();
    }
  }, 20);

  setTimeout(createObstacle, Math.random() * 2000 + 1000);
}

// Coins
function createCoin() {
  if (!gameRunning) return;

  const coin = document.createElement("div");
  coin.classList.add("coin");
  coin.style.left = "100%";
  game.appendChild(coin);

  let coinInterval = setInterval(() => {
    let left = coin.offsetLeft - speed;
    coin.style.left = left + "px";

    if (left < -30) {
      coin.remove();
      clearInterval(coinInterval);
    }

    if (
      left < 130 &&
      left > 40 &&
      player.offsetTop < coin.offsetTop + 25
    ) {
      score += 10;
      scoreEl.innerText = "Score: " + score;
      coin.remove();
      clearInterval(coinInterval);
    }
  }, 20);

  setTimeout(createCoin, 1500);
}

// Score loop
setInterval(() => {
  if (!gameRunning) return;
  score++;
  speed += 0.002;
  scoreEl.innerText = "Score: " + score;
}, 100);

// Game over
function endGame() {
  gameRunning = false;
  gameOverScreen.style.display = "flex";
}

// Restart
function restart() {
  location.reload();
}

// Start
createObstacle();
createCoin();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let roadY = 0;

let player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 120,
  width: 50,
  height: 90,
  speed: 6
};

let enemies = [];

function spawnEnemy() {
  enemies.push({
    x: Math.random() * (canvas.width - 50),
    y: -100,
    width: 50,
    height: 90,
    speed: 5
  });
}

setInterval(spawnEnemy, 1500);

function drawRoad() {
  ctx.fillStyle = "#f4a261";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  roadY += 10;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;

  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, i + roadY);
    ctx.lineTo(canvas.width / 2, i + 20 + roadY);
    ctx.stroke();
  }
}

function drawCar(car, color) {
  ctx.fillStyle = color;
  ctx.fillRect(car.x, car.y, car.width, car.height);
}

function updateEnemies() {
  enemies.forEach(e => {
    e.y += e.speed;
  });
  enemies = enemies.filter(e => e.y < canvas.height + 100);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();
  drawCar(player, "cyan");
  enemies.forEach(e => drawCar(e, "red"));
  updateEnemies();
  requestAnimationFrame(gameLoop);
}

document.getElementById("left").onclick = () => {
  player.x -= player.speed * 5;
};

document.getElementById("right").onclick = () => {
  player.x += player.speed * 5;
};

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") player.x -= player.speed * 5;
  if (e.key === "ArrowRight") player.x += player.speed * 5;
});

gameLoop();
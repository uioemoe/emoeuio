const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const healthText = document.getElementById("health");

let px = 185, py = 185;
let health = 100;

// Move player
function move(dir) {
  if (dir === "up") py -= 15;
  if (dir === "down") py += 15;
  if (dir === "left") px -= 15;
  if (dir === "right") px += 15;

  px = Math.max(0, Math.min(370, px));
  py = Math.max(0, Math.min(370, py));

  player.style.left = px + "px";
  player.style.top = py + "px";
}

// Shoot
function shoot() {
  const bullet = document.createElement("div");
  bullet.className = "bullet";
  bullet.style.left = px + 12 + "px";
  bullet.style.top = py + "px";
  gameArea.appendChild(bullet);

  let by = py;

  const interval = setInterval(() => {
    by -= 10;
    bullet.style.top = by + "px";

    document.querySelectorAll(".enemy").forEach(enemy => {
      if (bullet.getBoundingClientRect().intersectsWith(enemy.getBoundingClientRect())) {
        enemy.remove();
        bullet.remove();
        clearInterval(interval);
      }
    });

    if (by < 0) {
      bullet.remove();
      clearInterval(interval);
    }
  }, 30);
}

// Spawn enemies
setInterval(() => {
  const enemy = document.createElement("div");
  enemy.className = "enemy";
  enemy.style.left = Math.random() * 370 + "px";
  enemy.style.top = "0px";
  gameArea.appendChild(enemy);

  let ey = 0;

  const moveEnemy = setInterval(() => {
    ey += 2;
    enemy.style.top = ey + "px";

    if (enemy.getBoundingClientRect().intersectsWith(player.getBoundingClientRect())) {
      health -= 10;
      healthText.innerText = "Health: " + health;
      enemy.remove();
      clearInterval(moveEnemy);
      if (health <= 0) alert("Game Over");
    }

    if (ey > 400) {
      enemy.remove();
      clearInterval(moveEnemy);
    }
  }, 50);
}, 2000);

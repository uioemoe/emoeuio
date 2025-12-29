const dog = document.getElementById("dog");
const obstacle = document.getElementById("obstacle");
const scoreText = document.getElementById("score");

let score = 0;
let jumping = false;

function jump() {
  if (jumping) return;
  jumping = true;
  dog.classList.add("jump");

  setTimeout(() => {
    dog.classList.remove("jump");
    jumping = false;
  }, 600);
}

document.addEventListener("keydown", e => {
  if (e.code === "Space") jump();
});

document.addEventListener("touchstart", jump);

setInterval(() => {
  const dogBottom = parseInt(window.getComputedStyle(dog).getPropertyValue("bottom"));
  const obstacleLeft = obstacle.getBoundingClientRect().left;
  const dogRight = dog.getBoundingClientRect().right;

  if (obstacleLeft < dogRight && obstacleLeft > dogRight - 20 && dogBottom < 40) {
    alert("Game Over!\nScore: " + score);
    location.reload();
  }
}, 10);

setInterval(() => {
  score++;
  scoreText.innerText = "Score: " + score;
}, 500);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(
  65, window.innerWidth / window.innerHeight, 0.1, 1000
);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

// Ground with hills
const groundGeo = new THREE.PlaneGeometry(500, 30, 200, 1);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;

const gPos = groundGeo.attributes.position;
for (let i = 0; i < gPos.count; i++) {
  const x = gPos.getX(i);
  gPos.setY(i, Math.sin(x * 0.08) * 3 + Math.cos(x * 0.04) * 2);
}
groundGeo.computeVertexNormals();
scene.add(ground);

// Car
const car = new THREE.Group();

// Body
const body = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 1, 1.2),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
body.position.y = 1.4;
car.add(body);

// Wheels
const wheels = [];
function createWheel(x) {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.5, 18),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.7, 0);
  car.add(w);
  wheels.push(w);
}
createWheel(-0.9);
createWheel(0.9);

scene.add(car);

// Physics
let speed = 0;
let velY = 0;
let gravity = -0.05;

// Game systems
let fuel = 100;
let coins = 0;
let distance = 0;

// UI
const fuelUI = document.getElementById("fuel");
const coinUI = document.getElementById("coins");
const distUI = document.getElementById("dist");

// Controls
let gas = false;
let brake = false;

const gasBtn = document.getElementById("gas");
const brakeBtn = document.getElementById("brake");

gasBtn.ontouchstart = () => gas = true;
gasBtn.ontouchend = () => gas = false;
brakeBtn.ontouchstart = () => brake = true;
brakeBtn.ontouchend = () => brake = false;

window.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") gas = true;
  if (e.key === "ArrowLeft") brake = true;
});
window.addEventListener("keyup", e => {
  if (e.key === "ArrowRight") gas = false;
  if (e.key === "ArrowLeft") brake = false;
});

// Coins
const coinMeshes = [];
const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });

for (let i = 10; i < 480; i += 15) {
  const coin = new THREE.Mesh(coinGeo, coinMat);
  coin.rotation.x = Math.PI / 2;
  coin.position.set(i, 2.5, 0);
  scene.add(coin);
  coinMeshes.push(coin);
}

// Camera
camera.position.set(-6, 5, 6);

// Animate
function animate() {
  requestAnimationFrame(animate);

  if (fuel > 0) {
    if (gas) {
      speed += 0.015;
      fuel -= 0.05;
    }
    if (brake) speed -= 0.02;
  }

  speed *= 0.985;
  velY += gravity;

  car.position.y += velY;
  if (car.position.y < 1.4) {
    car.position.y = 1.4;
    velY = 0;
  }

  car.position.x += speed;
  distance = Math.max(distance, Math.floor(car.position.x));

  // Wheels rotate
  wheels.forEach(w => w.rotation.x -= speed * 2);

  // Coin collision
  coinMeshes.forEach((coin, i) => {
    if (coin && car.position.distanceTo(coin.position) < 1.2) {
      scene.remove(coin);
      coinMeshes[i] = null;
      coins += 10;
    }
  });

  // Camera follow
  camera.position.x = car.position.x - 7;
  camera.lookAt(car.position);

  // UI update
  fuelUI.innerText = Math.max(0, fuel.toFixed(0));
  coinUI.innerText = coins;
  distUI.innerText = distance;

  renderer.render(scene, camera);
}

animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

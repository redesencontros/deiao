/* ================= BUTTON ================= */

const btn = document.getElementById("revealBtn");
const content = document.getElementById("contentDisplay");

btn.addEventListener("click", () => {
  content.style.visibility = "visible";
  content.textContent = "DANÇA!";
});

/* ================= MURMURATION ================= */

const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const BOID_COUNT = 3000;
const boids = [];

let time = 0;
let frame = 0;

const entrySide = Math.floor(Math.random() * 4);

const perception = 40;
const cellSize = perception;
let grid = {};

function buildGrid() {
  grid = {};
  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];
    const cx = Math.floor(b.x / cellSize);
    const cy = Math.floor(b.y / cellSize);
    const key = cx + "," + cy;
    if (!grid[key]) grid[key] = [];
    grid[key].push(b);
  }
}

function getNearbyBoids(boid) {
  const cx = Math.floor(boid.x / cellSize);
  const cy = Math.floor(boid.y / cellSize);
  let neighbors = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const key = (cx + x) + "," + (cy + y);
      if (grid[key]) neighbors = neighbors.concat(grid[key]);
    }
  }
  return neighbors;
}

class Boid {
  constructor() {
    const clusterRadius = 260;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * clusterRadius;
    const far = 600;

    if (entrySide === 0) {
      this.x = -far + Math.cos(angle) * r;
      this.y = height / 2 + Math.sin(angle) * r;
      this.vx = 3.5;
      this.vy = (Math.random() - 0.5) * 0.4;
    }

    if (entrySide === 1) {
      this.x = width + far + Math.cos(angle) * r;
      this.y = height / 2 + Math.sin(angle) * r;
      this.vx = -3.5;
      this.vy = (Math.random() - 0.5) * 0.4;
    }

    if (entrySide === 2) {
      this.x = width / 2 + Math.cos(angle) * r;
      this.y = -far + Math.sin(angle) * r;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = 3.5;
    }

    if (entrySide === 3) {
      this.x = width / 2 + Math.cos(angle) * r;
      this.y = height + far + Math.sin(angle) * r;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -3.5;
    }
  }

  update() {
    let alignX = 0, alignY = 0;
    let cohesionX = 0, cohesionY = 0;
    let separationX = 0, separationY = 0;
    let count = 0;

    const perceptionSq = perception * perception;
    const neighbors = getNearbyBoids(this);

    for (let other of neighbors) {
      if (other === this) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < perceptionSq) {
        alignX += other.vx;
        alignY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;

        if (distSq < 60) {
          separationX -= dx;
          separationY -= dy;
        }
        count++;
      }
    }

    if (count > 0) {
      alignX /= count;
      alignY /= count;
      cohesionX /= count;
      cohesionY /= count;

      this.vx += (alignX - this.vx) * 0.05;
      this.vy += (alignY - this.vy) * 0.05;
      this.vx += (cohesionX - this.x) * 0.001;
      this.vy += (cohesionY - this.y) * 0.001;
      this.vx += separationX * 0.02;
      this.vy += separationY * 0.02;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.fillRect(this.x | 0, this.y | 0, 1, 1);
  }
}

for (let i = 0; i < BOID_COUNT; i++) {
  boids.push(new Boid());
}

function animate() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "white";

  frame++;
  buildGrid();

  for (let i = 0; i < boids.length; i++) {
    if (i % 4 === frame % 4) boids[i].update();
    boids[i].draw();
  }

  requestAnimationFrame(animate);
}

animate();

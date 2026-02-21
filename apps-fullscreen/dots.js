(function() {

if (window.__DOTS_RUNNING__) return;
window.__DOTS_RUNNING__ = true;

let animationId;
let destroyed = false;

const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/* =========================
   CANVAS SETUP
========================= */

const trailCanvas = document.createElement("canvas");
const trailCtx = trailCanvas.getContext("2d");

const dotCanvas = document.createElement("canvas");
const dotCtx = dotCanvas.getContext("2d");
   console.log(trailCtx);
console.log(dotCtx);

trailCanvas.style.position = "fixed";
dotCanvas.style.position = "fixed";

trailCanvas.style.top = dotCanvas.style.top = "0";
trailCanvas.style.left = dotCanvas.style.left = "0";

trailCanvas.style.width = dotCanvas.style.width = "100vw";
trailCanvas.style.height = dotCanvas.style.height = "100vh";

trailCanvas.style.pointerEvents = "none";
dotCanvas.style.pointerEvents = "none";

trailCanvas.style.zIndex = "0";
dotCanvas.style.zIndex = "1";

document.body.appendChild(trailCanvas);
document.body.appendChild(dotCanvas);

function resizeCanvas() {
  trailCanvas.width = dotCanvas.width = window.innerWidth;
  trailCanvas.height = dotCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* =========================
   CURSOR
========================= */

const cursor = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2
};

let idleTimer = 0;

function updatePointer(e) {
  if (e.touches && e.touches.length > 0) {
    cursor.x = e.touches[0].clientX;
    cursor.y = e.touches[0].clientY;
  } else {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  }
  idleTimer = 0;
}

window.addEventListener("mousemove", updatePointer);
window.addEventListener("touchstart", updatePointer, { passive: true });
window.addEventListener("touchmove", updatePointer, { passive: true });

/* =========================
   DOT CLASS
========================= */

class Dot {
  constructor(x, y, color, baseMaxSpeed, maxForce, orbitRadius) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    this.radius = 7;
    this.color = color;

    this.baseMaxSpeed = baseMaxSpeed;
    this.maxForce = maxForce;
    this.orbitRadius = orbitRadius;

    this.orbitAngle = Math.random() * Math.PI * 2;
    this.above = Math.random() < 0.5;

    this.trail = [];
    this.frameCounter = 0;
  }

  update(dots) {
    const dx = cursor.x - this.x;
    const dy = cursor.y - this.y;

    const distSq = dx*dx + dy*dy;
    const maxDistance = 400;
    const distanceFactor = Math.min(Math.sqrt(distSq) / maxDistance, 1);
    const dynamicMaxSpeed = this.baseMaxSpeed * (0.7 + distanceFactor);

    if (idleTimer > 120) {
      this.orbitAngle += 0.01;
      const tx = cursor.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const ty = cursor.y + Math.sin(this.orbitAngle) * this.orbitRadius;
      this.seek(tx - this.x, ty - this.y, dynamicMaxSpeed);
    } else {
      this.seek(dx, dy, dynamicMaxSpeed);
    }

    if (!IS_MOBILE) this.separate(dots);
    if (IS_MOBILE) this.separateMobile(dots);

    const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (speed > dynamicMaxSpeed) {
      this.vx = (this.vx/speed) * dynamicMaxSpeed;
      this.vy = (this.vy/speed) * dynamicMaxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.frameCounter++;

    if (this.frameCounter % 2 === 0) {
      this.trail.push({
        x: this.x,
        y: this.y,
        time: performance.now()
      });
    }

    if (this.trail.length > 60) this.trail.shift();
  }

  seek(dx, dy, maxSpeed) {
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist === 0) return;

    dx = (dx/dist) * maxSpeed;
    dy = (dy/dist) * maxSpeed;

    let steerX = dx - this.vx;
    let steerY = dy - this.vy;

    const steerMag = Math.sqrt(steerX*steerX + steerY*steerY);
    if (steerMag > this.maxForce) {
      steerX = (steerX/steerMag) * this.maxForce;
      steerY = (steerY/steerMag) * this.maxForce;
    }

    this.vx += steerX;
    this.vy += steerY;
  }

  separate(dots) {
    const minDistance = this.radius * 3.5;

    for (let other of dots) {
      if (other === this) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist > 0 && dist < minDistance) {
        const overlap = minDistance - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        this.x += nx * overlap * 0.5;
        this.y += ny * overlap * 0.5;

        other.x -= nx * overlap * 0.5;
        other.y -= ny * overlap * 0.5;
      }
    }
  }

  drawDot(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  drawTrail(now) {
    if (this.trail.length < 2) return;

    trailCtx.beginPath();
    trailCtx.lineWidth = 0.05;
    trailCtx.strokeStyle = "white";

    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const age = now - p.time;

      if (age > 3000) {
        this.trail.splice(i, 1);
        i--;
        continue;
      }

      let alpha = 1;
      if (age > 3000) {
        const fade = (age - 3000) / 3000;
        alpha = 1 - fade;
      }

      trailCtx.globalAlpha = alpha;

      if (i === 0) trailCtx.moveTo(p.x, p.y);
      else trailCtx.lineTo(p.x, p.y);
    }

    trailCtx.stroke();
    trailCtx.globalAlpha = 1;
  }
}

/* =========================
   CREATE DOTS
========================= */

function randomInCloud(radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * radius;
  return {
    x: window.innerWidth / 2 + Math.cos(angle) * r,
    y: window.innerHeight / 2 + Math.sin(angle) * r
  };
}

const colors = [
  "rgb(255,80,80)",
  "rgb(80,150,255)",
  "rgb(80,255,150)",
  "rgb(200,100,255)",
  "rgb(255,200,80)"
];

const dots = colors.map((color, index) => {
  const p = randomInCloud(150);
  return new Dot(
    p.x,
    p.y,
    color,
    2 + Math.random(),
    0.08,
    50
  );
});

/* =========================
   ANIMATION LOOP
========================= */

function animate() {
  if (destroyed) return;

  idleTimer++;
  const now = performance.now();

  dotCtx.clearRect(0, 0, dotCanvas.width, dotCanvas.height);
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

  for (let dot of dots) dot.update(dots);
  for (let dot of dots) if (!dot.above) dot.drawDot(dotCtx);
  for (let dot of dots) dot.drawTrail(now);
  for (let dot of dots) if (dot.above) dot.drawDot(dotCtx);

  animationId = requestAnimationFrame(animate);
}

animationId = requestAnimationFrame(animate);

window.__destroyDots = function() {

  destroyed = true;

  cancelAnimationFrame(animationId);

  window.removeEventListener("mousemove", updatePointer);
  window.removeEventListener("touchstart", updatePointer);
  window.removeEventListener("touchmove", updatePointer);

  trailCanvas.remove();
  dotCanvas.remove();

  window.__DOTS_RUNNING__ = false;
};


})();






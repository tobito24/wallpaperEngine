import { TILE_SIZE } from './config.js';
import World from './world.js';
import Player from './player.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const world = new World();
const player = new Player(0, 0);

const view = {
  width: 0,
  height: 0,
  dpr: 1
};
let transformDirty = true;

function resize() {
  view.width = window.innerWidth;
  view.height = window.innerHeight;
  view.dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${view.width}px`;
  canvas.style.height = `${view.height}px`;
  canvas.width = Math.floor(view.width * view.dpr);
  canvas.height = Math.floor(view.height * view.dpr);
  transformDirty = true;
}

function update(dt) {
  world.update(dt);
  player.update(world, dt);
}

function drawBackground() {
  ctx.fillStyle = '#0f1b14';
  ctx.fillRect(0, 0, view.width, view.height);
}

function getCamera() {
  const px = player.worldX * TILE_SIZE + TILE_SIZE / 2;
  const py = player.worldY * TILE_SIZE + TILE_SIZE / 2;
  return {
    x: px - view.width / 2,
    y: py - view.height / 2
  };
}

function render() {
  if (transformDirty) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    transformDirty = false;
  }
  ctx.clearRect(0, 0, view.width, view.height);

  const camera = getCamera();
  
  drawBackground();
  world.render(ctx, view, camera);
  player.render(ctx, view);
}

let lastTime = performance.now();
function tick(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000);
  lastTime = time;

  update(dt);
  render();
  requestAnimationFrame(tick);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(tick);

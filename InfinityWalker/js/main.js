import {
  TILE_SIZE,
  setTileSize,
  toggleDebugMode,
} from './config.js';
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
  ctx.imageSmoothingEnabled = false;
  transformDirty = true;
}

function keyHandler(e) {
  switch (e.key) {
    case 'q':
      setTileSize(TILE_SIZE + 1);
      break;
    case 'e':
      setTileSize(TILE_SIZE - 1);
      break;
    case 'r':
      if (e.type === 'keyup') {
        toggleDebugMode();
      }
    default:
      break;
  }
  player.keyInput(e);
}

function wheelHandler(e) {
  const step = e.deltaY > 0 ? -2 : 2;
  setTileSize(TILE_SIZE + step);
}

function update(dt) {
  world.update(player.worldX, player.worldY);
  player.update(dt);
}

function drawBackground() {
  ctx.fillStyle = '#444';
  ctx.fillRect(0, 0, view.width, view.height);
}

function getCamera() {
  const px = player.x * TILE_SIZE + TILE_SIZE / 2;
  const py = player.y * TILE_SIZE + TILE_SIZE / 2;
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
window.addEventListener('keydown', keyHandler);
window.addEventListener('keyup', keyHandler);
window.addEventListener('wheel', wheelHandler, { passive: true });
resize();
requestAnimationFrame(tick);

import {
  TILE_SIZE,
  SPRITE,
  DIRECTION_VECTORS,
  DIRECTION,
  SPRITE_ROW_DIRECTION
} from './config.js';

export default class Player {
  constructor(startX = 0, startY = 0) {
    this.x = startX;
    this.y = startY;
    this.worldX = startX;
    this.worldY = startY;
    this.currentDirection = DIRECTION.SOUTH;
    this.stepTime = 0;
    this.stepInterval = SPRITE.stepFrames / SPRITE.fps; // seconds per step
    this.moving = false;
    this.fromX = startX;
    this.fromY = startY;
    this.toX = startX;
    this.toY = startY;

    this.sprite = {
      image: new Image(),
      frame: 0,
      acc: 0,
      cols: SPRITE.cols,
      rows: SPRITE.rows
    };

    this.sprite.image.src = SPRITE.sheet;
  }

  update(world, dt) {
    this.stepTime += dt;
    if (!this.moving && this.stepTime >= this.stepInterval) {
      this.stepTime = 0;
      this.move(world);
    }

    // smooth movement update
    if (this.moving) {
      const t = Math.min(1, this.stepTime / this.stepInterval);
      this.worldX = this.fromX + (this.toX - this.fromX) * t;
      this.worldY = this.fromY + (this.toY - this.fromY) * t;
      if (t >= 1) {
        this.moving = false;
        this.x = this.toX;
        this.y = this.toY;
        this.worldX = this.x;
        this.worldY = this.y;
      }
    }

    // Walk animation frame update / current column
    this.sprite.acc += dt;
    if (this.sprite.acc >= 1 / SPRITE.fps) {
      this.sprite.acc = 0;
      this.sprite.frame = (this.sprite.frame + 1) % this.sprite.cols;
    }
  }

  move(world) {
    // check if current direction is valid
    const dirVec = DIRECTION_VECTORS[this.currentDirection];
    const nx = this.x + dirVec.x;
    const ny = this.y + dirVec.y;
    if (world.isPath(nx, ny)) {
      this.fromX = this.x;
      this.fromY = this.y;
      this.toX = nx;
      this.toY = ny;
      this.stepTime = 0;
      this.moving = true;
      return;
    }

    // Shuffle choices
    const availableDirections = [DIRECTION.NORTH, DIRECTION.EAST, DIRECTION.SOUTH, DIRECTION.WEST];
    for (let i = availableDirections.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableDirections[i], availableDirections[j]] = [availableDirections[j], availableDirections[i]];
    }

    for (const direction of availableDirections) {
      const dir = DIRECTION_VECTORS[direction];
      const nx = this.x + dir.x;
      const ny = this.y + dir.y;
      if (world.isPath(nx, ny)) {
        this.fromX = this.x;
        this.fromY = this.y;
        this.toX = nx;
        this.toY = ny;
        this.stepTime = 0;
        this.moving = true;
        this.currentDirection = direction;
        return;
      }
    }
  }

  render(ctx, view) {
    if (!this.sprite.image.complete) {
      return;
    }

    const spriteWidth = this.sprite.image.width / this.sprite.cols;
    const spriteHeight = this.sprite.image.height / this.sprite.rows;

    const sx = this.sprite.frame * spriteWidth;
    const sy = SPRITE_ROW_DIRECTION[this.currentDirection] * spriteHeight;

    const dw = TILE_SIZE * SPRITE.scale;
    const dh = TILE_SIZE * SPRITE.scale;
    const dx = view.width / 2 - dw / 2;
    const dy = view.height / 2 - dh / 2;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sprite.image, sx, sy, spriteWidth, spriteHeight, dx, dy, dw, dh);
  }
}

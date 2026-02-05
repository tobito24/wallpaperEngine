import {
  PLAYER_SPEED,
  PLAYER_START_VECTOR,
  PLAYER_START_AUTO_MOVE,
  PLAYER_AUTO_DIRECTION_CHANGE_INTERVAL,
  PLAYER_MAX_DIRECTION_CHANGE_ANGLE,
} from './config.js';

export default class Player {
  constructor(startX = 0, startY = 0) {
    this.x = startX;
    this.y = startY;
    this.worldX = startX;
    this.worldY = startY;
    this.currentDirectionVector = PLAYER_START_VECTOR;
    this.isAutoMovement = PLAYER_START_AUTO_MOVE;
    this.speed = PLAYER_SPEED;
    this.keysPressed = {
      north: false,
      east: false,
      south: false,
      west: false
    };
    this.timeSinceLastDirectionChange = 0;
  }

  setSpeed(multiplier) {
    this.speed = Math.max(0.5, Math.min(20, multiplier));
  }

  keyInput(event) {
    const isClick = event.type === 'keyup';
    const isDown = event.type === 'keydown';

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        this.keysPressed.north = isDown;
        this.updateDirectionVector();
        break;
      case 'arrowdown':
      case 's':
        this.keysPressed.south = isDown;
        this.updateDirectionVector();
        break;
      case 'arrowleft':
      case 'a':
        this.keysPressed.west = isDown;
        this.updateDirectionVector();
        break;
      case 'arrowright':
      case 'd':
        this.keysPressed.east = isDown;
        this.updateDirectionVector();
        break;
      case ' ':
        isClick ? this.isAutoMovement = !this.isAutoMovement : null;
        break;
      case '+':
      case 'c':
      case '2':
        this.setSpeed(this.speed + 0.5);
        break;
      case '-':
      case 'x':
      case '1':
        this.setSpeed(this.speed - 0.5);
        break;
      default:
        break;
    }
  }

  updateDirectionVector() {
    const isManualMovement = this.keysPressed.north || this.keysPressed.east || this.keysPressed.south || this.keysPressed.west;
    if (!isManualMovement) {
      return;
    }

    const dirVector = { x: 0, y: 0 };
    if (this.keysPressed.north) {
      dirVector.y -= 1;
    }
    if (this.keysPressed.south) {
      dirVector.y += 1;
    }
    if (this.keysPressed.west) {
      dirVector.x -= 1;
    }
    if (this.keysPressed.east) {
      dirVector.x += 1;
    }
    // Normalize vector
    const length = Math.hypot(dirVector.x, dirVector.y);
    if (length > 0) {
      dirVector.x /= length;
      dirVector.y /= length;
    }

    this.currentDirectionVector = dirVector;
  }

  update(dt) {
    const isManualMovement = this.keysPressed.north || this.keysPressed.east || this.keysPressed.south || this.keysPressed.west;
    if (!this.isAutoMovement && !isManualMovement) {
      return;
    }

    if (this.isAutoMovement) {
      this.randomAutoDirectionChange(dt);
    }

    this.x += this.currentDirectionVector.x * this.speed * dt;
    this.y += this.currentDirectionVector.y * this.speed * dt;
    this.worldX = Math.round(this.x);
    this.worldY = Math.round(this.y);
  }

  randomAutoDirectionChange(dt) {
    this.timeSinceLastDirectionChange += dt;
    if (this.timeSinceLastDirectionChange < PLAYER_AUTO_DIRECTION_CHANGE_INTERVAL) {
      return;
    }
    this.timeSinceLastDirectionChange = 0;

    const angleChange = (Math.random() - 0.5) * 2 * PLAYER_MAX_DIRECTION_CHANGE_ANGLE;
    const cos = Math.cos(angleChange);
    const sin = Math.sin(angleChange);

    const dirVector = { x: 0, y: 0 };
    dirVector.x = this.currentDirectionVector.x * cos - this.currentDirectionVector.y * sin;
    dirVector.y = this.currentDirectionVector.x * sin + this.currentDirectionVector.y * cos;

    const length = Math.hypot(dirVector.x, dirVector.y);
    if (length > 0) {
      dirVector.x /= length;
      dirVector.y /= length;
    }

    this.currentDirectionVector = dirVector;
  }
}

import {
  PLAYER_SPEED,
  PLAYER_START_VECTOR,
  PLAYER_START_AUTO_MOVE,
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
  }

  setSpeed(multiplier) {
    this.speed = Math.max(0.5, Math.min(20, multiplier));
  }

  keyInput(event) {
    const isClick = event.type === 'keyup';
    const isDown = event.type === 'keydown';

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        this.keysPressed.north = isDown;
        this.updateDirectionVector();
        break;
      case 'ArrowDown':
      case 's':
        this.keysPressed.south = isDown;
        this.updateDirectionVector();
        break;
      case 'ArrowLeft':
      case 'a':
        this.keysPressed.west = isDown;
        this.updateDirectionVector();
        break;
      case 'ArrowRight':
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

    this.x += this.currentDirectionVector.x * this.speed * dt;
    this.y += this.currentDirectionVector.y * this.speed * dt;
    this.x = Math.round(this.x * 100) / 100;
    this.y = Math.round(this.y * 100) / 100;
    this.worldX = Math.round(this.x);
    this.worldY = Math.round(this.y);
  }
}

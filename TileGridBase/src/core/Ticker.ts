import { TICK_INTERVAL_DEFAULT_MS, MIN_TICK_INTERVAL_MS, MAX_TICK_INTERVAL_MS } from '../config/constants';

export class Ticker {
  tickIntervalMs = TICK_INTERVAL_DEFAULT_MS;
  private accumulatedMs = 0;

  setTickIntervalMs(value: number): void {
    this.tickIntervalMs = Math.min(MAX_TICK_INTERVAL_MS, Math.max(MIN_TICK_INTERVAL_MS, value));
  }

  update(dtMs: number, onTick: () => void): void {
    this.accumulatedMs += dtMs;
    if (this.accumulatedMs < this.tickIntervalMs) return;
    this.accumulatedMs = 0;
    onTick();
  }
}

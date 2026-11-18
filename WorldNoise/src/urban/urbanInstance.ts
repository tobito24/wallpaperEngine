import type { UrbanItem } from './urbanTable';

export interface UrbanInstance {
  readonly item: UrbanItem;
  readonly x: number;
  readonly y: number;
  readonly level: number;
}

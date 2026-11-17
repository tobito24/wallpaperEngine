import { CHUNK_SIZE } from '../config/constants';

export interface JumpTarget {
  readonly x: number;
  readonly y: number;
}

export const JUMP_PROMPT = 'Jump to: "cx,cy" (chunk, as in the debug labels) or "t x,y" (tile)';

const JUMP_PATTERN = /^\s*(c|chunk|t|tile)?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/i;

export function parseJumpTarget(text: string): JumpTarget | null {
  const match = JUMP_PATTERN.exec(text);
  if (!match) return null;
  const isTile = match[1]?.toLowerCase().startsWith('t') ?? false;
  const first = Number(match[2]);
  const second = Number(match[3]);
  if (isTile) return { x: first, y: second };
  return { x: first * CHUNK_SIZE + CHUNK_SIZE / 2, y: second * CHUNK_SIZE + CHUNK_SIZE / 2 };
}

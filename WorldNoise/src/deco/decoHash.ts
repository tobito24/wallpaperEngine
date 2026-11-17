import { SEED } from '../config/constants';

const MIX_MULTIPLIER_A = 0xcc9e2d51;
const MIX_MULTIPLIER_B = 0x1b873593;
const FINISH_MULTIPLIER_A = 0x85ebca6b;
const FINISH_MULTIPLIER_B = 0xc2b2ae35;
const UNIT = 4294967296;

function mix(hash: number, value: number): number {
  let scrambled = Math.imul(value | 0, MIX_MULTIPLIER_A);
  scrambled = (scrambled << 15) | (scrambled >>> 17);
  scrambled = Math.imul(scrambled, MIX_MULTIPLIER_B);
  let next = hash ^ scrambled;
  next = (next << 13) | (next >>> 19);
  return (Math.imul(next, 5) + 0xe6546b64) | 0;
}

function hashOfText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index++) hash = mix(hash, text.charCodeAt(index));
  return hash;
}

const SEED_HASH = hashOfText(`${SEED}:deco`);

export function decoHash(first: number, second: number, third: number, fourth: number): number {
  let hash = SEED_HASH;
  hash = mix(hash, first);
  hash = mix(hash, second);
  hash = mix(hash, third);
  hash = mix(hash, fourth);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, FINISH_MULTIPLIER_A);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, FINISH_MULTIPLIER_B);
  hash ^= hash >>> 16;
  return (hash >>> 0) / UNIT;
}

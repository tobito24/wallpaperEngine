import Alea from 'alea';
import { SEED } from '../config/constants';

export function randomValue(key: string): number {
  return Alea(`${SEED}:${key}`)();
}

/**
 * Compresses a normalized [0,1] value with an exponent curve. exponent > 1 pushes more of the input
 * range toward 0 (more plains, rarer peaks); exponent < 1 does the opposite. exponent === 1 is a no-op.
 */
export function exponentRedistribute(value01: number, exponent: number): number {
  const clamped = Math.min(1, Math.max(0, value01));
  return Math.pow(clamped, exponent);
}

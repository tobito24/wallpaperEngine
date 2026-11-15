export function remember<T>(cache: Map<string, T>, maxEntries: number, key: string, compute: () => T): T {
  const known = cache.get(key);
  if (known !== undefined) return known;

  if (cache.size >= maxEntries) cache.clear();
  const value = compute();
  cache.set(key, value);
  return value;
}

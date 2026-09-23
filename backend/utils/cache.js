const cacheStore = new Map();

export function cacheGet(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiry && Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Returns cached value even if expired (stale), if present.
 * Useful as a graceful fallback during transient external API rate-limiting or network issues.
 */
export function cacheGetStale(key) {
  const entry = cacheStore.get(key);
  return entry ? entry.value : null;
}

export function cacheSet(key, value, ttlSeconds) {
  const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  cacheStore.set(key, { value, expiry });
}

export function cacheDelete(key) {
  cacheStore.delete(key);
}

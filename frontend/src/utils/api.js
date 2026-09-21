import axios from "axios";

// Configurable cache TTL constants (in milliseconds)
export const CACHE_TTLS = {
  QUOTE: 5 * 60 * 1000,        // 5 minutes
  HISTORICAL: 10 * 60 * 1000,  // 10 minutes
  AI_PREDICTION: 10 * 60 * 1000 // 10 minutes
};

const cache = new Map();
const inFlightRequests = new Map();

function getCacheKey(url, params = {}) {
  if (!params || Object.keys(params).length === 0) return url;
  const paramStr = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${url}?${paramStr}`;
}

export function getCachedData(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCachedData(key, data, ttlMs) {
  if (!ttlMs) return;
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(keyPrefixOrExact) {
  for (const key of cache.keys()) {
    if (key === keyPrefixOrExact || key.startsWith(keyPrefixOrExact)) {
      cache.delete(key);
    }
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "https://psycap-udhu.onrender.com/api" : "http://localhost:5000/api"),
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Authentication failed for API request");
    }
    return Promise.reject(error);
  },
);

/**
 * Perform a GET request with in-memory caching and in-flight deduplication.
 * Returns an object with { data: ... } matching standard axios response shape.
 */
export async function fetchWithCache(url, options = {}, ttlMs = 0) {
  const cacheKey = getCacheKey(url, options.params);
  const bypass = options.bypassCache === true;

  if (ttlMs > 0 && !bypass) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
  }

  // Deduplicate concurrent in-flight requests for the same key
  if (inFlightRequests.has(cacheKey) && !bypass) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      const response = await api.get(url, options);
      if (ttlMs > 0) {
        setCachedData(cacheKey, response.data, ttlMs);
      }
      return response;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export default api;

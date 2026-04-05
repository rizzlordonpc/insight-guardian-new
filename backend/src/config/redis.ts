import Redis from 'ioredis';
import { env } from './env';

/**
 * Shared Redis client for rate limiting, session material, and Socket.io pub/sub hooks.
 * `maxRetriesPerRequest: null` is recommended when using this client with rate-limit-redis.
 * `lazyConnect: true` delays connection until explicitly called, so the app boots even if Redis is down.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
});

// Suppress unhandled 'error' events from background reconnect attempts.
// Without this, Node.js crashes if Redis is unavailable, even though
// connectRedis() already handles the initial failure gracefully.
redis.on('error', (err) => {
  if (!redisConnected) return; // expected when Redis is down
  console.warn('[redis] error:', err.message);
});

let redisConnected = false;
export function isRedisConnected(): boolean {
  return redisConnected;
}

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    await redis.ping();
    redisConnected = true;
    console.log('[redis] connected');
  } catch (err) {
    redisConnected = false;
    console.warn('[redis] connection failed — rate limiting will use in-memory fallback', err instanceof Error ? err.message : err);
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisConnected) {
      await redis.quit();
    }
  } catch {
    // best-effort
  }
}

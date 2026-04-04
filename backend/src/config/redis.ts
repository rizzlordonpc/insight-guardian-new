import Redis from 'ioredis';
import { env } from './env';

/**
 * Shared Redis client for rate limiting, session material, and Socket.io pub/sub hooks.
 * `maxRetriesPerRequest: null` is recommended when using this client with rate-limit-redis.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export async function connectRedis(): Promise<void> {
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redis } from '../config/redis';

function redisStore(prefix: string): RedisStore {
  return new RedisStore({
    prefix,
    sendCommand: (...args: string[]): Promise<RedisReply> => {
      const [command, ...rest] = args;
      return redis.call(command, ...rest) as Promise<RedisReply>;
    },
  });
}

/**
 * Strict limiter for /api/auth/login: 10 requests per 15 minutes per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:login:'),
  message: { success: false, error: 'Too many login attempts, try again in 15 minutes' },
});

/**
 * General API limiter: 100 requests per minute per user (keyed by JWT `sub`).
 * Falls back to IP when no JWT is present.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown',
  store: redisStore('rl:api:'),
  message: { success: false, error: 'Too many requests' },
});

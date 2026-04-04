import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Shared Prisma client.
 * In development, logs slow queries (>500 ms) and warnings to the console.
 */
export const prisma = new PrismaClient({
  log: isDev
    ? [
        { level: 'query', emit: 'event' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ]
    : [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
});

if (isDev) {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      console.warn(
        `[prisma] SLOW QUERY (${e.duration}ms): ${e.query} — Params: ${e.params}`,
      );
    }
  });
}

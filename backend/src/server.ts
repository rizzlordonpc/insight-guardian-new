import { createServer } from 'http';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import helmet from 'helmet';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { prisma } from './db/prisma';
import { inputSanitizer } from './middleware/sanitize';
import { apiRateLimiter, loginRateLimiter } from './middleware/rateLimiter';
import { auditLogger } from './middleware/auditLogger';
import { optionalAuth } from './middleware/auth';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import alertsRoutes from './routes/alerts';
import decoysRoutes from './routes/decoys';
import eventsRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';
import { initSockets } from './sockets';
import { HttpError } from './lib/httpError';

const app = express();
const httpServer = createServer(app);

// ── Security headers ───────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());

// ── Body parsing & CORS ────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// ── Input sanitization (strip HTML/script tags before Zod validation) ──────
app.use(inputSanitizer);

// ── Auth (optional on all routes, required per-route where needed) ─────────
app.use(optionalAuth);

// ── Audit log (POST/PUT/PATCH/DELETE with latency tracking) ────────────────
app.use(auditLogger);

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use('/api/auth/login', loginRateLimiter);
app.use('/api', apiRateLimiter);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/decoys', decoysRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// ── Error handler ──────────────────────────────────────────────────────────
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[server] PrismaClientKnownRequestError', err.code, err.meta);
    res.status(400).json({
      success: false,
      error: 'Request could not be completed',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('[server] PrismaClientValidationError', err.message);
    res.status(400).json({
      success: false,
      error: 'Invalid data supplied',
    });
    return;
  }

  console.error('[server] unhandled error', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

app.use(errorHandler);

// ── Sockets ────────────────────────────────────────────────────────────────
const io = initSockets(httpServer);

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await connectRedis();
  await prisma.$connect();

  httpServer.listen(env.PORT, () => {
    console.log(`Insight Guardian API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

void bootstrap();

// ── Graceful shutdown ──────────────────────────────────────────────────────
const DRAIN_TIMEOUT_MS = 30_000;
let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[shutdown] Received ${signal} — starting graceful shutdown…`);

  // 1. Stop accepting new connections
  io.close();
  httpServer.close(async () => {
    console.log('[shutdown] HTTP server closed, draining…');
    try {
      await Promise.all([disconnectRedis(), prisma.$disconnect()]);
      console.log('[shutdown] Redis and Prisma disconnected. Exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[shutdown] Error during cleanup', err);
      process.exit(1);
    }
  });

  // 2. Force exit after drain timeout so we never hang forever
  setTimeout(() => {
    console.error(`[shutdown] Drain timeout (${DRAIN_TIMEOUT_MS}ms) exceeded — forcing exit.`);
    process.exit(1);
  }, DRAIN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

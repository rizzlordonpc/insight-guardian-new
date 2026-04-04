import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import type {
  AccessEvent,
  Alert,
  AppRole,
  DecoyAsset,
  MonitoredUserStatus,
  RiskTrend,
} from '@prisma/client';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env';

/** Socket.io server instance type (alias for `Server` from `socket.io`). */
export type SocketIOServer = Server;

export type SocketAuthUser = {
  id: string;
  email: string;
  appRole: AppRole;
};

declare module 'socket.io' {
  interface SocketData {
    user: SocketAuthUser;
  }
}

type AccessJwtPayload = {
  sub: string;
  email: string;
  appRole: AppRole;
};

let _io: Server | null = null;

function attachJwtAuthMiddleware(io: Server): void {
  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const raw = socket.handshake.auth;
      const token =
        raw && typeof raw === 'object' && 'token' in raw && typeof raw.token === 'string'
          ? raw.token
          : undefined;

      if (!token) {
        next(new Error('Unauthorized: missing auth token'));
        return;
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as AccessJwtPayload;
      if (!payload.sub || !payload.email || payload.appRole === undefined) {
        next(new Error('Unauthorized: invalid token payload'));
        return;
      }

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        appRole: payload.appRole,
      };
      next();
    } catch {
      next(new Error('Unauthorized: invalid or expired token'));
    }
  });
}

/**
 * Bootstraps Socket.io on the HTTP server: CORS, JWT on handshake, connection logging.
 * Call once before `httpServer.listen()`.
 */
export function initSockets(httpServer: HttpServer): SocketIOServer {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  attachJwtAuthMiddleware(io);

  io.on('connection', (socket) => {
    const u = socket.data.user;
    console.log(`[socket] connected ${socket.id} user=${u.id} (${u.email})`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected ${socket.id} user=${u.id} reason=${reason}`);
    });
  });

  _io = io;
  return io;
}

export const emitter = {
  userRiskUpdated(user: {
    id: string;
    name: string;
    riskScore: number;
    riskTrend: RiskTrend;
    status: MonitoredUserStatus;
  }): void {
    _io?.emit('user:riskUpdated', user);
  },

  userRestricted(user: { id: string; name: string; status: MonitoredUserStatus }): void {
    _io?.emit('user:restricted', user);
  },

  userRestored(user: { id: string; name: string; status: MonitoredUserStatus }): void {
    _io?.emit('user:restored', user);
  },

  newAccessEvent(event: AccessEvent): void {
    _io?.emit('event:new', event);
  },

  newAlert(alert: Alert): void {
    _io?.emit('alert:new', alert);
  },

  alertUpdated(alert: { id: string; status: Alert['status'] }): void {
    _io?.emit('alert:updated', alert);
  },

  decoyDeployed(decoy: DecoyAsset): void {
    _io?.emit('decoy:deployed', decoy);
  },

  decoyHit(payload: {
    decoyId: string;
    decoyName: string;
    userId: string;
    userName: string;
    riskDelta: number;
  }): void {
    _io?.emit('decoy:hit', payload);
  },
};

export function getSocketServer(): SocketIOServer | null {
  return _io;
}

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

/** Must match `TOKEN_ACCESS` in `api.ts` (localStorage key). */
const ACCESS_TOKEN_KEY = 'ig_access_token';

const WS_BASE = (import.meta.env.VITE_WS_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')).replace(/\/$/, '');

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/** Create or reuse Socket.io client with JWT from localStorage. */
export function connectSocket(): Socket | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(WS_BASE, {
    withCredentials: true,
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to a server event; reconnect-safe cleanup on unmount.
 * Ensures a connection attempt when the hook mounts (if a token exists).
 */
export function useSocketEvent<T>(event: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    connectSocket();
    const s = getSocket();
    if (!s) return;

    const listener = (data: T) => handlerRef.current(data);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event]);
}

export type { Socket };

"use client";

/**
 * useSocket — Singleton de socket.io-client con autenticación JWT.
 * Un único WebSocket compartido entre todos los componentes.
 * Se inicializa de forma lazy (solo en browser) via dynamic import.
 */

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function useSocket(): Socket | null {
  const [sock, setSock] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;

      if (!_socket || _socket.disconnected) {
        const token = localStorage.getItem('alzak_token') ?? '';
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? `http://${window.location.hostname}:3005`;
        _socket = io(socketUrl, {
          auth:                { token },
          path:                '/socket.io',
          transports:          ['websocket', 'polling'],
          reconnection:        true,
          reconnectionDelay:   1000,
          reconnectionAttempts: 15,
        });
      }

      if (!cancelled) setSock(_socket);
    });

    return () => { cancelled = true; };
  }, []);

  return sock;
}

/** Desconecta el singleton (llamar en logout para limpiar el room privado). */
export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

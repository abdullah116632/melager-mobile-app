import { io, type Socket } from "socket.io-client";

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const configuredSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.replace(/\/+$/, "");

// API URLs normally point at the server origin. Strip an accidental /api
// suffix so Socket.IO always connects to the HTTP server, not the REST prefix.
const socketUrl =
  configuredSocketUrl ??
  apiUrl?.replace(/\/api$/, "") ??
  (domain ? `https://${domain}` : undefined);

let socket: Socket | null = null;

export const connectRealtime = (token: string, messId: number): Socket => {
  if (socket) socket.disconnect();

  socket = io(socketUrl, {
    autoConnect: true,
    auth: { token, messId },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });

  return socket;
};

export const disconnectRealtime = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getRealtimeSocket = (): Socket | null => socket;

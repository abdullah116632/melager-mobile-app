import { io, type Socket } from "socket.io-client";

import type { ApiMessage } from "@/lib/api";

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const configuredSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL?.replace(
  /\/+$/,
  "",
);

// API URLs normally point at the server origin. Strip an accidental /api
// suffix so Socket.IO always connects to the HTTP server, not the REST prefix.
const socketUrl =
  configuredSocketUrl ??
  apiUrl?.replace(/\/api$/, "") ??
  (domain ? `https://${domain}` : undefined);

let socket: Socket | null = null;
let activeConversationMessId: number | null = null;
const messageListeners = new Set<(message: ApiMessage) => void>();

const announceActiveConversation = (targetSocket: Socket): void => {
  if (activeConversationMessId === null) return;
  targetSocket.emit("conversation:enter", {
    messId: activeConversationMessId,
  });
};

export const connectRealtime = (token: string, messId: number): Socket => {
  if (socket) socket.disconnect();

  const nextSocket = io(socketUrl, {
    autoConnect: true,
    auth: { token, messId },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  });

  nextSocket.on("connect", () => announceActiveConversation(nextSocket));
  nextSocket.on("message:created", (message: ApiMessage) => {
    if (!message || typeof message.id !== "number") return;
    messageListeners.forEach((listener) => listener(message));
  });
  socket = nextSocket;

  return nextSocket;
};

export const disconnectRealtime = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getRealtimeSocket = (): Socket | null => socket;

export const enterMessageConversation = (messId: number): void => {
  activeConversationMessId = messId;
  if (socket?.connected) socket.emit("conversation:enter", { messId });
};

export const leaveMessageConversation = (messId: number): void => {
  if (activeConversationMessId !== messId) return;
  if (socket?.connected) socket.emit("conversation:leave", { messId });
  activeConversationMessId = null;
};

export const isMessageConversationActive = (messId: number): boolean =>
  activeConversationMessId === messId;

export const subscribeToRealtimeMessages = (
  listener: (message: ApiMessage) => void,
): (() => void) => {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
};

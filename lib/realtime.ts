import { io, type Socket } from "socket.io-client";

import type { ApiMessage, ApiMessageReactionChange } from "@/lib/api";
import { isChatMediaSupported } from "@/lib/chatMedia/mediaFiles";

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
/** Carries only chat file transfers; see connectRealtime. */
let mediaSocket: Socket | null = null;
let activeConversationMessId: number | null = null;
const messageListeners = new Set<(message: ApiMessage) => void>();
const reactionListeners = new Set<(change: ApiMessageReactionChange) => void>();
const socketListeners = new Set<
  (socket: Socket | null, messId: number | null) => void
>();

const announceActiveConversation = (targetSocket: Socket): void => {
  if (activeConversationMessId === null) return;
  targetSocket.emit("conversation:enter", {
    messId: activeConversationMessId,
  });
};

const connectionOptions = {
  autoConnect: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
};

export const connectRealtime = (token: string, messId: number): Socket => {
  if (socket) socket.disconnect();
  if (mediaSocket) mediaSocket.disconnect();

  const nextSocket = io(socketUrl, {
    ...connectionOptions,
    auth: { token, messId },
    forceNew: true,
  });

  // Files travel on a connection of their own. On the shared one, a new
  // message waited behind every file chunk already queued for the phone, so
  // a text sent after a file only arrived once the file had.
  const nextMediaSocket = isChatMediaSupported
    ? io(socketUrl, {
        ...connectionOptions,
        auth: { token, messId, channel: "media" },
        forceNew: true,
      })
    : null;

  nextSocket.on("connect", () => announceActiveConversation(nextSocket));
  nextSocket.on("message:created", (message: ApiMessage) => {
    if (!message || typeof message.id !== "number") return;
    messageListeners.forEach((listener) => listener(message));
  });
  nextSocket.on("message:reaction", (change: ApiMessageReactionChange) => {
    if (!change || typeof change.messageId !== "number") return;
    reactionListeners.forEach((listener) => listener(change));
  });
  socket = nextSocket;
  mediaSocket = nextMediaSocket;
  socketListeners.forEach((listener) =>
    listener(nextMediaSocket, nextMediaSocket ? messId : null),
  );

  return nextSocket;
};

export const disconnectRealtime = (): void => {
  socket?.disconnect();
  socket = null;
  mediaSocket?.disconnect();
  mediaSocket = null;
  socketListeners.forEach((listener) => listener(null, null));
};

/**
 * Called with every new chat file connection (and null when it closes). The
 * file relay attaches its events to it.
 */
export const subscribeToRealtimeSocket = (
  listener: (socket: Socket | null, messId: number | null) => void,
): (() => void) => {
  socketListeners.add(listener);
  return () => socketListeners.delete(listener);
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

export const subscribeToRealtimeReactions = (
  listener: (change: ApiMessageReactionChange) => void,
): (() => void) => {
  reactionListeners.add(listener);
  return () => reactionListeners.delete(listener);
};

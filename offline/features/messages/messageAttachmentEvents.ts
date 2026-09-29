import type { ApiMessage } from "@/lib/api";

type Listener = (messages: ApiMessage[]) => void;

const listeners = new Set<Listener>();

/**
 * Fired after messages from the server are stored locally. The chat media
 * downloader listens so every path that brings a file message onto this
 * phone (realtime, sync, a page load) also starts fetching its file.
 */
export const emitStoredAttachmentMessages = (messages: ApiMessage[]): void => {
  const withFiles = messages.filter((message) => message.attachment);
  if (withFiles.length === 0) return;
  listeners.forEach((listener) => listener(withFiles));
};

export const subscribeToStoredAttachmentMessages = (
  listener: Listener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

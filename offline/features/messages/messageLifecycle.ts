import type { ApiMessage } from "@/lib/api";

export type MessageDeliveryState = "pending" | "sent" | "failed";

export type MessageLifecycleEvent =
  | { type: "status"; localId: string; status: MessageDeliveryState }
  | { type: "acknowledged"; localId: string; message: ApiMessage }
  // The server has stored a read watermark, so the badge it reports is now
  // the one the app should be showing.
  | { type: "read"; messId: number; unreadCount: number };

const listeners = new Set<(event: MessageLifecycleEvent) => void>();

export const emitMessageLifecycle = (event: MessageLifecycleEvent): void => {
  listeners.forEach((listener) => listener(event));
};

export const subscribeToMessageLifecycle = (
  listener: (event: MessageLifecycleEvent) => void,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

import type { ApiMessage } from "@/lib/api";

export type MessageDeliveryState = "pending" | "sent" | "failed";

export type MessageLifecycleEvent =
  | { type: "status"; localId: string; status: MessageDeliveryState }
  | { type: "acknowledged"; localId: string; message: ApiMessage };

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

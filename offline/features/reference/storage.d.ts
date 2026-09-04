import type {
  ApiConsumer,
  ApiMessWithRole,
  ApiUser,
  MeAuthResponse,
} from "@/lib/api";

import type { LocalAuthSnapshot, LocalConsumerSnapshot } from "./types";

export declare function getLocalAuthSnapshot(): Promise<LocalAuthSnapshot | null>;
export declare function saveLocalAuthSnapshot(
  me: MeAuthResponse,
  activeMessId?: number | null,
): Promise<LocalAuthSnapshot>;
export declare function setLocalActiveMess(
  userId: number,
  messId: number | null,
): Promise<void>;
export declare function getLocalConsumers(
  userId: number,
  messId: number,
): Promise<LocalConsumerSnapshot | null>;
export declare function saveLocalConsumers(
  userId: number,
  messId: number,
  consumers: ApiConsumer[],
): Promise<LocalConsumerSnapshot>;
export declare function patchLocalUser(
  userId: number,
  update: Partial<ApiUser>,
): Promise<void>;
export declare function patchLocalMess(
  messId: number,
  update: Partial<ApiMessWithRole>,
): Promise<void>;
export declare function clearLocalReferenceData(): Promise<void>;

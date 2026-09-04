import type {
  ApiConsumer,
  ApiMessWithRole,
  ApiMyRequest,
  ApiUser,
  MeAuthResponse,
} from "@/lib/api";

export interface LocalAuthSnapshot {
  me: MeAuthResponse;
  activeMess: ApiMessWithRole | null;
  savedAt: number;
}

export interface LocalConsumerSnapshot {
  consumers: ApiConsumer[];
  savedAt: number;
}

export interface ReferenceDataStore {
  getAuthSnapshot(): Promise<LocalAuthSnapshot | null>;
  replaceAuthSnapshot(
    me: MeAuthResponse,
    activeMessId?: number | null,
  ): Promise<LocalAuthSnapshot>;
  setActiveMess(userId: number, messId: number | null): Promise<void>;
  getConsumers(
    userId: number,
    messId: number,
  ): Promise<LocalConsumerSnapshot | null>;
  replaceConsumers(
    userId: number,
    messId: number,
    consumers: ApiConsumer[],
  ): Promise<LocalConsumerSnapshot>;
  patchUser(userId: number, update: Partial<ApiUser>): Promise<void>;
  patchMess(messId: number, update: Partial<ApiMessWithRole>): Promise<void>;
  clear(): Promise<void>;
}

export type { ApiConsumer, ApiMessWithRole, ApiMyRequest, ApiUser };

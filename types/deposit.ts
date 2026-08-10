export type { DepositEntry } from "@/lib/api";

export interface DepositEntryInput {
  messId: number;
  consumerId: number;
  amount: number;
  depositedAt: string;
  note?: string;
}

export interface DepositConsumer {
  id: string;
  name: string;
}

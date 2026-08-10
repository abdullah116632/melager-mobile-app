import { api } from "@/lib/api";
import type { Consumer } from "@/types/consumer";

export const getConsumers = async (
  token: string,
  messId: number,
): Promise<Consumer[]> => {
  const { consumers } = await api.getConsumers(token, messId);
  return consumers;
};

export const deleteConsumer = (
  consumerId: number,
  token: string,
  messId: number,
) => api.deleteConsumer(consumerId, token, messId);

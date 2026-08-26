import { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { AddMealConsumerModal } from "@/components/meals/AddMealConsumerModal";
import { useAuth } from "@/redux/hooks";
import { getConsumers } from "@/services/consumerService";
import type { Consumer } from "@/types/consumer";
import { ConsumersHeader } from "./ConsumersHeader";
import { ConsumersList } from "./ConsumersList";

export const ConsumersContent = () => {
  const { token, activeMess, role } = useAuth();
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const messId = activeMess?.id;

  const fetchConsumers = useCallback(async () => {
    if (!token || !messId) return;

    setLoading(true);
    try {
      setConsumers(await getConsumers(token, messId));
    } catch {
      // Preserve the last successfully loaded list when refreshing fails.
    } finally {
      setLoading(false);
    }
  }, [messId, token]);

  useEffect(() => {
    void fetchConsumers();
  }, [fetchConsumers]);

  return (
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
    >
      <ConsumersHeader
        loading={loading}
        totalConsumers={consumers.length}
        onRefresh={() => void fetchConsumers()}
        onAddMember={
          role === "admin" ? () => setShowAddMember(true) : undefined
        }
      />
      <ConsumersList
        consumers={consumers}
        loading={loading}
        onDeleted={(consumerId) =>
          setConsumers((currentConsumers) =>
            currentConsumers.filter((consumer) => consumer.id !== consumerId),
          )
        }
      />
      <AddMealConsumerModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdded={fetchConsumers}
      />
    </View>
  );
};

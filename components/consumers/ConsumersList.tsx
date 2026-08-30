import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  ToastAndroid,
  View,
} from "react-native";
import { useAuth } from "@/redux/hooks";
import { deleteConsumer } from "@/services/consumerService";
import type { Consumer } from "@/types/consumer";
import { ConsumerSearchBar } from "./ConsumerSearchBar";
import { ConsumerDetailModal } from "./ConsumerDetailModal";
import { ConsumerTableSection } from "./ConsumerTableSection";
import { ConsumersEmptyState } from "./ConsumersEmptyState";
import { DeleteConsumerModal } from "./DeleteConsumerModal";

interface ConsumersListProps {
  consumers: Consumer[];
  loading: boolean;
  onDeleted: (consumerId: number) => void;
}

const showCopiedMessage = (label: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(`${label} copied`, ToastAndroid.SHORT);
  } else if (Platform.OS === "ios") {
    Alert.alert("Copied", `${label} copied to clipboard`);
  }
};

export const ConsumersList = ({
  consumers,
  loading,
  onDeleted,
}: ConsumersListProps) => {
  const { token, activeMess } = useAuth();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Consumer | null>(null);
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(
    null,
  );
  const messId = activeMess?.id;

  const copy = async (value: string, key: string, label: string) => {
    await Clipboard.setStringAsync(value);
    showCopiedMessage(label);
    setCopiedId(key);
    setTimeout(() => {
      setCopiedId((previousId) => (previousId === key ? null : previousId));
    }, 1500);
  };

  const remove = async (consumerId: number) => {
    if (!token || !messId) return;

    setDeletingId(consumerId);
    try {
      await deleteConsumer(consumerId, token, messId);
      onDeleted(consumerId);
    } catch (caughtError: unknown) {
      Alert.alert(
        "Error",
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete consumer.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (consumer: Consumer) => {
    if (Platform.OS === "web") {
      setPendingDelete(consumer);
      return;
    }

    Alert.alert(
      "Delete Consumer",
      `All meals, expenses, and deposits for "${consumer.name}" will be permanently deleted.\n\nAre you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void remove(consumer.id);
          },
        },
      ],
    );
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredConsumers = consumers.filter((consumer) => {
    if (!normalizedSearch) return true;
    return (
      (consumer.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
      (consumer.mobileNumber?.toLowerCase().includes(normalizedSearch) ??
        false) ||
      consumer.name.toLowerCase().includes(normalizedSearch)
    );
  });
  const registeredConsumers = filteredConsumers.filter(
    (consumer) => consumer.userId != null && !consumer.accountDeletedAt,
  );
  const manuallyAddedConsumers = filteredConsumers.filter(
    (consumer) => consumer.userId == null && !consumer.accountDeletedAt,
  );
  const deletedAccountConsumers = filteredConsumers.filter((consumer) =>
    Boolean(consumer.accountDeletedAt),
  );

  return (
    <>
      <ConsumerSearchBar
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : consumers.length === 0 ? (
        <ConsumersEmptyState
          icon="users"
          iconSize={52}
          title="No consumers yet"
          description="Add consumers from the Meals tab."
        />
      ) : filteredConsumers.length === 0 ? (
        <ConsumersEmptyState
          icon="search"
          iconSize={40}
          title="No results"
          description="Try a different name, email or phone."
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-safe-offset-6"
          showsVerticalScrollIndicator={false}
        >
          {registeredConsumers.length > 0 && (
            <ConsumerTableSection
              label="REGISTERED MEMBERS"
              consumers={registeredConsumers}
              copiedId={copiedId}
              onCopy={copy}
              onDelete={confirmDelete}
              onSelect={setSelectedConsumer}
              deletingId={deletingId}
            />
          )}
          {manuallyAddedConsumers.length > 0 && (
            <ConsumerTableSection
              label="MANUALLY ADDED"
              consumers={manuallyAddedConsumers}
              copiedId={copiedId}
              onCopy={copy}
              topMargin={registeredConsumers.length > 0}
              onDelete={confirmDelete}
              onSelect={setSelectedConsumer}
              deletingId={deletingId}
            />
          )}
          {deletedAccountConsumers.length > 0 && (
            <ConsumerTableSection
              label="DELETED ACCOUNTS"
              consumers={deletedAccountConsumers}
              copiedId={copiedId}
              onCopy={copy}
              topMargin={
                registeredConsumers.length > 0 ||
                manuallyAddedConsumers.length > 0
              }
              onDelete={confirmDelete}
              onSelect={setSelectedConsumer}
              deletingId={deletingId}
            />
          )}
        </ScrollView>
      )}

      <DeleteConsumerModal
        consumer={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(consumerId) => {
          void remove(consumerId);
          setPendingDelete(null);
        }}
      />
      <ConsumerDetailModal
        consumer={selectedConsumer}
        onClose={() => setSelectedConsumer(null)}
      />
    </>
  );
};

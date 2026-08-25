import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  ToastAndroid,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { ConsumerSearchBar } from "@/components/consumers/ConsumerSearchBar";
import { ConsumerTableSection } from "@/components/consumers/ConsumerTableSection";
import { ConsumersEmptyState } from "@/components/consumers/ConsumersEmptyState";
import { ConsumersHeader } from "@/components/consumers/ConsumersHeader";
import { DeleteConsumerModal } from "@/components/consumers/DeleteConsumerModal";
import { useAuth } from "@/redux/hooks";
import { deleteConsumer, getConsumers } from "@/services/consumerService";
import type { Consumer } from "@/types/consumer";

const showCopiedMessage = (label: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(`${label} copied`, ToastAndroid.SHORT);
  } else if (Platform.OS === "ios") {
    Alert.alert("Copied", `${label} copied to clipboard`);
  }
};

const copyToClipboard = async (value: string, label: string) => {
  await Clipboard.setStringAsync(value);
  showCopiedMessage(label);
};

const ConsumersScreen = () => {
  const router = useRouter();
  const { token, activeMess, role } = useAuth();

  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Consumer | null>(null);

  const messId = activeMess?.id;
  const isAdmin = role === "admin";

  const fetchConsumers = useCallback(async () => {
    if (!token || !messId) return;

    setLoading(true);
    try {
      const consumerList = await getConsumers(token, messId);
      setConsumers(consumerList);
    } catch {
      // Preserve the existing screen behavior when refreshing fails.
    } finally {
      setLoading(false);
    }
  }, [token, messId]);

  useEffect(() => {
    void fetchConsumers();
  }, [fetchConsumers]);

  const handleCopy = async (value: string, key: string, label: string) => {
    await copyToClipboard(value, label);
    setCopiedId(key);
    setTimeout(() => {
      setCopiedId((previousId) => (previousId === key ? null : previousId));
    }, 1500);
  };

  const handleDelete = async (consumerId: number) => {
    if (!token || !messId) return;

    setDeletingId(consumerId);
    try {
      await deleteConsumer(consumerId, token, messId);
      setConsumers((currentConsumers) =>
        currentConsumers.filter((consumer) => consumer.id !== consumerId),
      );
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
            void handleDelete(consumer.id);
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
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
    >
      <ConsumersHeader
        loading={loading}
        totalConsumers={consumers.length}
        onBack={() => router.back()}
        onRefresh={() => {
          void fetchConsumers();
        }}
      />

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
              onCopy={handleCopy}
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
          {manuallyAddedConsumers.length > 0 && (
            <ConsumerTableSection
              label="MANUALLY ADDED"
              consumers={manuallyAddedConsumers}
              copiedId={copiedId}
              onCopy={handleCopy}
              topMargin={registeredConsumers.length > 0}
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
          {deletedAccountConsumers.length > 0 && (
            <ConsumerTableSection
              label="DELETED ACCOUNTS"
              consumers={deletedAccountConsumers}
              copiedId={copiedId}
              onCopy={handleCopy}
              topMargin={
                registeredConsumers.length > 0 ||
                manuallyAddedConsumers.length > 0
              }
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
        </ScrollView>
      )}

      <DeleteConsumerModal
        consumer={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(consumerId) => {
          void handleDelete(consumerId);
          setPendingDelete(null);
        }}
      />
    </View>
  );
};

export default ConsumersScreen;

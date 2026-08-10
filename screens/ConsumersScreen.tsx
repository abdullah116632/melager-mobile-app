import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  ToastAndroid,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { ConsumerSearchBar } from "@/components/consumers/ConsumerSearchBar";
import { ConsumerTableSection } from "@/components/consumers/ConsumerTableSection";
import { ConsumersEmptyState } from "@/components/consumers/ConsumersEmptyState";
import { ConsumersHeader } from "@/components/consumers/ConsumersHeader";
import { consumerStyles as styles } from "@/components/consumers/consumerStyles";
import { DeleteConsumerModal } from "@/components/consumers/DeleteConsumerModal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
  const topPadding = Platform.OS === "web" ? 0 : insets.top;

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
    (consumer) => consumer.userId != null,
  );
  const manuallyAddedConsumers = filteredConsumers.filter(
    (consumer) => consumer.userId == null,
  );

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: topPadding },
      ]}
    >
      <ConsumersHeader
        colors={colors}
        loading={loading}
        totalConsumers={consumers.length}
        onBack={() => router.back()}
        onRefresh={() => {
          void fetchConsumers();
        }}
      />

      <ConsumerSearchBar
        colors={colors}
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : consumers.length === 0 ? (
        <ConsumersEmptyState
          colors={colors}
          icon="users"
          iconSize={52}
          title="No consumers yet"
          description="Add consumers from the Meals tab."
        />
      ) : filteredConsumers.length === 0 ? (
        <ConsumersEmptyState
          colors={colors}
          icon="search"
          iconSize={40}
          title="No results"
          description="Try a different name, email or phone."
        />
      ) : (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {registeredConsumers.length > 0 && (
            <ConsumerTableSection
              label="REGISTERED MEMBERS"
              consumers={registeredConsumers}
              colors={colors}
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
              colors={colors}
              copiedId={copiedId}
              onCopy={handleCopy}
              topMargin={registeredConsumers.length > 0}
              isAdmin={isAdmin}
              onDelete={confirmDelete}
              deletingId={deletingId}
            />
          )}
        </ScrollView>
      )}

      <DeleteConsumerModal
        consumer={pendingDelete}
        colors={colors}
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

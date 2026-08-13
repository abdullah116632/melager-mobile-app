import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { JoinRequestCard } from "@/components/mess-hub/JoinRequestCard";
import { MessCard } from "@/components/mess-hub/MessCard";
import { MessHubActions } from "@/components/mess-hub/MessHubActions";
import { MessHubEmptyState } from "@/components/mess-hub/MessHubEmptyState";
import { MessHubErrorBanner } from "@/components/mess-hub/MessHubErrorBanner";
import { MessHubHeader } from "@/components/mess-hub/MessHubHeader";
import { useAuth } from "@/context/AuthContext";
import type { MessHubJoinRequest, MessHubMess } from "@/types/messHub";

interface MessHubScreenProps {
  onCreateMess: () => void;
  onJoinMess: () => void;
}

export const MessHubScreen = ({
  onCreateMess,
  onJoinMess,
}: MessHubScreenProps) => {
  const { user, messes, requests, selectMess, retryJoin, refreshMe, logout } =
    useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryError, setRetryError] = useState("");

  useEffect(() => {
    void refreshMe().finally(() => setInitialLoading(false));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMe();
    setRefreshing(false);
  }, [refreshMe]);

  const handleRetry = async (request: MessHubJoinRequest) => {
    setRetryingId(request.id);
    setRetryError("");
    try {
      await retryJoin(request.id);
    } catch (error) {
      setRetryError(
        error instanceof Error ? error.message : "Failed to send request again",
      );
    } finally {
      setRetryingId(null);
    }
  };

  const hasNoActivity = messes.length === 0 && requests.length === 0;
  const hasScrollableMessList = messes.length > 4;
  const firstName = user?.name?.split(" ")[0];

  const activityContent = (
    <>
      {retryError ? <MessHubErrorBanner message={retryError} /> : null}

      {messes.length > 0 && (
        <View className="mb-2 gap-2.5">
          <Text className="mb-1 px-0.5 font-inter-semibold text-[11px] tracking-[0.8px] text-gray-500">
            MY MESSES
          </Text>
          {messes.map((mess) => (
            <MessCard
              key={mess.id}
              mess={mess}
              onEnter={(selectedMess: MessHubMess) => selectMess(selectedMess)}
            />
          ))}
        </View>
      )}

      {requests.length > 0 && (
        <View className="mb-2 gap-2.5">
          <Text className="mb-1 px-0.5 font-inter-semibold text-[11px] tracking-[0.8px] text-gray-500">
            JOIN REQUESTS
          </Text>
          {requests.map((request) => (
            <JoinRequestCard
              key={request.id}
              request={request}
              retrying={retryingId === request.id}
              onRetry={(selectedRequest) => void handleRetry(selectedRequest)}
            />
          ))}
        </View>
      )}

      {hasNoActivity && <MessHubEmptyState />}
    </>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void handleRefresh()}
      tintColor="#0F766E"
    />
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" backgroundColor="#0F766E" />
      <MessHubHeader
        firstName={firstName}
        email={user?.email}
        loading={initialLoading}
        messCount={messes.length}
        requestCount={requests.length}
        onLogout={() => void logout()}
      />

      {hasScrollableMessList ? (
        <View className="pb-safe-offset-4 flex-1 px-4 pt-4">
          <MessHubActions onCreate={onCreateMess} onJoin={onJoinMess} />
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-2 pb-3 pt-4"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            refreshControl={refreshControl}
          >
            {activityContent}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2 px-4 pb-safe-offset-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <MessHubActions onCreate={onCreateMess} onJoin={onJoinMess} />
          {activityContent}
        </ScrollView>
      )}
    </View>
  );
};

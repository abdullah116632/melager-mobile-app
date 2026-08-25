import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useAuth } from "@/redux/hooks";
import { MessHubActions } from "./MessHubActions";
import { MessHubActivity } from "./MessHubActivity";
import { MessHubHeader } from "./MessHubHeader";

export const MessHubContent = () => {
  const { messes, refreshMe } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const hasScrollableMessList = messes.length > 4;

  useEffect(() => {
    void refreshMe().finally(() => setInitialLoading(false));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMe();
    setRefreshing(false);
  }, [refreshMe]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void handleRefresh()}
      tintColor="#0F766E"
    />
  );

  return (
    <>
      <MessHubHeader loading={initialLoading} />

      {hasScrollableMessList ? (
        <View className="pb-safe-offset-4 flex-1 px-4 pt-4">
          <MessHubActions />
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-2 pb-3 pt-4"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            refreshControl={refreshControl}
          >
            <MessHubActivity />
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2 px-4 pb-safe-offset-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <MessHubActions />
          <MessHubActivity />
        </ScrollView>
      )}
    </>
  );
};

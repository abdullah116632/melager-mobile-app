import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { useAppDispatch, useAuth, useNetwork } from "@/redux/hooks";
import { apiActionFailed } from "@/redux/slice/networkSlice";
import { MessHubActions } from "./MessHubActions";
import { MessHubActivity } from "./MessHubActivity";
import { MessHubHeader } from "./MessHubHeader";

export const MessHubContent = () => {
  const { messes, refreshMe } = useAuth();
  const { isOnline } = useNetwork();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    void refreshMe()
      .catch(() => undefined)
      .finally(() => setInitialLoading(false));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMe();
    } catch (error) {
      dispatch(
        apiActionFailed(
          isOnline
            ? error instanceof Error
              ? error.message
              : "Refresh failed. Please try again."
            : "Refresh failed because you are offline",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isOnline, refreshMe]);

  return (
    <>
      <MessHubHeader loading={initialLoading && messes.length === 0} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-2 px-4 pb-safe-offset-10 pt-4"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#0F766E"
          />
        }
      >
        <MessHubActions />
        <MessHubActivity />
      </ScrollView>
    </>
  );
};

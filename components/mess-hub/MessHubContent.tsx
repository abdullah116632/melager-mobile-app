import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { useAppDispatch, useAuth, useNetwork } from "@/redux/hooks";
import { apiActionFailed } from "@/redux/slice/networkSlice";
import { MessHubActions } from "./MessHubActions";
import { MessHubActivity } from "./MessHubActivity";
import { MessHubHeader } from "./MessHubHeader";
import {
  RoleChangedNoticeModal,
  type RoleChangeNotice,
} from "./RoleChangedNoticeModal";

const firstParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined;

export const MessHubContent = () => {
  const { messes, refreshMe } = useAuth();
  const { isOnline } = useNetwork();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{
    roleNotice?: string | string[];
    messName?: string | string[];
    managerName?: string | string[];
  }>();
  const [roleNotice, setRoleNotice] = useState<RoleChangeNotice | null>(null);

  // Set by the manager-role transfer/removal forms on their way here. Read
  // once, then dropped from the URL so a later visit does not show it again.
  const noticeKind = firstParam(params.roleNotice);
  useEffect(() => {
    if (noticeKind !== "transferred" && noticeKind !== "removed") return;
    setRoleNotice({
      kind: noticeKind,
      messName: firstParam(params.messName),
      managerName: firstParam(params.managerName),
    });
    router.setParams({
      roleNotice: undefined,
      messName: undefined,
      managerName: undefined,
    });
  }, [noticeKind, params.messName, params.managerName, router]);
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
      <RoleChangedNoticeModal
        notice={roleNotice}
        onClose={() => setRoleNotice(null)}
      />
    </>
  );
};

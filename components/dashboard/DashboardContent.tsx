import { useCallback, useRef, useState } from "react";
import { Platform, RefreshControl, ScrollView } from "react-native";
import { useAppDispatch, useAuth, useNetwork } from "@/redux/hooks";
import { loadBazar } from "@/redux/slice/bazarSlice";
import { offlineActionFailed } from "@/redux/slice/networkSlice";
import { loadNotices } from "@/redux/slice/noticesSlice";
import {
  DashboardAccountingSection,
  type DashboardAccountingSectionHandle,
} from "./DashboardAccountingSection";
import {
  DashboardMealSection,
  type DashboardMealSectionHandle,
} from "./DashboardMealSection";
import { DashboardUpdatesCard } from "./DashboardUpdatesCard";

export const DashboardContent = () => {
  const dispatch = useAppDispatch();
  const { isOnline } = useNetwork();
  const { role } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const accountingRef = useRef<DashboardAccountingSectionHandle | null>(null);
  const mealSectionRef = useRef<DashboardMealSectionHandle | null>(null);

  const refreshDashboard = useCallback(async () => {
    // Saved data stays on screen; a refresh cannot reach the server offline.
    if (!isOnline) {
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    setRefreshing(true);
    try {
      await Promise.allSettled([
        accountingRef.current?.refresh() ?? Promise.resolve(),
        mealSectionRef.current?.refresh() ?? Promise.resolve(),
        dispatch(loadBazar({ includeConsumers: role === "admin" })).unwrap(),
        dispatch(loadNotices({ force: true })).unwrap(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isOnline, role]);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      // Dashboard has several fairly dense cards. On Android, keeping views
      // outside the viewport detached reduces layout work during tab switches.
      removeClippedSubviews={Platform.OS === "android"}
      contentContainerClassName={`pt-2 ${Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"}`}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshDashboard()}
          tintColor="#0e7871"
          colors={["#0e7871"]}
        />
      }
    >
      <DashboardMealSection ref={mealSectionRef} />
      <DashboardAccountingSection ref={accountingRef} />
      <DashboardUpdatesCard />
    </ScrollView>
  );
};

import { useCallback, useRef, useState } from "react";
import { Platform, RefreshControl, ScrollView } from "react-native";
import {
  DashboardAccountingSection,
  type DashboardAccountingSectionHandle,
} from "./DashboardAccountingSection";
import {
  DashboardMealSection,
  type DashboardMealSectionHandle,
} from "./DashboardMealSection";

export const DashboardContent = () => {
  const [refreshing, setRefreshing] = useState(false);
  const accountingRef = useRef<DashboardAccountingSectionHandle | null>(null);
  const mealSectionRef = useRef<DashboardMealSectionHandle | null>(null);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await accountingRef.current?.refresh();
      await mealSectionRef.current?.refresh();
    } catch {
      // Keep the last successfully loaded figures visible.
    } finally {
      setRefreshing(false);
    }
  }, []);

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
    </ScrollView>
  );
};

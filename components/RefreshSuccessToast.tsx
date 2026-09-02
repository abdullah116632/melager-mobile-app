import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useAppSelector } from "@/redux/hooks";
import { selectMessState } from "@/redux/slice/messSlice";

const TOAST_DURATION_MS = 2200;

export const RefreshSuccessToast = () => {
  const { lastManualRefreshAt } = useAppSelector(selectMessState);
  const previousRefreshRef = useRef<number | null>(lastManualRefreshAt);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      !lastManualRefreshAt ||
      previousRefreshRef.current === lastManualRefreshAt
    ) {
      return;
    }
    previousRefreshRef.current = lastManualRefreshAt;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [lastManualRefreshAt]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-24 left-0 right-0 z-50 items-center"
    >
      <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 shadow-md shadow-emerald-900/15">
        <Feather name="check-circle" size={15} color="#059669" />
        <Text className="font-inter-semibold text-xs text-emerald-700">
          Refreshed successfully
        </Text>
      </View>
    </View>
  );
};

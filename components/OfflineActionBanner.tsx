import Feather from "@expo/vector-icons/Feather";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppDispatch, useNetwork } from "@/redux/hooks";
import { clearOfflineActionError } from "@/redux/slice/networkSlice";

/** A short, non-blocking error shown only after an offline user action fails. */
export const OfflineActionBanner = () => {
  const dispatch = useAppDispatch();
  const { offlineActionError } = useNetwork();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!offlineActionError) return;
    const timeout = setTimeout(
      () => dispatch(clearOfflineActionError()),
      3_200,
    );
    return () => clearTimeout(timeout);
  }, [dispatch, offlineActionError]);

  if (!offlineActionError) return null;

  return (
    <View
      className="absolute inset-x-3 z-[9998] flex-row items-center rounded-b-lg bg-red-600 px-3 py-1.5"
      style={{ top: insets.top + 57 }}
    >
      <Feather name="alert-circle" size={13} color="#fff" />
      <Text className="ml-1.5 flex-1 font-inter-semibold text-[11px] text-white">
        {offlineActionError}
      </Text>
    </View>
  );
};

import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DepositsContent } from "@/components/deposits/DepositsContent";

export const DepositsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      )}
      <DepositsContent />
    </View>
  );
};

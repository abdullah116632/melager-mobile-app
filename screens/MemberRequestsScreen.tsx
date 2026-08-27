import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberRequestsContent } from "@/components/member-requests/MemberRequestsContent";

interface MemberRequestsScreenProps {
  onBack: () => void;
}

export const MemberRequestsScreen = ({ onBack }: MemberRequestsScreenProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#0F766E" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-teal-700"
          style={{ height: insets.top }}
        />
      )}
      <MemberRequestsContent onBack={onBack} />
    </View>
  );
};

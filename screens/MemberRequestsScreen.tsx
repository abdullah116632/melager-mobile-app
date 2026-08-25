import { Platform, View } from "react-native";
import { MemberRequestsContent } from "@/components/member-requests/MemberRequestsContent";

interface MemberRequestsScreenProps {
  onBack: () => void;
}

export const MemberRequestsScreen = ({ onBack }: MemberRequestsScreenProps) => (
  <View
    className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
  >
    <MemberRequestsContent onBack={onBack} />
  </View>
);

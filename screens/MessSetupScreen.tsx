import { KeyboardAvoidingView, Platform, View } from "react-native";
import { MessSetupContent } from "@/components/mess-setup/MessSetupContent";

export const MessSetupScreen = () => (
  <KeyboardAvoidingView
    className="flex-1 bg-[#0B5E57]"
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View
      pointerEvents="none"
      className="absolute right-[-70px] top-[-80px] h-[300px] w-[300px] rounded-full bg-white/[0.07]"
    />
    <View
      pointerEvents="none"
      className="absolute bottom-[60px] left-[-40px] h-40 w-40 rounded-full bg-white/[0.05]"
    />
    <MessSetupContent />
  </KeyboardAvoidingView>
);

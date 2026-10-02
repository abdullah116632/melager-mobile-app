import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export type RoleChangeNotice = {
  kind: "transferred" | "removed";
  messName?: string;
  managerName?: string;
};

interface RoleChangedNoticeModalProps {
  notice: RoleChangeNotice | null;
  onClose: () => void;
}

export const RoleChangedNoticeModal = ({
  notice,
  onClose,
}: RoleChangedNoticeModalProps) => {
  const transferred = notice?.kind === "transferred";
  const messName = notice?.messName || "this mess";

  return (
    <Modal
      visible={notice !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-[360px] overflow-hidden rounded-[24px] bg-white shadow-2xl shadow-black/25">
          <LinearGradient
            colors={["#064E3B", "#0F766E", "#0F4C5C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="items-center overflow-hidden px-6 pb-6 pt-7"
          >
            <View
              pointerEvents="none"
              className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/[0.08]"
            />
            <View
              pointerEvents="none"
              className="absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-emerald-200/[0.1]"
            />
            <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/15">
              <Feather
                name={transferred ? "repeat" : "user-check"}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text className="mt-3.5 text-center font-inter-bold text-[19px] text-white">
              {transferred
                ? "Manager Role Transferred"
                : "Manager Role Removed"}
            </Text>
            <View className="mt-2 flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Feather name="home" size={11} color="#D1FAE5" />
              <Text
                className="max-w-[240px] font-inter-semibold text-[12px] text-emerald-50"
                numberOfLines={1}
              >
                {messName}
              </Text>
            </View>
          </LinearGradient>

          <View className="px-6 pb-6 pt-5">
            {transferred ? (
              <Text className="text-center font-inter text-[14px] leading-[21px] text-slate-600">
                <Text className="font-inter-semibold text-slate-900">
                  {notice?.managerName || "The selected member"}
                </Text>{" "}
                is now the primary manager. You are now a{" "}
                <Text className="font-inter-semibold text-teal-700">
                  regular member
                </Text>
                .
              </Text>
            ) : (
              <Text className="text-center font-inter text-[14px] leading-[21px] text-slate-600">
                You are now a{" "}
                <Text className="font-inter-semibold text-teal-700">
                  regular member
                </Text>{" "}
                of this mess.
              </Text>
            )}

            <View className="mt-4 flex-row gap-2.5 rounded-2xl border border-teal-100 bg-teal-50 p-3">
              <Feather
                name="info"
                size={15}
                color="#0F766E"
                style={{ marginTop: 1 }}
              />
              <Text className="flex-1 font-inter text-[12px] leading-[18px] text-teal-900">
                Open the mess again from the list to continue as a member.
                Manager tools are no longer available to you.
              </Text>
            </View>

            <TouchableOpacity
              className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-teal-700"
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Feather name="check" size={17} color="#FFFFFF" />
              <Text className="font-inter-semibold text-[15px] text-white">
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

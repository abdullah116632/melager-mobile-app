import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export const JoinRequestSuccess = () => {
  const router = useRouter();

  return (
    <View className="items-center rounded-3xl bg-white p-6 shadow-xl shadow-black/15">
      <View className="mb-4 h-[72px] w-[72px] items-center justify-center self-center rounded-full border-2 border-emerald-200 bg-emerald-50">
        <Feather name="check-circle" size={32} color="#059669" />
      </View>
      <Text className="mb-1.5 text-center font-inter-bold text-[21px] text-gray-900">
        Request Sent!
      </Text>
      <Text className="mb-[22px] text-center font-inter text-[13px] leading-5 text-gray-500">
        Your request has been sent to the admin for approval.{"\n"}
        You can check the status in the Hub.
      </Text>
      <TouchableOpacity
        className="mt-2 h-[54px] w-full flex-row items-center justify-center gap-2 rounded-[14px] bg-teal-700 shadow-lg shadow-teal-700/35"
        onPress={() => router.replace("/")}
      >
        <Feather name="home" size={18} color="#fff" />
        <Text className="font-inter-bold text-base text-white">
          Back to Hub
        </Text>
      </TouchableOpacity>
    </View>
  );
};

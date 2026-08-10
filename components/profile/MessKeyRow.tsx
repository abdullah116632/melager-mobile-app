import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MessKeyRowProps {
  messKey: string;
  copied: boolean;
  onCopy: () => void;
}

export const MessKeyRow = ({ messKey, copied, onCopy }: MessKeyRowProps) => (
  <View className="flex-row items-center gap-3 border-b-[0.5px] border-slate-200 px-3.5 py-[13px]">
    <View className="h-[34px] w-[34px] items-center justify-center rounded-lg bg-slate-100">
      <Feather name="key" size={16} color="#0F766E" />
    </View>
    <View className="flex-1">
      <Text className="font-inter-medium text-[11px] text-slate-500">
        Mess Key
      </Text>
      <Text className="mt-px font-inter-medium text-sm tracking-[2px] text-slate-900">
        {messKey}
      </Text>
    </View>
    <TouchableOpacity
      className={`flex-row items-center gap-[5px] rounded-lg px-2.5 py-[7px] ${copied ? "bg-emerald-600" : "bg-slate-100"}`}
      onPress={onCopy}
      activeOpacity={0.7}
    >
      <Feather
        name={copied ? "check" : "copy"}
        size={15}
        color={copied ? "#fff" : "#0F766E"}
      />
      <Text
        className={`font-inter-semibold text-xs ${copied ? "text-white" : "text-teal-700"}`}
      >
        {copied ? "Copied!" : "Copy"}
      </Text>
    </TouchableOpacity>
  </View>
);

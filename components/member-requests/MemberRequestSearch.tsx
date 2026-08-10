import Feather from "@expo/vector-icons/Feather";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";

interface MemberRequestSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const MemberRequestSearch = ({
  value,
  onChange,
}: MemberRequestSearchProps) => (
  <View className="flex-row items-center gap-2.5 border-b-[0.5px] border-slate-200 bg-white px-3.5 py-2.5">
    <Feather name="search" size={16} color="#64748B" />
    <TextInput
      className="flex-1 py-0 font-inter text-sm text-slate-900"
      placeholder="Search by name or email…"
      placeholderTextColor="#64748B"
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      clearButtonMode="while-editing"
    />
    {value.length > 0 && Platform.OS !== "ios" && (
      <TouchableOpacity
        onPress={() => onChange("")}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={15} color="#64748B" />
      </TouchableOpacity>
    )}
  </View>
);

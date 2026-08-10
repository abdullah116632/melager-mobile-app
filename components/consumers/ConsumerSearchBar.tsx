import Feather from "@expo/vector-icons/Feather";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";

type ConsumerSearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
};

export const ConsumerSearchBar = ({
  search,
  onSearchChange,
  onClear,
}: ConsumerSearchBarProps) => (
  <View className="flex-row items-center gap-2.5 border-b-[0.5px] border-slate-200 bg-white px-3.5 py-2.5">
    <Feather name="search" size={16} color="#64748B" />
    <TextInput
      className="flex-1 py-0 font-inter text-sm text-slate-900"
      placeholder="Search by name, email or phone…"
      placeholderTextColor="#64748B"
      value={search}
      onChangeText={onSearchChange}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      clearButtonMode="while-editing"
    />
    {search.length > 0 && Platform.OS !== "ios" && (
      <TouchableOpacity
        onPress={onClear}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={15} color="#64748B" />
      </TouchableOpacity>
    )}
  </View>
);

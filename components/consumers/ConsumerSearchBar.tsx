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
  <View className="bg-teal-700 px-4 pb-4">
    <View className="h-12 flex-row items-center gap-2.5 rounded-2xl bg-white px-3.5 shadow-sm shadow-teal-950/20">
      <Feather name="search" size={17} color="#64748B" />
      <TextInput
        className="flex-1 py-0 font-inter text-sm text-slate-900"
        placeholder="Search by name, email or phone…"
        placeholderTextColor="#94A3B8"
        value={search}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {search.length > 0 && Platform.OS !== "ios" && (
        <TouchableOpacity
          className="h-7 w-7 items-center justify-center rounded-full bg-slate-100"
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={14} color="#64748B" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

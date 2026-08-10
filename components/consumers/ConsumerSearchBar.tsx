import Feather from "@expo/vector-icons/Feather";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";

import type { AppColors } from "@/types/theme";
import { consumerStyles as styles } from "./consumerStyles";

type ConsumerSearchBarProps = {
  colors: AppColors;
  search: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
};

export const ConsumerSearchBar = ({
  colors,
  search,
  onSearchChange,
  onClear,
}: ConsumerSearchBarProps) => (
  <View
    style={[
      styles.searchWrap,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Feather name="search" size={16} color={colors.mutedForeground} />
    <TextInput
      style={[styles.searchInput, { color: colors.foreground }]}
      placeholder="Search by name, email or phone…"
      placeholderTextColor={colors.mutedForeground}
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
        <Feather name="x" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
    )}
  </View>
);

import Feather from "@expo/vector-icons/Feather";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { memberRequestStyles as styles } from "./memberRequestStyles";

interface MemberRequestSearchProps {
  colors: AppColors;
  value: string;
  onChange: (value: string) => void;
}

export const MemberRequestSearch = ({
  colors,
  value,
  onChange,
}: MemberRequestSearchProps) => (
  <View
    style={[
      styles.searchWrapper,
      { backgroundColor: colors.card, borderBottomColor: colors.border },
    ]}
  >
    <Feather name="search" size={16} color={colors.mutedForeground} />
    <TextInput
      style={[styles.searchInput, { color: colors.foreground }]}
      placeholder="Search by name or email…"
      placeholderTextColor={colors.mutedForeground}
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
        <Feather name="x" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
    )}
  </View>
);
